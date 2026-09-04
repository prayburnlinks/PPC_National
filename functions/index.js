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

/**
 * deleteMyAccount lets a member erase their own account from inside the app.
 *
 * Apple's Guideline 5.1.1(v) requires this of any app that creates accounts,
 * and the "email the church office to be removed" answer Google Play accepted
 * is explicitly not enough. It has to run server-side: firestore.rules quite
 * deliberately refuses members write access to other members' documents, and
 * merchOrders carries `allow delete: if false`, so nothing but the Admin SDK
 * can do this cleanup.
 *
 * Records that carry money are anonymised rather than destroyed — the
 * congregation still has to reconcile what was paid, so orders and event
 * registrations keep their amounts and proof-of-payment files while every
 * human identifier on them is overwritten. What makes the surviving rows
 * genuinely anonymous rather than merely pseudonymous is that users/{uid} and
 * the Auth record are gone by the end of this function: the uid still stamped
 * on those documents (and on the storage paths under their fileUrl) is then a
 * key with nothing left to unlock. That retention is disclosed in
 * web/privacy-policy.html — keep the two in step.
 */

const ANONYMISED_NAME = 'Deleted member';

// Firestore refuses a batch of more than 500 writes; 400 leaves headroom.
const BATCH_LIMIT = 400;

const commitInBatches = async (db, docs, mutate) => {
  for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const snapshot of docs.slice(i, i + BATCH_LIMIT)) mutate(batch, snapshot);
    await batch.commit();
  }
};

exports.deleteMyAccount = onCall(
  { region: 'us-central1', cors: true, maxInstances: 5 },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Please sign in again, then try deleting your account.');
    }

    const password = request.data?.password;
    if (typeof password !== 'string' || !password) {
      throw new HttpsError('invalid-argument', 'Please enter your password to confirm.');
    }

    const authUser = await admin.auth().getUser(uid).catch(() => null);
    if (!authUser?.email) {
      throw new HttpsError(
        'failed-precondition',
        'This account cannot be deleted from the app. Please contact the church office.'
      );
    }

    // Re-check the password even though the caller is already signed in.
    // Handsets get shared in a congregation and stay signed in for months, so
    // without this a borrowed phone is enough to wipe somebody else's account.
    let res;
    try {
      res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${WEB_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authUser.email, password, returnSecureToken: false }),
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
      throw new HttpsError('unauthenticated', 'That password is not correct.');
    }

    const db = admin.firestore();
    const { FieldValue } = admin.firestore;
    const profileRef = db.collection('users').doc(uid);
    const profile = await profileRef.get();

    // Never strand the congregation without an administrator: approvals,
    // rejections and every admin screen would become unreachable with no way
    // back in from the app. Members and leaders are never blocked, so this
    // cannot stop an App Store reviewer deleting the test account they are
    // given — give them a member account, not an admin one.
    if (profile.data()?.role === 'admin') {
      const admins = await db.collection('users').where('role', '==', 'admin').limit(2).get();
      if (admins.size <= 1) {
        throw new HttpsError(
          'failed-precondition',
          'You are the only administrator. Please make someone else an admin before deleting your account.'
        );
      }
    }

    const [registrations, orders] = await Promise.all([
      db.collection('eventRegistrations').where('userId', '==', uid).get(),
      db.collection('merchOrders').where('userId', '==', uid).get(),
    ]);

    await commitInBatches(db, registrations.docs, (batch, snapshot) =>
      batch.update(snapshot.ref, {
        userName: ANONYMISED_NAME,
        memberDeletedAt: FieldValue.serverTimestamp(),
      })
    );

    await commitInBatches(db, orders.docs, (batch, snapshot) =>
      batch.update(snapshot.ref, {
        userName: ANONYMISED_NAME,
        // `reference` is what the member quotes on the bank transfer and is
        // built as "<name> · <item>", so the name has to come out of it too.
        reference: `${ANONYMISED_NAME} · ${snapshot.data().itemName || ''}`.trim(),
        memberDeletedAt: FieldValue.serverTimestamp(),
      })
    );

    // Everything below is personal content, erased outright.
    const ownPrayers = await db.collection('prayerRequests').where('createdBy', '==', uid).get();
    await commitInBatches(db, ownPrayers.docs, (batch, snapshot) => batch.delete(snapshot.ref));

    // The uid is also scattered across other members' prayer requests as a
    // "praying for this" mark, so pull it out and correct each counter.
    const prayedFor = await db
      .collection('prayerRequests')
      .where('prayingBy', 'array-contains', uid)
      .get();
    await commitInBatches(db, prayedFor.docs, (batch, snapshot) =>
      batch.update(snapshot.ref, {
        prayingBy: FieldValue.arrayRemove(uid),
        prayCount: FieldValue.increment(-1),
      })
    );

    // Admin alerts about this member's registration embed the whole signup
    // payload — name, email, phone — so they go as well.
    const adminAlerts = await db.collection('notifications').where('userId', '==', uid).get();
    await commitInBatches(db, adminAlerts.docs, (batch, snapshot) => batch.delete(snapshot.ref));

    // recursiveDelete takes the profile's notifications and givingHistory
    // subcollections with it; a plain delete would orphan them.
    await db.recursiveDelete(profileRef);

    // The Auth record goes last. While it survives, a failure anywhere above
    // leaves the member able to sign in and try again rather than half-erased.
    await admin.auth().deleteUser(uid);

    return { success: true };
  }
);
