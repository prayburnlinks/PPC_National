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
  const utils = render(
    <UserContext.Provider value={{ user, onLogin: jest.fn(), onLogout: jest.fn() }}>
      <EventsScreen navigation={navigation} />
    </UserContext.Provider>
  );
  return { ...utils, navigation };
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
        'Registration Pending',
        expect.stringContaining('pending until your R350 EFT payment is made and approved'),
        expect.anything()
      );
    });
    // It must never claim success or say they are registered while payment is owed.
    const [title, message] = Alert.alert.mock.calls.find(([t]) => t === 'Registration Pending');
    expect(title).not.toMatch(/successful/i);
    expect(message).not.toMatch(/you are registered/i);
    expect(message).toContain('Ref: Alice · RETREAT26');
    expect(message).toContain('Bank: Absa');
    expect(message).toContain('upload your proof of payment under Profile › My Events');
  });

  it('shows the paid event as awaiting payment right after registering, not as registered', async () => {
    getAllEvents.mockResolvedValue({ events: [paidEvent] });
    registerForEvent.mockResolvedValue(undefined);

    const { getByText, queryByText } = renderScreen();
    await waitFor(() => getByText('Leaders Retreat'));
    fireEvent.press(getByText('Leaders Retreat'));
    await waitFor(() => getByText('Register — R350'));
    fireEvent.press(getByText('Register — R350'));

    await waitFor(() => expect(getByText('⏳ Awaiting Payment')).toBeTruthy());
    expect(queryByText('✓')).toBeNull();
    expect(queryByText('✅ Registered & Paid')).toBeNull();

    // Opening it again says the same, and offers no second Register button.
    fireEvent.press(getByText('Leaders Retreat'));
    await waitFor(() => expect(getByText('Registration pending: payment needed')).toBeTruthy());
    expect(queryByText('✓ You are registered for this event')).toBeNull();
    expect(queryByText(/^Register/)).toBeNull();
  });

  it('keeps the success wording and the ✓ for a free event', async () => {
    getAllEvents.mockResolvedValue({ events: [freeEvent] });
    registerForEvent.mockResolvedValue(undefined);

    const { getByText, queryByText } = renderScreen();
    await waitFor(() => getByText('Youth Camp'));
    fireEvent.press(getByText('Youth Camp'));
    await waitFor(() => getByText('Register'));
    fireEvent.press(getByText('Register'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith(
      'Registration Successful! 🎉', 'You are registered for Youth Camp.', expect.anything()
    ));
    expect(getByText('✓')).toBeTruthy();
    expect(queryByText(/Awaiting Payment/)).toBeNull();
  });

  describe('a registration that already exists', () => {
    const open = async (status) => {
      getAllEvents.mockResolvedValue({ events: [paidEvent] });
      getUserEventRegistrationsMap.mockResolvedValue(new Map([['evt-paid', { status }]]));
      const utils = renderScreen();
      await waitFor(() => utils.getByText('Leaders Retreat'));
      return utils;
    };

    it('awaiting payment: amber badge, no green ✓, and the sheet says payment is needed', async () => {
      const { getByText, queryByText } = await open('awaiting_payment');
      expect(getByText('⏳ Awaiting Payment')).toBeTruthy();
      expect(queryByText('✓')).toBeNull();
      expect(queryByText('✅ Registered & Paid')).toBeNull();

      fireEvent.press(getByText('Leaders Retreat'));
      await waitFor(() => getByText('Registration pending: payment needed'));
      expect(getByText(/upload your proof of payment under Profile › My Events/)).toBeTruthy();
      expect(queryByText('✓ You are registered for this event')).toBeNull();
    });

    it('payment submitted: under review', async () => {
      const { getByText, queryByText } = await open('payment_submitted');
      expect(getByText('⏳ Payment Under Review')).toBeTruthy();
      expect(queryByText('✓')).toBeNull();

      fireEvent.press(getByText('Leaders Retreat'));
      await waitFor(() => getByText('Registration pending: your payment is being reviewed'));
    });

    it('payment rejected: says so and points to a new upload', async () => {
      const { getByText, queryByText } = await open('rejected');
      expect(getByText('⚠️ Payment Rejected')).toBeTruthy();
      expect(queryByText('✓')).toBeNull();

      fireEvent.press(getByText('Leaders Retreat'));
      await waitFor(() => getByText('Payment rejected'));
      expect(getByText('Upload a new proof of payment under Profile › My Events.')).toBeTruthy();
    });

    it('approved: green ✓, Registered & Paid, and registered in the sheet', async () => {
      const { getByText, queryByText } = await open('approved');
      expect(getByText('✓')).toBeTruthy();
      expect(getByText('✅ Registered & Paid')).toBeTruthy();
      expect(queryByText(/Awaiting Payment|Under Review|Rejected/)).toBeNull();

      fireEvent.press(getByText('Leaders Retreat'));
      await waitFor(() => getByText('✓ You are registered for this event'));
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

describe('EventsScreen: registering someone else', () => {
  const openEvent = async (user) => {
    getAllEvents.mockResolvedValue({ events: [paidEvent] });
    const utils = renderScreen(user);
    await waitFor(() => utils.getByText('Leaders Retreat'));
    fireEvent.press(utils.getByText('Leaders Retreat'));
    return utils;
  };

  it.each(['leader', 'admin'])('offers a %s a way to register someone who has no app', async (role) => {
    const { getByText } = await openEvent({ ...mockUser, role });

    await waitFor(() => getByText('Register Someone Else'));
  });

  it('opens the registration screen for that event, and closes the sheet', async () => {
    const { getByText, queryByText, navigation } = await openEvent({ ...mockUser, role: 'leader' });
    await waitFor(() => getByText('Register Someone Else'));

    fireEvent.press(getByText('Register Someone Else'));

    expect(navigation.navigate).toHaveBeenCalledWith('RegisterAttendee', { eventId: 'evt-paid' });
    expect(queryByText('Register Someone Else')).toBeNull();
  });

  it('keeps the leader’s own Register button', async () => {
    const { getByText } = await openEvent({ ...mockUser, role: 'leader' });

    await waitFor(() => getByText('Register — R350'));
  });

  it('is not offered to a member', async () => {
    const { getByText, queryByText } = await openEvent({ ...mockUser, role: 'member' });
    await waitFor(() => getByText('Register — R350'));

    expect(queryByText('Register Someone Else')).toBeNull();
  });

  it('is not offered to a visitor', async () => {
    getAllEvents.mockResolvedValue({ events: [paidEvent] });
    const { getByText, queryByText } = renderScreen(null);
    await waitFor(() => getByText('Leaders Retreat'));
    fireEvent.press(getByText('Leaders Retreat'));

    await waitFor(() => getByText('Register — R350'));
    expect(queryByText('Register Someone Else')).toBeNull();
  });
});
