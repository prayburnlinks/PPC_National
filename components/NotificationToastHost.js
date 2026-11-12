import React, { useEffect } from 'react';
import NotificationToast from './NotificationToast';
import { useNotifications } from '../context/NotificationsContext';

/**
 * Shows the toast for whichever notification just arrived, above every screen.
 * It lives outside the navigator, so `navigationRef` is how it finds out where
 * the member is and how it takes them to their notifications.
 *
 * On the Notifications screen itself there is no toast: the new card appears in
 * the list in front of them.
 */
const NotificationToastHost = ({ navigationRef }) => {
  const { toast, dismissToast } = useNotifications();

  const onNotificationsScreen =
    !!toast && navigationRef.isReady() && navigationRef.getCurrentRoute()?.name === 'Notifications';

  useEffect(() => {
    if (onNotificationsScreen) dismissToast();
  }, [onNotificationsScreen, dismissToast]);

  if (!toast || onNotificationsScreen) return null;

  return (
    <NotificationToast
      key={toast.id}
      notification={toast}
      onDismiss={dismissToast}
      onPress={() => {
        dismissToast();
        navigationRef.navigate('Notifications');
      }}
    />
  );
};

export default NotificationToastHost;
