import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import MyEventsScreen from '../../screens/MyEventsScreen';
import { UserContext } from '../../context/UserContext';

jest.mock('../../services/firestoreService', () => ({
  getUserRegisteredEvents: jest.fn(),
}));

import { getUserRegisteredEvents } from '../../services/firestoreService';

const mockUser = { uid: 'uid-1', name: 'Alice' };

const renderScreen = (user = mockUser) => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  return render(
    <UserContext.Provider value={{ user, onLogin: jest.fn(), onLogout: jest.fn() }}>
      <MyEventsScreen navigation={navigation} />
    </UserContext.Provider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MyEventsScreen', () => {
  it('renders each registered event', async () => {
    getUserRegisteredEvents.mockResolvedValue([
      {
        id: 'e1',
        name: 'Youth Camp',
        venue: 'Cape Town',
        category: 'Youth',
        eventDate: new Date(Date.now() + 86400000),
      },
    ]);

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('Youth Camp')).toBeTruthy();
      expect(getByText('📍 Cape Town')).toBeTruthy();
    });
  });

  it('shows an empty state with a link to browse events when none registered', async () => {
    getUserRegisteredEvents.mockResolvedValue([]);

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('No Registered Events')).toBeTruthy();
      expect(getByText('Browse Events')).toBeTruthy();
    });
  });
});
