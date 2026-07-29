import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import NotificationsScreen from '../../screens/NotificationsScreen';
import { UserContext } from '../../context/UserContext';

jest.mock('../../services/firestoreService', () => ({
  getUserNotifications: jest.fn(),
  markNotificationAsRead: jest.fn(),
}));

import { getUserNotifications, markNotificationAsRead } from '../../services/firestoreService';

const mockUser = { uid: 'uid-1', name: 'Alice' };

const renderScreen = (user = mockUser) => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  return render(
    <UserContext.Provider value={{ user, onLogin: jest.fn(), onLogout: jest.fn() }}>
      <NotificationsScreen navigation={navigation} />
    </UserContext.Provider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('NotificationsScreen', () => {
  it('renders each notification title and body', async () => {
    getUserNotifications.mockResolvedValue([
      { id: 'n1', type: 'pop_status', title: 'Payment Approved', body: 'Thank you!', read: false, createdAt: new Date() },
    ]);

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('Payment Approved')).toBeTruthy();
      expect(getByText('Thank you!')).toBeTruthy();
    });
  });

  it('shows an empty state when there are no notifications', async () => {
    getUserNotifications.mockResolvedValue([]);

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('No Notifications')).toBeTruthy();
    });
  });

  it('marks an unread notification as read when tapped', async () => {
    markNotificationAsRead.mockResolvedValue({ success: true });
    getUserNotifications.mockResolvedValue([
      { id: 'n1', type: 'approval_status', title: 'Account Approved', body: 'Welcome!', read: false, createdAt: new Date() },
    ]);

    const { getByText } = renderScreen();
    await waitFor(() => getByText('Account Approved'));

    await act(async () => {
      fireEvent.press(getByText('Account Approved'));
    });

    expect(markNotificationAsRead).toHaveBeenCalledWith('uid-1', 'n1');
  });

  it('does not call markNotificationAsRead again for an already-read notification', async () => {
    getUserNotifications.mockResolvedValue([
      { id: 'n1', type: 'approval_status', title: 'Account Approved', body: 'Welcome!', read: true, createdAt: new Date() },
    ]);

    const { getByText } = renderScreen();
    await waitFor(() => getByText('Account Approved'));

    await act(async () => {
      fireEvent.press(getByText('Account Approved'));
    });

    expect(markNotificationAsRead).not.toHaveBeenCalled();
  });
});
