import React from 'react';
import { Alert } from 'react-native';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import RegisterAttendeeScreen from '../../screens/RegisterAttendeeScreen';
import { UserContext } from '../../context/UserContext';

jest.mock('../../services/firestoreService', () => ({
  getEventById: jest.fn(),
}));

jest.mock('../../services/eventRegistrationService', () => ({
  registerAttendee: jest.fn(),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}));

import { getEventById } from '../../services/firestoreService';
import { registerAttendee } from '../../services/eventRegistrationService';

const NAME_PLACEHOLDER = 'e.g. Alice Adams';
const PHONE_PLACEHOLDER = 'e.g. 082 123 4567';

const leader = { uid: 'leader-1', name: 'Lena Leader', role: 'leader', congregation: 'Ceres', district: 'Boland' };
const admin = { uid: 'admin-1', name: 'Nadia', role: 'admin', congregation: 'Paarl', district: 'Boland' };

const paidEvent = {
  id: 'evt-paid',
  name: 'Leaders Retreat',
  venue: 'George',
  eventDate: new Date('2026-10-01T08:00:00'),
  registrationFee: 350,
  requiresPayment: true,
  paymentReference: 'RETREAT26',
  capacity: 100,
  attendeeCount: 10,
};

const freeEvent = { ...paidEvent, id: 'evt-free', name: 'Prayer Night', registrationFee: 0, requiresPayment: false, paymentReference: undefined };

const renderScreen = ({ user = leader, eventId = 'evt-paid' } = {}) => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  const utils = render(
    <UserContext.Provider value={{ user, onLogin: jest.fn(), onLogout: jest.fn() }}>
      <RegisterAttendeeScreen navigation={navigation} route={{ params: { eventId } }} />
    </UserContext.Provider>
  );
  return { ...utils, navigation };
};

const loaded = async (options) => {
  const utils = renderScreen(options);
  await waitFor(() => expect(getEventById).toHaveBeenCalled());
  await waitFor(() => utils.getByPlaceholderText(NAME_PLACEHOLDER));
  return utils;
};

const fill = (utils, name = 'Alice Adams', phone = '082 123 4567') => {
  fireEvent.changeText(utils.getByPlaceholderText(NAME_PLACEHOLDER), name);
  if (phone) fireEvent.changeText(utils.getByPlaceholderText(PHONE_PLACEHOLDER), phone);
};

const lastAlert = () => Alert.alert.mock.calls[Alert.alert.mock.calls.length - 1];

