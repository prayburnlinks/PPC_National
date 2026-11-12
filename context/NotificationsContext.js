import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useUser } from './UserContext';
import { ROLES } from '../constants/config';
import { subscribeToNotifications } from '../services/firestoreService';

/**
 * The signed-in member's notification feed, kept live.
 *
 * One listener here feeds everything that shows "you have something new": the
 * bell and banner on Home, the badge on the Home tab,
 * and the toast that slides in, and the Notifications list itself. Before this,
 * each screen fetched the feed on its own when it opened, so nothing could
 * react to a notification arriving while the app was already open.
 */

// How recent a notification must be to earn a toast. A phone that was asleep
// for hours reconnects and gets the whole backlog at once; the bell and banner
// cover that, and a stack of stale toasts would only be noise.
export const TOAST_WINDOW_MS = 5 * 60 * 1000;

// The Notifications list shows the newest of these. The unread count is taken
// over the whole feed, so an old unread item still counts.
const MAX_LISTED = 50;

// `unreadIds` is every unread notification, not just the ones listed, so the
// Notifications screen can mark the lot read when the member leaves it.
const EMPTY_FEED = { notifications: [], unreadCount: 0, unreadIds: [], latestUnread: null, loaded: false };

export const NotificationsContext = createContext({
  ...EMPTY_FEED,
  toast: null,
  dismissToast: () => {},
});

export const useNotifications = () => useContext(NotificationsContext);

const isFresh = (notification) => Date.now() - notification.createdAt.getTime() < TOAST_WINDOW_MS;

export const NotificationsProvider = ({ children }) => {
  const { user } = useUser();
  // Visitors have no account, and so no feed.
  const uid = user?.uid && user.role !== ROLES.VISITOR ? user.uid : null;

  const [feed, setFeed] = useState(EMPTY_FEED);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setFeed(EMPTY_FEED);
    setToast(null);
    if (!uid) return undefined;

    // The first snapshot is everything already in the feed, not news.
    let firstSnapshot = true;

    return subscribeToNotifications(
      uid,
      ({ notifications, addedIds }) => {
        const unread = notifications.filter((n) => !n.read);
        setFeed({
          notifications: notifications.slice(0, MAX_LISTED),
          unreadCount: unread.length,
          unreadIds: unread.map((n) => n.id),
          latestUnread: unread[0] || null,
          loaded: true,
        });

        if (firstSnapshot) {
          firstSnapshot = false;
          return;
        }
        // Newest first, so this is the most recent arrival.
        const arrival = notifications.find((n) => addedIds.includes(n.id) && !n.read && isFresh(n));
        if (arrival) setToast(arrival);
      },
      // Without a feed there is nothing to wait for; show the empty list
      // rather than a spinner that never ends.
      () => setFeed({ ...EMPTY_FEED, loaded: true })
    );
  }, [uid]);

  const dismissToast = useCallback(() => setToast(null), []);

  const value = useMemo(
    () => ({ ...feed, toast, dismissToast }),
    [feed, toast, dismissToast]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};
