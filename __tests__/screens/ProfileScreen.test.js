import React from 'react';
import { Alert } from 'react-native';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import ProfileScreen from '../../screens/ProfileScreen';
import { UserContext } from '../../context/UserContext';

jest.mock('../../services/authService', () => ({
  logoutUser: jest.fn(),
  getCurrentUser: jest.fn(),
}));

import { logoutUser, getCurrentUser } from '../../services/authService';

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
    expect(getByText('⭐ member · approved')).toBeTruthy();
    expect(getByText('Ceres')).toBeTruthy();
    expect(getByText('Boland')).toBeTruthy();
  });

  // PROF-02
  it('navigates to each Account row target', () => {
    const { getByText, navigation } = renderScreen();

    fireEvent.press(getByText('Notifications'));
    fireEvent.press(getByText('Giving History'));
    fireEvent.press(getByText('Prayer Requests'));
    fireEvent.press(getByText('My Events'));
    fireEvent.press(getByText('My Orders'));

    expect(navigation.navigate).toHaveBeenCalledWith('Notifications');
    expect(navigation.navigate).toHaveBeenCalledWith('GivingHistory');
    expect(navigation.navigate).toHaveBeenCalledWith('MyPrayerRequests');
    expect(navigation.navigate).toHaveBeenCalledWith('MyEvents');
    expect(navigation.navigate).toHaveBeenCalledWith('MyOrders');
  });

  // PROF-03
  it('hides Documents and Admin Panel from members', () => {
    const { queryByText } = renderScreen();

    expect(queryByText('📁  Documents')).toBeNull();
    expect(queryByText('Admin Panel')).toBeNull();
  });

  // PROF-04
  it('shows Documents and Admin Panel to leaders and they navigate correctly', () => {
    const { getByText, navigation } = renderScreen({ ...memberUser, role: 'leader' });

    fireEvent.press(getByText('📁  Documents'));
    fireEvent.press(getByText('Admin Panel'));

    expect(navigation.navigate).toHaveBeenCalledWith('Documents');
    expect(navigation.navigate).toHaveBeenCalledWith('Admin');
  });

  // PROF-04 (admin variant)
  it('shows Documents and Admin Panel to admins', () => {
    const { getByText } = renderScreen({ ...memberUser, role: 'admin' });

    expect(getByText('📁  Documents')).toBeTruthy();
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
});
