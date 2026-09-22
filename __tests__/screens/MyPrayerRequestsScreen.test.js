import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import MyPrayerRequestsScreen from '../../screens/MyPrayerRequestsScreen';
import { UserContext } from '../../context/UserContext';

jest.mock('../../services/firestoreService', () => ({
  getUserPrayerRequests: jest.fn(),
}));

import { getUserPrayerRequests } from '../../services/firestoreService';

const mockUser = { uid: 'uid-1', name: 'Alice' };

const renderScreen = (user = mockUser) => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  return render(
    <UserContext.Provider value={{ user, onLogin: jest.fn(), onLogout: jest.fn() }}>
      <MyPrayerRequestsScreen navigation={navigation} />
    </UserContext.Provider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MyPrayerRequestsScreen', () => {
  it('renders the current user\'s own requests', async () => {
    getUserPrayerRequests.mockResolvedValue([
      { id: 'req-1', title: 'Healing', body: 'Please pray', scope: 'national', prayCount: 4, createdAt: new Date() },
    ]);

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('Healing')).toBeTruthy();
      expect(getByText('🙏 4 praying')).toBeTruthy();
    });
  });

  it('shows an empty state with a link to the Prayer Wall when none submitted', async () => {
    getUserPrayerRequests.mockResolvedValue([]);

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('No Requests Yet')).toBeTruthy();
      expect(getByText('Go to Prayer Wall')).toBeTruthy();
    });
  });
});
