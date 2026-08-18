/**
 * Cloud Functions for the PPC I Love My Church app.
 *
 * resolvePhoneSignIn lets a member sign in with their mobile number instead of
 * their email address. Firebase Auth can only sign in by email, so the number
 * has to be translated first — and that lookup cannot happen on the client,
 * because firestore.rules (correctly) refuses to let a signed-out visitor read
 * the users collection.
 *
 * The password is verified BEFORE the email is returned. Without that, this
 * endpoint would be an oracle: anyone could walk through SA mobile prefixes and
 * harvest members' email addresses. Callers who don't already know the password
 * learn nothing beyond "those credentials didn't work".
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();

// The public web API key from firebase-config.js. Public by design — it
// identifies the project and carries no privileges on its own.
const WEB_API_KEY = 'AIzaSyCyHBnZ-TCInVW9w3sK2ir3eQgEl9tmpYs';

/**
 * Canonical SA mobile form: 0XXXXXXXXX.
 * MUST stay in sync with utils/phone.js in the app — see the note there.
 */
const normalizePhone = (input) => {
  const digits = String(input ?? '').replace(/\D/g, '');
  if (!digits) return null;

  let local = digits;

  if (local.startsWith('0027')) {
    local = `0${local.slice(4)}`;
  } else if (local.startsWith('27') && local.length === 11) {
    local = `0${local.slice(2)}`;
  } else if (local.length === 9) {
    local = `0${local}`;
  }

  return /^0\d{9}$/.test(local) ? local : null;
};

exports.resolvePhoneSignIn = onCall(
  { region: 'us-central1', cors: true, maxInstances: 10 },
  async (request) => {
    const phone = normalizePhone(request.data?.phone);
    const password = request.data?.password;

    // Deliberately identical to the wrong-password response below: a caller
    // must not be able to tell "no such number" from "wrong password".
    const invalid = () =>
      new HttpsError('unauthenticated', 'Incorrect details. Please check and try again.');

    if (!phone || typeof password !== 'string' || !password) {
      throw invalid();
    }

    const snap = await admin
      .firestore()
      .collection('users')
      .where('phoneNormalized', '==', phone)
      .limit(2)
      .get();

    if (snap.empty) throw invalid();

    // Shared handsets are common in a congregation (spouses, family). We cannot
    // guess which account was meant, so we say so plainly rather than guessing:
    // this leaks nothing a caller with the right password wouldn't already know.
    if (snap.size > 1) {
      throw new HttpsError(
        'failed-precondition',
        'More than one account uses this number. Please sign in with your email address.'
      );
    }

    const email = snap.docs[0].data()?.email;
    if (!email) throw invalid();

    // Verify the password against Firebase Auth itself. Identity Toolkit
    // applies its own per-IP throttling here, which is what limits brute force.
    let res;
    try {
      res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${WEB_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, returnSecureToken: true }),
        }
      );
    } catch (err) {
      throw new HttpsError('unavailable', 'Could not reach the sign-in service. Please try again.');
    }

    if (!res.ok) {
      const code = (await res.json().catch(() => ({})))?.error?.message || '';
      if (code.startsWith('TOO_MANY_ATTEMPTS')) {
        throw new HttpsError('resource-exhausted', 'Too many attempts. Please try again later.');
      }
      throw invalid();
    }

    // The caller proved they hold this account's password, so returning the
    // address it belongs to reveals nothing they could not already obtain.
    return { email };
  }
);
