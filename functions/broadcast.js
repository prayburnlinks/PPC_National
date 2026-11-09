/**
 * Admin announcements.
 *
 * sendBroadcast (index.js) lets an administrator message a whole audience —
 * everyone, one district or one congregation — in one go. The message is
 * written to each member's notification feed, so it is waiting in the app even
 * for people who have push switched off, and then pushed to their devices in
 * bulk. The per-document trigger (sendPushOnNotification) skips these feed
 * entries because they carry a broadcastId; pushing them there as well would
 * notify everyone twice and fire one Expo request per member.
 *
 * Kept free of firebase-admin, like push.js, so it can be unit-tested with a
 * stand-in database — see __tests__/functions/broadcast.test.js.
 */

const { HttpsError } = require('firebase-functions/v2/https');
const { BATCH_LIMIT, chunk, pushToMembers } = require('./push');

// A lock-screen banner shows roughly this much of either before cutting off.
const TITLE_MAX = 65;
const BODY_MAX = 300;

const AUDIENCE_FIELDS = { district: 'district', congregation: 'congregation' };

/**
 * Cleans and validates what the app sent. The app enforces the same limits,
 * but a callable can be invoked by anything, so this is the real check.
 */
const parseBroadcast = (data) => {
  const title = typeof data?.title === 'string' ? data.title.trim() : '';
  const body = typeof data?.body === 'string' ? data.body.trim() : '';
  if (!title || !body) {
    throw new HttpsError('invalid-argument', 'Please enter a title and a message.');
  }
  if (title.length > TITLE_MAX || body.length > BODY_MAX) {
    throw new HttpsError(
      'invalid-argument',
      `Keep the title under ${TITLE_MAX} characters and the message under ${BODY_MAX}.`
    );
  }

  const type = data?.audience?.type;
  if (type !== 'all' && !AUDIENCE_FIELDS[type]) {
    throw new HttpsError('invalid-argument', 'Please choose who should receive this.');
  }

  let value = null;
  if (type !== 'all') {
    value = typeof data.audience.value === 'string' ? data.audience.value.trim() : '';
    if (!value || value.length > 100) {
      throw new HttpsError('invalid-argument', 'Please choose who should receive this.');
    }
  }

  return { title, body, audience: { type, value } };
};

// Approved members only: pending and rejected accounts aren't signed in to the
// app, and shouldn't be told about church business.
const findRecipients = async (db, { type, value }) => {
  let query = db.collection('users').where('status', '==', 'approved');
  if (type !== 'all') query = query.where(AUDIENCE_FIELDS[type], '==', value);
  const snap = await query.get();
  return snap.docs.map((d) => d.id);
};

/**
 * Sends one announcement. `sender` is the verified administrator ({ uid, name });
 * checking that they are one is the caller's job. Returns what the app shows
 * the admin afterwards.
 */
const runBroadcast = async (db, { FieldValue, sender, data, pushOptions }) => {
  const { title, body, audience } = parseBroadcast(data);

  const recipients = await findRecipients(db, audience);
  if (recipients.length === 0) {
    throw new HttpsError('failed-precondition', 'No approved members match that audience.');
  }

  // Recorded before anything goes out, so an admin whose connection drops
  // mid-send can still see in the app that the announcement left.
  const record = db.collection('broadcasts').doc();
  await record.set({
    title,
    body,
    audience,
    sentBy: sender.uid,
    sentByName: sender.name || null,
    sentAt: FieldValue.serverTimestamp(),
    status: 'sending',
    recipients: recipients.length,
  });

  try {
    // The feed first, then the push: a member who taps the push should find
    // the announcement already there.
    const entry = {
      type: 'announcement',
      title,
      body,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
      broadcastId: record.id,
    };
    for (const ids of chunk(recipients, BATCH_LIMIT)) {
      const batch = db.batch();
      ids.forEach((uid) =>
        batch.set(db.collection('users').doc(uid).collection('notifications').doc(), entry)
      );
      await batch.commit();
    }

    // The announcement is in every feed by now, so a push problem is reported
    // rather than thrown: the admin shouldn't be told it failed and send it again.
    let push = { devices: 0, failed: 0 };
    let pushFailed = false;
    try {
      push = await pushToMembers(
        db,
        recipients,
        { title, body },
        { type: 'announcement', broadcastId: record.id },
        pushOptions
      );
    } catch (err) {
      console.error(`Push for broadcast ${record.id} failed:`, err);
      pushFailed = true;
    }

    const result = {
      recipients: recipients.length,
      devices: push.devices,
      failed: push.failed,
      pushFailed,
    };
    await record.update({ status: 'sent', ...result });
    return { broadcastId: record.id, ...result };
  } catch (err) {
    console.error(`Broadcast ${record.id} failed part-way:`, err);
    await record.update({ status: 'failed' }).catch(() => {});
    throw new HttpsError(
      'internal',
      'The announcement could not be sent to everyone. Check Recent announcements before trying again.'
    );
  }
};

module.exports = { TITLE_MAX, BODY_MAX, parseBroadcast, runBroadcast };
