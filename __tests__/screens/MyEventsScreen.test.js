import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import MyEventsScreen from '../../screens/MyEventsScreen';
import { UserContext } from '../../context/UserContext';

jest.mock('../../services/eventRegistrationService', () => ({
  getUserEventRegistrations: jest.fn(),
  submitEventRegistrationPayment: jest.fn(),
}));

import { getUserEventRegistrations } from '../../services/eventRegistrationService';

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
    getUserEventRegistrations.mockResolvedValue([
      {
        id: 'e1',
        name: 'Youth Camp',
        venue: 'Cape Town',
        category: 'Youth',
        eventDate: new Date(Date.now() + 86400000),
        registrationId: 'uid-1_e1',
        registrationStatus: 'confirmed',
      },
    ]);

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('Youth Camp')).toBeTruthy();
      expect(getByText('📍 Cape Town')).toBeTruthy();
    });
  });

  it('shows an empty state with a link to browse events when none registered', async () => {
    getUserEventRegistrations.mockResolvedValue([]);

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('No Registered Events')).toBeTruthy();
      expect(getByText('Browse Events')).toBeTruthy();
    });
  });

  it('shows an Awaiting Payment badge and upload action for an unpaid registration', async () => {
    getUserEventRegistrations.mockResolvedValue([
      {
        id: 'e2',
        name: 'Leaders Retreat',
        venue: 'George',
        category: 'Leaders',
        eventDate: new Date(Date.now() + 86400000),
        registrationId: 'uid-1_e2',
        registrationStatus: 'awaiting_payment',
      },
    ]);

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('Awaiting Payment')).toBeTruthy();
      expect(getByText('Upload Proof of Payment')).toBeTruthy();
    });
  });

  it('shows the rejection reason and a resubmit action for a rejected registration', async () => {
    getUserEventRegistrations.mockResolvedValue([
      {
        id: 'e3',
        name: 'Missions Conference',
        venue: 'Knysna',
        category: 'Missions',
        eventDate: new Date(Date.now() + 86400000),
        registrationId: 'uid-1_e3',
        registrationStatus: 'rejected',
        rejectionReason: 'Reference did not match',
      },
    ]);

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('Payment Rejected')).toBeTruthy();
      expect(getByText('Reference did not match')).toBeTruthy();
      expect(getByText('Resubmit Proof of Payment')).toBeTruthy();
    });
  });

  it('does not show an upload action for an approved registration', async () => {
    getUserEventRegistrations.mockResolvedValue([
      {
        id: 'e4',
        name: 'Women\'s Conference',
        venue: 'Mossel Bay',
        category: 'Women',
        eventDate: new Date(Date.now() + 86400000),
        registrationId: 'uid-1_e4',
        registrationStatus: 'approved',
      },
    ]);

    const { getByText, queryByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('Registered & Paid')).toBeTruthy();
      expect(queryByText('Upload Proof of Payment')).toBeNull();
    });
  });
});
