import React from 'react';
import { Alert } from 'react-native';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import ProfileScreen from '../../screens/ProfileScreen';
import { UserContext } from '../../context/UserContext';

jest.mock('../../services/authService', () => ({
  logoutUser: jest.fn(),
  getCurrentUser: jest.fn(),
  deleteMyAccount: jest.fn(),
}));

import { logoutUser, getCurrentUser, deleteMyAccount } from '../../services/authService';

const memberUser = {
  uid: 'uid-1',
  name: 'Alice',
  role: 'member',
  status: 'approved',
  congregation: 'Ceres',
  district: 'Boland',
};

const renderScreen = (user = memberUser) => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  const onLogout = jest.fn();
  const utils = render(
    <UserContext.Provider value={{ user, onLogin: jest.fn(), onLogout }}>
      <ProfileScreen navigation={navigation} />
    </UserContext.Provider>
  );
  return { ...utils, navigation, onLogout };
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  getCurrentUser.mockResolvedValue(null);
});

describe('ProfileScreen', () => {
  // PROF-01
  it('shows name, role/status badge, congregation, and district', () => {
    const { getByText } = renderScreen();

    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('member · approved')).toBeTruthy();
    expect(getByText('Ceres')).toBeTruthy();
    expect(getByText('Boland')).toBeTruthy();
  });

  // PROF-02
  it('navigates to each Account row target', () => {
    const { getByText, queryByText, navigation } = renderScreen();

    fireEvent.press(getByText('Notifications'));
    fireEvent.press(getByText('Prayer Requests'));
    fireEvent.press(getByText('My Events'));
    fireEvent.press(getByText('My Orders'));

    expect(navigation.navigate).toHaveBeenCalledWith('Notifications');
    expect(navigation.navigate).toHaveBeenCalledWith('MyPrayerRequests');
    expect(navigation.navigate).toHaveBeenCalledWith('MyEvents');
    expect(navigation.navigate).toHaveBeenCalledWith('MyOrders');

    // Giving is display-only now — no history row on the profile
    expect(queryByText('Giving History')).toBeNull();
  });

  // PROF-03
  it('hides Documents and Admin Panel from members', () => {
    const { queryByText } = renderScreen();

    expect(queryByText('Documents')).toBeNull();
    expect(queryByText('Admin Panel')).toBeNull();
  });

  // PROF-04
  it('shows Documents and Admin Panel to leaders and they navigate correctly', () => {
    const { getByText, navigation } = renderScreen({ ...memberUser, role: 'leader' });

    fireEvent.press(getByText('Documents'));
    fireEvent.press(getByText('Admin Panel'));

    expect(navigation.navigate).toHaveBeenCalledWith('Documents');
    expect(navigation.navigate).toHaveBeenCalledWith('Admin');
  });

  // PROF-04 (admin variant)
  it('shows Documents and Admin Panel to admins', () => {
    const { getByText } = renderScreen({ ...memberUser, role: 'admin' });

    expect(getByText('Documents')).toBeTruthy();
    expect(getByText('Admin Panel')).toBeTruthy();
  });

  // PROF-05
  it('asks for confirmation before signing out and cancel keeps the session', () => {
    const { getByText, onLogout } = renderScreen();

    fireEvent.press(getByText('Sign Out'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Sign Out',
      'Are you sure you want to sign out?',
      expect.anything()
    );

    const buttons = Alert.alert.mock.calls[0][2];
    const cancelButton = buttons.find(b => b.text === 'Cancel');
    cancelButton.onPress();

    expect(logoutUser).not.toHaveBeenCalled();
    expect(onLogout).not.toHaveBeenCalled();
  });

  // PROF-06
  it('signs out after confirmation', async () => {
    logoutUser.mockResolvedValue(undefined);
    const { getByText, onLogout } = renderScreen();

    fireEvent.press(getByText('Sign Out'));

    const buttons = Alert.alert.mock.calls[0][2];
    const confirmButton = buttons.find(b => b.text === 'Sign Out');
    confirmButton.onPress();

    await waitFor(() => {
      expect(logoutUser).toHaveBeenCalled();
      expect(onLogout).toHaveBeenCalled();
    });
  });

  // PROF-07 — Apple Guideline 5.1.1(v): deletion has to be reachable in-app.
  it('opens the delete sheet and states what survives deletion', () => {
    const { getByText } = renderScreen();

    fireEvent.press(getByText('Delete Account'));

    expect(getByText(/permanently deletes your profile/i)).toBeTruthy();
    expect(getByText(/stay in the church's financial records/i)).toBeTruthy();
    expect(getByText('CONFIRM YOUR PASSWORD')).toBeTruthy();
  });

  // PROF-08
  it('refuses to delete without a password, and does not call the service', () => {
    const { getByText } = renderScreen();

    fireEvent.press(getByText('Delete Account'));
    fireEvent.press(getByText('Delete My Account'));

    expect(deleteMyAccount).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Password Required',
      'Please enter your password to confirm.'
    );
  });

  // PROF-09
  it('deletes the account with the entered password and returns to login', async () => {
    deleteMyAccount.mockResolvedValue({ success: true });
    const { getByText, getByPlaceholderText, onLogout } = renderScreen();

    fireEvent.press(getByText('Delete Account'));
    fireEvent.changeText(getByPlaceholderText('Password'), 'correct-horse');
    fireEvent.press(getByText('Delete My Account'));

    await waitFor(() => {
      expect(deleteMyAccount).toHaveBeenCalledWith('correct-horse');
      expect(onLogout).toHaveBeenCalled();
    });
  });

  // PROF-10 — a wrong password must leave the member signed in, not stranded.
  it('surfaces a failure and keeps the session when deletion is refused', async () => {
    deleteMyAccount.mockRejectedValue({ message: 'That password is not correct.' });
    const { getByText, getByPlaceholderText, onLogout } = renderScreen();

    fireEvent.press(getByText('Delete Account'));
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrong');
    fireEvent.press(getByText('Delete My Account'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Could Not Delete Account',
        'That password is not correct.'
      );
    });
    expect(onLogout).not.toHaveBeenCalled();
  });
});
