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
};

export const iconForType = (type) => NOTIFICATION_ICONS[type] || '🔔';
