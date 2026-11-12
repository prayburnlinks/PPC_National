/**
 * How an unread count is written on a badge: the number itself up to nine, then
 * "9+", so a long run of unread items can't stretch the badge across the bell.
 */

const MAX_BADGE_COUNT = 9;

export const badgeLabel = (count) =>
  count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(count);

// For a tab bar's `tabBarBadge` option, where `undefined` means "no badge".
export const tabBadge = (count) => (count > 0 ? badgeLabel(count) : undefined);