const pressAlertButton = async (label) => {
  const button = lastAlert()[2].find((b) => b.text === label);
  await act(async () => {
    await button.onPress();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  getEventById.mockResolvedValue(paidEvent);
  registerAttendee.mockResolvedValue({
    success: true,
    registrationId: 'reg-1',
    status: 'awaiting_payment',
    requiresPayment: true,
    registrationFee: 350,
    paymentReference: 'RETREAT26',
  });
});

describe('RegisterAttendeeScreen', () => {
  it('shows the event being registered for', async () => {
    const { getByText } = await loaded();

    expect(getByText('Leaders Retreat')).toBeTruthy();
    expect(getByText('📍 George')).toBeTruthy();
    expect(getByText('👥 10 / 100 registered')).toBeTruthy();
    expect(getEventById).toHaveBeenCalledWith('evt-paid');
  });

  it('says so when the event cannot be found', async () => {
    getEventById.mockResolvedValue(null);
    const { getByText } = renderScreen();

    await waitFor(() => getByText('Event Not Found'));
  });

  it('goes back from the header', async () => {
    const { getByText, navigation } = await loaded();

    fireEvent.press(getByText('←'));

    expect(navigation.goBack).toHaveBeenCalled();
  });

  describe('for a leader', () => {
    it('registers for their own congregation, with no choice to make', async () => {
      const { getByText, queryByText } = await loaded();

      expect(getByText('Ceres')).toBeTruthy();
      expect(queryByText('Boland')).toBeNull(); // no district chips
    });

    it('registers the person with the name and phone typed', async () => {
      const utils = await loaded();
      fill(utils);

      await act(async () => {
        fireEvent.press(utils.getByText('Register — R350'));
      });

      expect(registerAttendee).toHaveBeenCalledWith(paidEvent, {
        name: 'Alice Adams',
        phone: '082 123 4567',
        allowDuplicate: false,
      });
    });

    it('trims the name, and sends no phone when none is given', async () => {
      const utils = await loaded();
      fill(utils, '  Alice Adams  ', '');

      await act(async () => {
        fireEvent.press(utils.getByText('Register — R350'));
      });

      expect(registerAttendee).toHaveBeenCalledWith(paidEvent, {
        name: 'Alice Adams',
        phone: undefined,
        allowDuplicate: false,
      });
    });

    it('will not register without a name', async () => {
      const { getByText } = await loaded();

      await act(async () => {
        fireEvent.press(getByText('Register — R350'));
      });

      expect(Alert.alert).toHaveBeenCalledWith('Missing Info', "Please enter the person's full name.");
      expect(registerAttendee).not.toHaveBeenCalled();
    });
  });

  describe('payment', () => {
    it('shows the EFT details, with the reference they would pay under', async () => {
      const utils = await loaded();

      expect(utils.getByText('💳 Payment Details')).toBeTruthy();
      expect(utils.getByText('Their name · RETREAT26')).toBeTruthy();

      fireEvent.changeText(utils.getByPlaceholderText(NAME_PLACEHOLDER), 'Alice Adams');

      expect(utils.getByText('Alice Adams · RETREAT26')).toBeTruthy();
    });

    it('tells the leader what to pay and where, once registered', async () => {
      const utils = await loaded();
      fill(utils);

      await act(async () => {
        fireEvent.press(utils.getByText('Register — R350'));
      });

      const [title, message] = lastAlert();
      // Owing money, so not "registered" yet.
      expect(title).toBe('Registration Pending');
      expect(message).toContain("Alice Adams's registration for Leaders Retreat is pending until their R350 EFT payment is made and approved.");
      expect(message).not.toMatch(/is registered/i);
      expect(message).toContain('R350');
      expect(message).toContain('Ref: Alice Adams · RETREAT26');
      expect(message).toContain('People I\'ve Registered');
    });

    it('leaves out the payment steps for a free event', async () => {
      getEventById.mockResolvedValue(freeEvent);
      registerAttendee.mockResolvedValue({ success: true, requiresPayment: false, status: 'confirmed' });
      const utils = await loaded({ eventId: 'evt-free' });
      fill(utils);

      expect(utils.queryByText('💳 Payment Details')).toBeNull();
      await act(async () => {
        fireEvent.press(utils.getByText('Register'));
      });

      expect(lastAlert()[1]).toBe('Alice Adams is registered for Prayer Night.');
    });
  });

  describe('after registering', () => {
    it('clears the form to register another person', async () => {
      const utils = await loaded();
      fill(utils);
      await act(async () => {
        fireEvent.press(utils.getByText('Register — R350'));
      });

      await pressAlertButton('Register Another');

      expect(utils.getByPlaceholderText(NAME_PLACEHOLDER).props.value).toBe('');
      expect(utils.getByPlaceholderText(PHONE_PLACEHOLDER).props.value).toBe('');
    });

    it('opens the list of people they have registered', async () => {
      const utils = await loaded();
      fill(utils);
      await act(async () => {
        fireEvent.press(utils.getByText('Register — R350'));
      });

      await pressAlertButton('View List');

      expect(utils.navigation.navigate).toHaveBeenCalledWith('MyAttendees');
    });
  });

  describe('a name that is already on the list', () => {
    const duplicate = { code: 'functions/already-exists', message: 'Alice Adams is already registered for this event.' };

    it('asks before registering them again', async () => {
      registerAttendee.mockRejectedValueOnce(duplicate);
      const utils = await loaded();
      fill(utils);

      await act(async () => {
        fireEvent.press(utils.getByText('Register — R350'));
      });

      const [title, message, buttons] = lastAlert();
      expect(title).toBe('Already Registered?');
      expect(message).toContain('Alice Adams is already registered for this event.');
      expect(buttons.map((b) => b.text)).toEqual(['Cancel', 'Register Anyway']);
      expect(registerAttendee).toHaveBeenCalledTimes(1);
    });

    it('registers them anyway when the leader says it is a different person', async () => {
      registerAttendee.mockRejectedValueOnce(duplicate);
      const utils = await loaded();
      fill(utils);
      await act(async () => {
        fireEvent.press(utils.getByText('Register — R350'));
      });

      await pressAlertButton('Register Anyway');

      expect(registerAttendee).toHaveBeenCalledTimes(2);
      expect(registerAttendee).toHaveBeenLastCalledWith(
        paidEvent,
        expect.objectContaining({ name: 'Alice Adams', allowDuplicate: true })
      );
      // A paid event: pending until the payment is made, so not "Registered".
      expect(lastAlert()[0]).toBe('Registration Pending');
    });
  });

  it('shows what the server says when it cannot register them, and keeps what was typed', async () => {
    registerAttendee.mockRejectedValue({ code: 'functions/failed-precondition', message: 'This event is full.' });
    const utils = await loaded();
    fill(utils);

    await act(async () => {
      fireEvent.press(utils.getByText('Register — R350'));
    });

    expect(Alert.alert).toHaveBeenLastCalledWith('Could Not Register', 'This event is full.');
    expect(utils.getByPlaceholderText(NAME_PLACEHOLDER).props.value).toBe('Alice Adams');
  });

  it('sends once when Register is tapped twice in the same instant', async () => {
    registerAttendee.mockResolvedValue({ success: true, requiresPayment: false });
    const utils = await loaded();
    fill(utils);

    // Both taps reach the same handler before React has re-rendered the button
    // as disabled — fireEvent flushes between presses, which would hide that —
    // so it is the handler itself that has to refuse the second.
    let button = utils.getByText('Register — R350');
    while (!button.props.onPress) button = button.parent;
    await act(async () => {
      button.props.onPress();
      button.props.onPress();
    });

    expect(registerAttendee).toHaveBeenCalledTimes(1);
  });

  describe('capacity', () => {
    it('stops before asking when the event is already full', async () => {
      getEventById.mockResolvedValue({ ...paidEvent, capacity: 10, attendeeCount: 10 });
      const utils = await loaded();
      fill(utils);

      await act(async () => {
        fireEvent.press(utils.getByText('Register — R350'));
      });

      expect(Alert.alert).toHaveBeenCalledWith('Event Full', 'This event has reached its capacity.');
      expect(registerAttendee).not.toHaveBeenCalled();
    });

    it('counts the people just registered from this screen', async () => {
      getEventById.mockResolvedValue({ ...paidEvent, capacity: 11, attendeeCount: 10 });
      const utils = await loaded();
      fill(utils);
      await act(async () => {
        fireEvent.press(utils.getByText('Register — R350'));
      });
      await pressAlertButton('Register Another');
      expect(utils.getByText('👥 11 / 11 registered')).toBeTruthy();

      fill(utils, 'Bob Brown', '');
      await act(async () => {
        fireEvent.press(utils.getByText('Register — R350'));
      });

      expect(Alert.alert).toHaveBeenLastCalledWith('Event Full', 'This event has reached its capacity.');
      expect(registerAttendee).toHaveBeenCalledTimes(1);
    });
  });

  describe('for an admin', () => {
    it('starts on their own congregation', async () => {
      const utils = await loaded({ user: admin });
      fill(utils);

      await act(async () => {
        fireEvent.press(utils.getByText('Register — R350'));
      });

      expect(registerAttendee).toHaveBeenCalledWith(
        paidEvent,
        expect.objectContaining({ congregation: 'Paarl', district: 'Boland' })
      );
    });

    it('can register for any congregation', async () => {
      const utils = await loaded({ user: admin });
      fill(utils);

      fireEvent.press(utils.getByText('Eastern Cape'));
      fireEvent.press(utils.getByText('Despatch'));
      await act(async () => {
        fireEvent.press(utils.getByText('Register — R350'));
      });

      expect(registerAttendee).toHaveBeenCalledWith(
        paidEvent,
        expect.objectContaining({ congregation: 'Despatch', district: 'Eastern Cape' })
      );
    });

    it('has to pick a congregation when changing district', async () => {
      const utils = await loaded({ user: admin });
      fill(utils);

      fireEvent.press(utils.getByText('Eastern Cape'));
      await act(async () => {
        fireEvent.press(utils.getByText('Register — R350'));
      });

      expect(Alert.alert).toHaveBeenCalledWith('Missing Info', 'Please choose the congregation they belong to.');
      expect(registerAttendee).not.toHaveBeenCalled();
    });

    it('has to choose one when their own profile has none', async () => {
      const utils = await loaded({ user: { ...admin, congregation: undefined, district: undefined } });
      fill(utils);

      await act(async () => {
        fireEvent.press(utils.getByText('Register — R350'));
      });

      expect(Alert.alert).toHaveBeenCalledWith('Missing Info', 'Please choose the congregation they belong to.');
    });
  });
});
