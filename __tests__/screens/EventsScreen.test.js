import React from 'react';
import { Alert } from 'react-native';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import EventsScreen from '../../screens/EventsScreen';
import { UserContext } from '../../context/UserContext';

jest.mock('../../services/firestoreService', () => ({
  getAllEvents: jest.fn(),
}));

jest.mock('../../services/eventRegistrationService', () => ({
  registerForEvent: jest.fn(),
  getUserEventRegistrationsMap: jest.fn(),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}));

import * as Clipboard from 'expo-clipboard';

import { getAllEvents } from '../../services/firestoreService';
import {
  registerForEvent,
  getUserEventRegistrationsMap,
} from '../../services/eventRegistrationService';

const mockUser = { uid: 'uid-1', name: 'Alice', congregation: 'Ebenezer' };

const freeEvent = {
  id: 'evt-free',
  name: 'Youth Camp',
  venue: 'Cape Town',
  category: 'Youth',
  eventDate: new Date('2026-09-01').toISOString(),
  registrationFee: 0,
  requiresPayment: false,
};

const paidEvent = {
  id: 'evt-paid',
  name: 'Leaders Retreat',
  venue: 'George',
  category: 'Leaders',
  eventDate: new Date('2026-10-01').toISOString(),
  registrationFee: 350,
  requiresPayment: true,
  paymentReference: 'RETREAT26',
  bankDetails: {
    bank: 'FNB',
    accountName: 'PPC National',
    accountNumber: '123456789',
    branchCode: '250655',
  },
};

const renderScreen = (user = mockUser) => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  return render(
    <UserContext.Provider value={{ user, onLogin: jest.fn(), onLogout: jest.fn() }}>
      <EventsScreen navigation={navigation} />
    </UserContext.Provider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  getUserEventRegistrationsMap.mockResolvedValue(new Map());
});

describe('EventsScreen', () => {
  // EVT-01
  it('lets a visitor browse the event list without an account', async () => {
    getAllEvents.mockResolvedValue({ events: [freeEvent, paidEvent] });

    const { getByText } = renderScreen(null);

    await waitFor(() => {
      expect(getByText('Youth Camp')).toBeTruthy();
      expect(getByText('Leaders Retreat')).toBeTruthy();
    });
    expect(getUserEventRegistrationsMap).not.toHaveBeenCalled();
  });

  // EVT-02
  it('blocks a visitor from registering with a Sign In Required alert', async () => {
    getAllEvents.mockResolvedValue({ events: [freeEvent] });

    const { getByText } = renderScreen(null);
    await waitFor(() => getByText('Youth Camp'));
    fireEvent.press(getByText('Youth Camp'));

    await waitFor(() => getByText('Register'));
    fireEvent.press(getByText('Register'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Sign In Required',
      expect.stringContaining('sign in')
    );
    expect(registerForEvent).not.toHaveBeenCalled();
  });

  // EVT-03
  it('registers a member for a free event with no payment step', async () => {
    getAllEvents.mockResolvedValue({ events: [freeEvent] });
    registerForEvent.mockResolvedValue(undefined);

    const { getByText } = renderScreen();
    await waitFor(() => getByText('Youth Camp'));
    fireEvent.press(getByText('Youth Camp'));

    await waitFor(() => getByText('Register'));
    fireEvent.press(getByText('Register'));

    await waitFor(() => {
      expect(registerForEvent).toHaveBeenCalledWith(mockUser, freeEvent);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Registration Successful! 🎉',
        'You are registered for Youth Camp.',
        expect.anything()
      );
    });
  });

  // EVT-04
  it('registers a member for a paid event and surfaces EFT details', async () => {
    getAllEvents.mockResolvedValue({ events: [paidEvent] });
    registerForEvent.mockResolvedValue(undefined);

    const { getByText, queryByText } = renderScreen();
    await waitFor(() => getByText('Leaders Retreat'));
    fireEvent.press(getByText('Leaders Retreat'));

    await waitFor(() => getByText('Register — R350'));
    // Payment details come from the central BANK_DETAILS config, not the
    // event's own (possibly stale) bankDetails field
    expect(getByText('Absa')).toBeTruthy();
    expect(getByText('4056725472')).toBeTruthy();
    expect(queryByText('FNB')).toBeNull();

    Clipboard.setStringAsync.mockResolvedValue();
    fireEvent.press(getByText('Copy'));
    await waitFor(() => {
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith('4056725472');
    });

    fireEvent.press(getByText('Register — R350'));

    await waitFor(() => {
      expect(registerForEvent).toHaveBeenCalledWith(mockUser, paidEvent);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Registration Successful! 🎉',
        expect.stringContaining('R350 EFT payment'),
        expect.anything()
      );
    });
  });

  // EVT-05
  it('shows a registered confirmation instead of a Register button when already registered', async () => {
    getAllEvents.mockResolvedValue({ events: [freeEvent] });
    getUserEventRegistrationsMap.mockResolvedValue(
      new Map([['evt-free', { status: 'registered' }]])
    );

    const { getByText, queryByText } = renderScreen();
    await waitFor(() => getByText('Youth Camp'));
    fireEvent.press(getByText('Youth Camp'));

    await waitFor(() => {
      expect(getByText('✓ You are registered for this event')).toBeTruthy();
    });
    expect(queryByText('Register')).toBeNull();
  });

  // EVT-06
  it('creates only one registration when Register is double-tapped', async () => {
    getAllEvents.mockResolvedValue({ events: [freeEvent] });
    registerForEvent.mockResolvedValue(undefined);

    const { getByText } = renderScreen();
    await waitFor(() => getByText('Youth Camp'));
    fireEvent.press(getByText('Youth Camp'));

    await waitFor(() => getByText('Register'));
    const registerButton = getByText('Register');
    fireEvent.press(registerButton);
    fireEvent.press(registerButton);

    await waitFor(() => {
      expect(registerForEvent).toHaveBeenCalledTimes(1);
    });
  });

  // EVT-07
  it('blocks registration for a full event', async () => {
    const fullEvent = { ...freeEvent, capacity: 100, attendeeCount: 100 };
    getAllEvents.mockResolvedValue({ events: [fullEvent] });

    const { getByText } = renderScreen();
    await waitFor(() => getByText('Youth Camp'));
    fireEvent.press(getByText('Youth Camp'));

    await waitFor(() => getByText('Register'));
    fireEvent.press(getByText('Register'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Event Full',
      'This event has reached its capacity.'
    );
    expect(registerForEvent).not.toHaveBeenCalled();
  });

  // EVT-08 — regression: paid status must never leak across events
  it('shows Registered & Paid only on the event whose payment was approved', async () => {
    getAllEvents.mockResolvedValue({ events: [freeEvent, paidEvent] });
    getUserEventRegistrationsMap.mockResolvedValue(
      new Map([
        ['evt-paid', { status: 'approved' }],
        ['evt-free', { status: 'awaiting_payment' }],
      ])
    );

    const { getAllByText, getByText } = renderScreen();

    await waitFor(() => getByText('Leaders Retreat'));
    expect(getAllByText('✅ Registered & Paid')).toHaveLength(1);
  });
});
