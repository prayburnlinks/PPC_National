/**
 * Push delivery.
 *
 * Two things send through here: a single notification written to a member's
 * feed (deliverPush, fired by the sendPushOnNotification trigger) and an admin
 * announcement to many members at once (pushToMembers, used by sendBroadcast
 * in broadcast.js). Both go out through Expo's push service, which fronts APNs
 * and FCM. It is kept free of firebase-admin so the delivery rules can be
 * unit-tested with a stand-in database — see __tests__/functions/push.test.js.
 *
 * Devices register themselves in the pushTokens collection, one document per
 * Expo push token (services/pushNotificationService.js writes them).
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Expo refuses requests carrying more than 100 messages.
const EXPO_BATCH_SIZE = 100;

// Firestore's `in` operator takes at most 30 values.
const IN_QUERY_LIMIT = 30;

// How many of those lookups run at once.
const LOOKUP_CONCURRENCY = 10;

// Firestore refuses a batch of more than 500 writes; 400 leaves headroom.
const BATCH_LIMIT = 400;

const EXPO_TOKEN_PATTERN = /^Expo(nent)?PushToken\[[^\]]+\]$/;

const isExpoPushToken = (value) => typeof value === 'string' && EXPO_TOKEN_PATTERN.test(value);

const chunk = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

// `data` is what the app receives alongside the notification (see
// App.js, which routes a tap by it).
const buildMessages = (tokens, { title, body }, data) =>
  tokens.map((to) => ({
    to,
    title,
    body,
    sound: 'default',
    // Matches the channel the app creates on Android; without a channel that
    // exists on the device, Android 8+ drops the notification's sound/heads-up.
    channelId: 'default',
    priority: 'high',
    data,
  }));

/**
 * Sends the messages to Expo. Returns how many it accepted for delivery, how
 * many never reached it (the request itself failed), and the tokens it reports
 * as dead (app uninstalled, token revoked) so the caller can stop sending to
 * them. Other per-message errors are logged and left alone — they are usually
 * transient (rate limits, a bad payload) rather than a reason to forget the
 * device. A failed batch doesn't stop the batches after it.
 */
const sendExpoPush = async (messages, { fetchImpl = fetch, accessToken } = {}) => {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  // Only needed when "Enhanced Security for Push Notifications" is switched on
  // for the project in the Expo dashboard.
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const result = { accepted: 0, failed: 0, deadTokens: [] };

  for (const batch of chunk(messages, EXPO_BATCH_SIZE)) {
    try {
      const res = await fetchImpl(EXPO_PUSH_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(batch),
      });
      if (!res.ok) throw new Error(`Expo push service answered ${res.status}`);

      // Tickets come back in the same order as the messages they answer.
      const { data: tickets } = await res.json();
      batch.forEach((message, index) => {
        const ticket = tickets?.[index];
        if (ticket?.status === 'ok') {
          result.accepted++;
          return;
        }
        result.failed++;
        if (ticket?.details?.error === 'DeviceNotRegistered') {
          result.deadTokens.push(message.to);
        } else {
          console.error(`Expo rejected a push to ${message.to}:`, ticket?.message);
        }
      });
    } catch (err) {
      console.error('Could not send a batch of pushes:', err);
      result.failed += batch.length;
    }
  }

  return result;
};

const forgetTokens = async (db, tokens) => {
  for (const group of chunk(tokens, BATCH_LIMIT)) {
    const batch = db.batch();
    group.forEach((token) => batch.delete(db.collection('pushTokens').doc(token)));
    await batch.commit();
  }
};

// Every device registered to any of these members.
const findTokens = async (db, userIds) => {
  const tokens = [];
  const lookups = chunk(userIds, IN_QUERY_LIMIT);

  for (const group of chunk(lookups, LOOKUP_CONCURRENCY)) {
    const snaps = await Promise.all(
      group.map((ids) => db.collection('pushTokens').where('userId', 'in', ids).get())
    );
    snaps.forEach((snap) => snap.docs.forEach((d) => {
      if (isExpoPushToken(d.id)) tokens.push(d.id);
    }));
  }

  return tokens;
};

/**
 * Pushes one message to every device of the given members and drops any device
 * Expo says is gone. Returns { devices, failed }: the devices Expo accepted the
 * push for, and the pushes that didn't go out. Throws only if Firestore fails.
 */
const pushToMembers = async (db, userIds, notification, data, options = {}) => {
  const tokens = await findTokens(db, userIds);
  if (tokens.length === 0) return { devices: 0, failed: 0 };

  const { accepted, failed, deadTokens } = await sendExpoPush(
    buildMessages(tokens, notification, data),
    options
  );
  await forgetTokens(db, deadTokens);

  return { devices: accepted, failed };
};

/**
 * Pushes one notification from a member's feed to that member's devices. Never
 * throws: the in-app notification is already saved, so a failed push is logged
 * and nothing more.
 */
const deliverPush = async (db, { userId, notificationId, notification }, options = {}) => {
  if (!notification?.title || !notification?.body) return;
  // Announcements are pushed in bulk by sendBroadcast; pushing each member's
  // copy here as well would notify them twice.
  if (notification.broadcastId) return;

  try {
    await pushToMembers(
      db,
      [userId],
      notification,
      { type: notification.type ?? null, notificationId },
      options
    );
  } catch (err) {
    console.error(`Push for notification ${userId}/${notificationId} failed:`, err);
  }
};

module.exports = {
  BATCH_LIMIT,
  chunk,
  isExpoPushToken,
  buildMessages,
  sendExpoPush,
  pushToMembers,
  deliverPush,
};
