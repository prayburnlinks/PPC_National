import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import NotificationsScreen from '../../screens/NotificationsScreen';
import { UserContext } from '../../context/UserContext';
import { NotificationsContext } from '../../context/NotificationsContext';

jest.mock('../../services/firestoreService', () => ({
  markNotificationAsRead: jest.fn(),
  markAllNotificationsAsRead: jest.fn(),
  subscribeToNotifications: jest.fn(),
}));

jest.mock('../../services/pushNotificationService', () => ({
  setAppIconBadge: jest.fn(),
}));

import { markNotificationAsRead, markAllNotificationsAsRead } from '../../services/firestoreService';

const mockUser = { uid: 'uid-1', name: 'Alice' };

const feedOf = (notifications, loaded = true) => ({
  notifications,
  unreadCount: notifications.filter((n) => !n.read).length,
  unreadIds: notifications.filter((n) => !n.read).map((n) => n.id),
  latestUnread: notifications.find((n) => !n.read) || null,
  loaded,
  toast: null,
  dismissToast: jest.fn(),
});

const screen = (feed, navigation = { navigate: jest.fn(), goBack: jest.fn() }) => (
  <UserContext.Provider value={{ user: mockUser, onLogin: jest.fn(), onLogout: jest.fn() }}>
    <NotificationsContext.Provider value={feed}>
      <NotificationsScreen navigation={navigation} />
    </NotificationsContext.Provider>
  </UserContext.Provider>
);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('NotificationsScreen', () => {
  it('renders each notification title and body', () => {
    const { getByText } = render(screen(feedOf([
      { id: 'n1', type: 'pop_status', title: 'Payment Approved', body: 'Thank you!', read: false, createdAt: new Date() },
    ])));

    expect(getByText('Payment Approved')).toBeTruthy();
    expect(getByText('Thank you!')).toBeTruthy();
  });

  it('shows a spinner, not the empty state, until the feed has loaded', () => {
    const { queryByText } = render(screen(feedOf([], false)));
    expect(queryByText('No Notifications')).toBeNull();
  });

  it('shows an empty state when there are no notifications', () => {
    const { getByText } = render(screen(feedOf([])));
    expect(getByText('No Notifications')).toBeTruthy();
  });

  it('shows the icon for the kind of notification', () => {
    const { getByText } = render(screen(feedOf([
      { id: 'n1', type: 'announcement', title: 'Prayer Day', body: 'Friday', read: true, createdAt: new Date() },
    ])));
    expect(getByText('📣')).toBeTruthy();
  });

  it('shows a notification that arrives while the screen is open', () => {
    const first = { id: 'n1', type: 'announcement', title: 'First', body: 'a', read: true, createdAt: new Date() };
    const { getByText, queryByText, rerender } = render(screen(feedOf([first])));
    expect(queryByText('Second')).toBeNull();

    const second = { id: 'n2', type: 'announcement', title: 'Second', body: 'b', read: false, createdAt: new Date() };
    rerender(screen(feedOf([second, first])));

    expect(getByText('Second')).toBeTruthy();
  });

  it('marks an unread notification as read when tapped', async () => {
    markNotificationAsRead.mockResolvedValue({ success: true });
    const { getByText } = render(screen(feedOf([
      { id: 'n1', type: 'approval_status', title: 'Account Approved', body: 'Welcome!', read: false, createdAt: new Date() },
    ])));

    await act(async () => {
      fireEvent.press(getByText('Account Approved'));
    });

    expect(markNotificationAsRead).toHaveBeenCalledWith('uid-1', 'n1');
  });

  it('does not call markNotificationAsRead again for an already-read notification', async () => {
    const { getByText } = render(screen(feedOf([
      { id: 'n1', type: 'approval_status', title: 'Account Approved', body: 'Welcome!', read: true, createdAt: new Date() },
    ])));

    await act(async () => {
      fireEvent.press(getByText('Account Approved'));
    });

    expect(markNotificationAsRead).not.toHaveBeenCalled();
  });

  describe('leaving the screen', () => {
    const unread = (id) => ({ id, type: 'announcement', title: `T ${id}`, body: 'b', read: false, createdAt: new Date() });
    const read = (id) => ({ ...unread(id), read: true });

    it('keeps everything marked as new while the member is still looking', () => {
      render(screen(feedOf([unread('n1'), unread('n2')])));
      expect(markAllNotificationsAsRead).not.toHaveBeenCalled();
    });

    it('marks everything unread as read when the member leaves', () => {
      const { unmount } = render(screen(feedOf([unread('n2'), unread('n1'), read('n0')])));

      unmount();

      expect(markAllNotificationsAsRead).toHaveBeenCalledTimes(1);
      expect(markAllNotificationsAsRead).toHaveBeenCalledWith('uid-1', ['n2', 'n1']);
    });

    it('also marks one that arrived while the screen was open', () => {
      const { rerender, unmount } = render(screen(feedOf([unread('n1')])));
      rerender(screen(feedOf([unread('n2'), unread('n1')])));

      unmount();

      expect(markAllNotificationsAsRead).toHaveBeenCalledWith('uid-1', ['n2', 'n1']);
    });

    it('marks unread ones beyond the newest 50 too, so the count cannot stay stuck', () => {
      const feed = { ...feedOf([unread('n1')]), unreadIds: ['n1', 'old-1', 'old-2'] };
      const { unmount } = render(screen(feed));

      unmount();

      expect(markAllNotificationsAsRead).toHaveBeenCalledWith('uid-1', ['n1', 'old-1', 'old-2']);
    });

    it('does not write anything when there was nothing unread', () => {
      const { unmount } = render(screen(feedOf([read('n1')])));

      unmount();

      expect(markAllNotificationsAsRead).not.toHaveBeenCalled();
    });

    it('does not write anything when the member had already marked each one by tapping', async () => {
      markNotificationAsRead.mockResolvedValue({ success: true });
      const { getByText, rerender, unmount } = render(screen(feedOf([unread('n1')])));
      await act(async () => { fireEvent.press(getByText('T n1')); });

      // The live feed now reports it read.
      rerender(screen(feedOf([read('n1')])));
      unmount();

      expect(markAllNotificationsAsRead).not.toHaveBeenCalled();
    });
  });
});
