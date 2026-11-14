/**
 * What each kind of notification looks like in the app. Shared by the
 * Notifications list and the toast that announces a new one.
 */

export const NOTIFICATION_ICONS = {
  approval_status: '👤',
  pop_status: '💳',
  payment_reminder: '⏰',
  event_reminder: '📅',
  giving_receipt: '💝',
  merch_order_status: '🛍️',
  announcement: '📣',
  approval_needed: '📋',
};

// "Something is waiting for you to approve" notifications (written by
// functions/approvals.js) carry a reviewKind; this is the Admin tab that holds
// that kind of item, so tapping the notification lands on it.
export const REVIEW_TABS = {
  account: 'Pending',
  event_payment: 'Payments',
  merch_order: 'Merch Orders',
};

export const iconForType = (type) => NOTIFICATION_ICONS[type] || '🔔';
