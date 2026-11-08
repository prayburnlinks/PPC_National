/**
 * Registering for events on behalf of people who don't use the app.
 *
 * Not everyone in a congregation has a phone that runs the app, but they still
 * come to conferences and still pay. A leader registers them from their own
 * account; an admin can do the same for any congregation. The registration is
 * the same eventRegistrations document a member creates for themselves, with
 * three differences:
 *
 *   - userId is null, because there is no account to attach it to;
 *   - registeredBy / registeredByName say which leader is answerable for it —
 *     it is who gets the reminders and the payment outcome, and it is who may
 *     upload the proof of payment or cancel it;
 *   - userName holds the attendee's own name, so every list, CSV and review
 *     screen that already reads userName shows them without further changes.
 *
 * These are created and cancelled here rather than from the app so that the
 * capacity check and the attendee counter are one transaction, and so
 * firestore.rules can keep refusing client-side creates of anything but a
 * member's own registration.
 *
 * Kept free of firebase-admin, like broadcast.js, so it can be unit-tested with
 * a stand-in database — see __tests__/functions/registrations.test.js.
 */

const { HttpsError } = require('firebase-functions/v2/https');

const DAY_MS = 24 * 60 * 60 * 1000;

const NAME_MIN = 2;
const NAME_MAX = 80;

// Landlines and mobiles in any of the ways people write them: 082 123 4567,
// +27 82 123 4567, (021) 555 1234.
const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;

// Only registrations nobody has paid for, or sent proof of payment for, can be
// cancelled in the app. Once money is involved an admin has to sort it out.
const CANCELLABLE_STATUSES = ['awaiting_payment', 'rejected', 'confirmed'];

const toMillis = (raw) => {
  if (!raw) return null;
  if (typeof raw.toMillis === 'function') return raw.toMillis();
  if (raw.seconds != null) return raw.seconds * 1000;
  const ms = new Date(raw).getTime();
  return Number.isNaN(ms) ? null : ms;
};

// "Renée  O'Brien" and "renee obrien" are the same person for the purpose of
// noticing a double entry.
const sameName = (a, b) => {
  const fold = (text) =>
    String(text ?? '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  return fold(a) === fold(b);
};

const text = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * The approved leader or admin behind a request, or an HttpsError. Everything a
 * registration is stamped with comes from their profile, never from the app.
 */
const getRegistrar = async (db, uid) => {
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Please sign in again, then try again.');
  }

  const profile = (await db.collection('users').doc(uid).get()).data();
  if (profile?.status !== 'approved' || !['leader', 'admin'].includes(profile?.role)) {
    throw new HttpsError('permission-denied', 'Only leaders and administrators can do this.');
  }

  return {
    uid,
    name: profile.name,
    role: profile.role,
    congregation: profile.congregation,
    district: profile.district,
  };
};

/**
 * Cleans and validates what the app sent. The app checks the same things, but
 * a callable can be invoked by anything, so this is the real check — and it is
 * where "a leader can only register for their own congregation" is enforced.
 */
const parseRegistration = (data, registrar) => {
  const eventId = text(data?.eventId);
  if (!eventId) throw new HttpsError('invalid-argument', 'Please choose an event.');

  const name = text(data?.attendeeName).replace(/\s+/g, ' ');
  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    throw new HttpsError('invalid-argument', "Please enter the person's full name.");
  }

  const phone = text(data?.attendeePhone);
  if (phone && !PHONE_PATTERN.test(phone)) {
    throw new HttpsError('invalid-argument', 'Please enter a valid phone number, or leave it blank.');
  }

  // A leader's guests are their congregation's. An admin may register for any
  // congregation, and otherwise falls back to their own.
  let congregation = registrar.congregation;
  let district = registrar.district;
  if (registrar.role === 'admin' && text(data?.congregation) && text(data?.district)) {
    congregation = text(data.congregation);
    district = text(data.district);
  }
  if (!congregation || !district) {
    throw new HttpsError(
      'failed-precondition',
      registrar.role === 'admin'
        ? 'Please choose the congregation they belong to.'
        : 'Your profile has no congregation. Please contact the church office.'
    );
  }
  if (congregation.length > 100 || district.length > 100) {
    throw new HttpsError('invalid-argument', 'Please choose the congregation they belong to.');
  }

  return { eventId, name, phone, congregation, district, allowDuplicate: data?.allowDuplicate === true };
};

/**
 * Registers one person for an event. Resolves with what the app needs to tell
 * the leader what happens next (the payment details, if there are any).
 */
