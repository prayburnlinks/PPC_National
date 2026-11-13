/**
 * "Something needs approving" notifications for the people who approve.
 *
 * Three things wait on a reviewer:
 *   - a new leader or admin account (users/{uid}, status "pending"): admins only
 *     can approve those, as firestore.rules says;
 *   - proof of payment for an event (eventRegistrations, status
 *     "payment_submitted"): any admin, or a leader of the registrant's
 *     congregation, but never the person who registered them;
 *   - proof of payment for a merchandise order (merchOrders): the same reviewers,
 *     minus the buyer.
 *
 * When one of those documents enters the waiting state, each reviewer gets an
 * entry in their notification feed. That is all this module does: the
 * sendPushOnNotification trigger already pushes whatever lands in a feed, so the
 * reviewer's phone buzzes and the entry is waiting in the app too.
 *
 * Kept free of firebase-admin, like push.js and broadcast.js, so it can be
 * unit-tested with a stand-in database; see __tests__/functions/approvals.test.js.
 */

const NOTIFICATION_TYPE = 'approval_needed';

// What the app uses to pick the right Admin tab (screens/AdminScreen.js).
const KINDS = {
  account: { statusField: 'status', waitingStatus: 'pending' },
  event_payment: { statusField: 'status', waitingStatus: 'payment_submitted' },
  merch_order: { statusField: 'status', waitingStatus: 'payment_submitted' },
};

// A lock-screen banner shows roughly this much of the body before cutting off.
const BODY_MAX = 300;

const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/**
 * True when this write is the moment the document starts waiting for a
 * reviewer: created in that state, or moved into it (a payment proof is
 * submitted, or resubmitted after a rejection). A later edit to a document that
 * is already waiting is not news, so it doesn't count.
 */
const startedWaiting = (kind, before, after) => {
  const rule = KINDS[kind];
  if (!rule || !after) return false;
  return after[rule.statusField] === rule.waitingStatus && before?.[rule.statusField] !== rule.waitingStatus;
};

const money = (amount) => {
  if (typeof amount !== 'number' || !(amount > 0)) return '';
  return ` (R${Number.isInteger(amount) ? amount : amount.toFixed(2)})`;
};

/** The words on the notification. */
const describe = (kind, data) => {
  if (kind === 'account') {
    const where = data.congregation ? ` (${data.congregation})` : '';
    return {
      title: 'Account awaiting approval',
      body: `${data.name || 'Someone'} signed up as ${data.role || 'a leader'}${where} and is waiting for approval.`,
    };
  }
  if (kind === 'event_payment') {
    const event = data.eventName || 'an event';
    const fee = money(data.registrationFee);
    // A leader registering someone without the app submits the proof for them.
    const body = data.registeredBy
      ? `${data.registeredByName || 'A leader'} sent proof of payment for ${data.userName || 'a guest'} for ${event}${fee}.`
      : `${data.userName || 'A member'} sent proof of payment for ${event}${fee}.`;
    return { title: 'Payment to review', body };
  }
  return {
    title: 'Order payment to review',
    body: `${data.userName || 'A member'} sent proof of payment for ${data.itemName || 'a merchandise order'}${money(data.totalAmount)}.`,
  };
};

// Whoever submitted it can't review it: the person who registered or bought,
// and, for a guest registered by a leader, that leader.
const submittersOf = (kind, data) => {
  if (kind === 'account') return [];
  return [data.registeredBy, data.userId].filter(Boolean);
};

/**
 * The uids who can review this: every approved admin, plus (for payments) the
 * approved leaders of the registrant's congregation, minus whoever submitted it.
 */
const findReviewers = async (db, kind, data) => {
  const approved = (role) => db.collection('users').where('role', '==', role).where('status', '==', 'approved');

  const lookups = [approved('admin').get()];
  // Only admins approve new accounts; payments also go to the congregation's leaders.
  if (kind !== 'account' && data.congregation) {
    lookups.push(approved('leader').where('congregation', '==', data.congregation).get());
  }

  const excluded = new Set(submittersOf(kind, data));
  const uids = new Set();
  (await Promise.all(lookups)).forEach((snap) =>
    snap.docs.forEach((d) => {
      if (!excluded.has(d.id)) uids.add(d.id);
    })
  );
  return [...uids];
};

// Firestore document ids can't contain a slash, and an event id isn't ours to vouch for.
const safeId = (text) => String(text).replace(/[^A-Za-z0-9_-]/g, '_');

const isAlreadyExists = (err) => err?.code === 6 || err?.code === 'already-exists';

/**
 * Puts the notification in each reviewer's feed. The entry id is built from the
 * trigger's own event id, so if Firestore redelivers the same event (it can) the
 * second attempt finds the entry already there instead of notifying again, while
 * a later resubmission has a new event id and does notify.
 *
 * Never throws for one reviewer's failure: the others are still told.
 * Returns how many were notified.
 */
const notifyReviewers = async (db, { FieldValue, kind, sourceId, eventId, data }) => {
  const reviewers = await findReviewers(db, kind, data);
  if (reviewers.length === 0) {
    console.log(`No reviewer to notify for ${kind} ${sourceId}.`);
    return 0;
  }

  const { title, body } = describe(kind, data);
  const entry = {
    type: NOTIFICATION_TYPE,
    title,
    body: clip(body, BODY_MAX),
    read: false,
    createdAt: FieldValue.serverTimestamp(),
    reviewKind: kind,
    reviewId: sourceId,
  };

  let notified = 0;
  await Promise.all(
    reviewers.map(async (uid) => {
      try {
        await db
          .collection('users').doc(uid)
          .collection('notifications').doc(`review-${kind}-${safeId(sourceId)}-${safeId(eventId)}`)
          .create(entry);
        notified++;
      } catch (err) {
        if (!isAlreadyExists(err)) console.error(`Could not notify reviewer ${uid} about ${kind} ${sourceId}:`, err);
      }
    })
  );
  return notified;
};

module.exports = {
  NOTIFICATION_TYPE,
  BODY_MAX,
  startedWaiting,
  describe,
  findReviewers,
  notifyReviewers,
};
