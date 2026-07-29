import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import GivingHistoryScreen from '../../screens/GivingHistoryScreen';
import { UserContext } from '../../context/UserContext';

jest.mock('../../services/firestoreService', () => ({
  getUserGivingHistory: jest.fn(),
}));

import { getUserGivingHistory } from '../../services/firestoreService';

const mockUser = { uid: 'uid-1', name: 'Alice', congregation: 'Ebenezer' };

const renderScreen = (user = mockUser) => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  return render(
    <UserContext.Provider value={{ user, onLogin: jest.fn(), onLogout: jest.fn() }}>
      <GivingHistoryScreen navigation={navigation} />
    </UserContext.Provider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GivingHistoryScreen', () => {
  it('shows the total and each transaction', async () => {
    getUserGivingHistory.mockResolvedValue([
      { id: 'tx-1', fund: 'tithes', amount: 100, status: 'pending', createdAt: new Date() },
      { id: 'tx-2', fund: 'building', amount: 250, status: 'pending', createdAt: new Date() },
    ]);

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('R350')).toBeTruthy();
      expect(getByText('Tithes & Offerings')).toBeTruthy();
      expect(getByText('Building Fund')).toBeTruthy();
    });
  });

  it('shows an empty state when there is no giving history', async () => {
    getUserGivingHistory.mockResolvedValue([]);

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('No Giving Yet')).toBeTruthy();
    });
  });

  it('labels event registration fees distinctly from a fund', async () => {
    getUserGivingHistory.mockResolvedValue([
      { id: 'tx-3', fund: 'event_registration', amount: 150, status: 'pending', createdAt: new Date() },
    ]);

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('Event Registration')).toBeTruthy();
    });
  });
});