const registerAttendee = async (db, { FieldValue, registrar, data, now = Date.now() }) => {
  const input = parseRegistration(data, registrar);
  const eventRef = db.collection('events').doc(input.eventId);
  const registrationRef = db.collection('eventRegistrations').doc();

  return db.runTransaction(async (tx) => {
    const eventSnap = await tx.get(eventRef);
    if (!eventSnap.exists) throw new HttpsError('not-found', 'That event no longer exists.');
    const event = eventSnap.data();

    // The app stops listing an event at the end of its last day on the phone's
    // clock; a day's grace here keeps time zones from deciding that for us.
    const lastMs = toMillis(event.endDate) ?? toMillis(event.eventDate);
    if (lastMs != null && now - lastMs > DAY_MS) {
      throw new HttpsError('failed-precondition', 'This event has already taken place.');
    }

    if (event.capacity && (event.attendeeCount || 0) >= event.capacity) {
      throw new HttpsError('failed-precondition', 'This event is full.');
    }

    // A second entry for the same name is usually a slip, but two people can
    // share a name, so the leader can confirm and send it again.
    if (!input.allowDuplicate) {
      const sameCongregation = await tx.get(
        db.collection('eventRegistrations')
          .where('eventId', '==', input.eventId)
          .where('congregation', '==', input.congregation)
      );
      if (sameCongregation.docs.some((d) => sameName(d.data().userName, input.name))) {
        throw new HttpsError('already-exists', `${input.name} is already registered for this event.`);
      }
    }

    const requiresPayment = !!event.requiresPayment && (event.registrationFee || 0) > 0;
    const registration = {
      userId: null,
      userName: input.name,
      attendeePhone: input.phone || null,
      onBehalf: true,
      registeredBy: registrar.uid,
      registeredByName: registrar.name || null,
      congregation: input.congregation,
      district: input.district,
      eventId: input.eventId,
      eventName: event.name,
      eventDate: event.eventDate || null,
      registrationFee: event.registrationFee || 0,
      currency: event.currency || 'ZAR',
      paymentReference: event.paymentReference || null,
      requiresPayment,
      status: requiresPayment ? 'awaiting_payment' : 'confirmed',
      attended: false,
      fileUrl: null,
      fileName: null,
      mimeType: null,
      registeredAt: FieldValue.serverTimestamp(),
      paymentSubmittedAt: null,
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
    };

    tx.create(registrationRef, registration);
    tx.update(eventRef, { attendeeCount: FieldValue.increment(1) });

    return {
      registrationId: registrationRef.id,
      status: registration.status,
      requiresPayment,
      registrationFee: registration.registrationFee,
      currency: registration.currency,
      paymentReference: registration.paymentReference,
    };
  });
};

/**
 * Cancels a registration that was made on someone's behalf, as long as no
 * payment is involved. Only the leader who made it, or an admin, can.
 */
const cancelAttendee = async (db, { FieldValue, registrar, data }) => {
  const registrationId = text(data?.registrationId);
  if (!registrationId) {
    throw new HttpsError('invalid-argument', 'Please choose a registration to cancel.');
  }

  const registrationRef = db.collection('eventRegistrations').doc(registrationId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(registrationRef);
    if (!snap.exists) throw new HttpsError('not-found', 'That registration no longer exists.');
    const registration = snap.data();

    // A member's own registration is theirs, not something to cancel from here.
    if (!registration.onBehalf) {
      throw new HttpsError(
        'failed-precondition',
        'Only registrations made on behalf of someone else can be cancelled here.'
      );
    }
    if (registrar.role !== 'admin' && registration.registeredBy !== registrar.uid) {
      throw new HttpsError('permission-denied', 'Only the leader who registered them can cancel this.');
    }
    if (!CANCELLABLE_STATUSES.includes(registration.status)) {
      throw new HttpsError(
        'failed-precondition',
        "A payment has already been submitted for this registration, so it can't be cancelled here. Please contact an admin."
      );
    }

    const eventRef = db.collection('events').doc(registration.eventId);
    const eventSnap = await tx.get(eventRef);

    tx.delete(registrationRef);
    // The event may have been deleted since, and the counter is advisory, so it
    // never goes below zero.
    if (eventSnap.exists && (eventSnap.data().attendeeCount || 0) > 0) {
      tx.update(eventRef, { attendeeCount: FieldValue.increment(-1) });
    }

    return { success: true };
  });
};

module.exports = {
  CANCELLABLE_STATUSES,
  getRegistrar,
  parseRegistration,
  registerAttendee,
  cancelAttendee,
};
