import React from 'react';
import { Alert } from 'react-native';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import AdminEventsScreen from '../../screens/AdminEventsScreen';
import { UserContext } from '../../context/UserContext';

jest.mock('../../services/firestoreService', () => ({
  getAllEventsForAdmin: jest.fn(),
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
}));

jest.mock('../../services/eventRegistrationService', () => ({
  getEventRegistrationCount: jest.fn(),
}));

import { getAllEventsForAdmin, createEvent, updateEvent, deleteEvent } from '../../services/firestoreService';
import { getEventRegistrationCount } from '../../services/eventRegistrationService';

const adminUser = { uid: 'admin-1', name: 'Nadia', role: 'admin' };

const mockEvent = {
  id: 'event-1',
  name: 'National Sisters Conference',
  venue: 'Cape Town City Hall',
  category: 'Women',
  eventDate: new Date('2026-07-12T08:00:00'),
};

const renderScreen = () => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  return render(
    <UserContext.Provider value={{ user: adminUser, onLogin: jest.fn(), onLogout: jest.fn() }}>
      <AdminEventsScreen navigation={navigation} />
    </UserContext.Provider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  getAllEventsForAdmin.mockResolvedValue([mockEvent]);
  getEventRegistrationCount.mockResolvedValue(0);
});

describe('AdminEventsScreen', () => {
  it('lists existing events', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => getByText('National Sisters Conference'));
    expect(getByText('Cape Town City Hall')).toBeTruthy();
  });

  it('creates a new event from the Add Event form', async () => {
    createEvent.mockResolvedValue({ success: true, eventId: 'event-new' });

    const { getByText, getByPlaceholderText } = renderScreen();
    await waitFor(() => getByText('+ Add Event'));
    fireEvent.press(getByText('+ Add Event'));

    fireEvent.changeText(getByPlaceholderText('e.g. National Youth Rally'), 'Youth Rally');
    fireEvent.changeText(getByPlaceholderText('e.g. Cape Town City Hall'), 'Durban City Hall');
    fireEvent.changeText(getByPlaceholderText('YYYY-MM-DD or YYYY-MM-DD HH:MM'), '2026-08-01');
    fireEvent.press(getByText('Youth'));
    fireEvent.press(getByText('Save Event'));

    await waitFor(() => {
      expect(createEvent).toHaveBeenCalledWith(
        adminUser,
        expect.objectContaining({
          name: 'Youth Rally',
          venue: 'Durban City Hall',
          category: 'Youth',
          requiresPayment: false,
        })
      );
    });
    // Back on the list after saving
    await waitFor(() => getByText('+ Add Event'));
  });

  it('blocks saving without a valid event date', async () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    await waitFor(() => getByText('+ Add Event'));
    fireEvent.press(getByText('+ Add Event'));

    fireEvent.changeText(getByPlaceholderText('e.g. National Youth Rally'), 'Youth Rally');
    fireEvent.changeText(getByPlaceholderText('e.g. Cape Town City Hall'), 'Durban City Hall');
    fireEvent.press(getByText('Save Event'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Invalid Date',
      'Please enter the event date as YYYY-MM-DD or YYYY-MM-DD HH:MM.'
    );
    expect(createEvent).not.toHaveBeenCalled();
  });

  it('requires a registration fee when payment is required', async () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    await waitFor(() => getByText('+ Add Event'));
    fireEvent.press(getByText('+ Add Event'));

    fireEvent.changeText(getByPlaceholderText('e.g. National Youth Rally'), 'Sisters Conference');
    fireEvent.changeText(getByPlaceholderText('e.g. Cape Town City Hall'), 'Cape Town City Hall');
    fireEvent.changeText(getByPlaceholderText('YYYY-MM-DD or YYYY-MM-DD HH:MM'), '2026-09-01');
    fireEvent.press(getByText('Requires Payment'));
    fireEvent.press(getByText('Save Event'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Missing Info',
      'Please enter a registration fee, or turn off "Requires Payment".'
    );
    expect(createEvent).not.toHaveBeenCalled();
  });

  it('opens the edit form pre-filled and saves changes', async () => {
    updateEvent.mockResolvedValue({ success: true });

    const { getByText, getByDisplayValue } = renderScreen();
    await waitFor(() => getByText('Edit'));
    fireEvent.press(getByText('Edit'));

    await waitFor(() => getByDisplayValue('National Sisters Conference'));
    expect(getByDisplayValue('Cape Town City Hall')).toBeTruthy();
    expect(getByDisplayValue('2026-07-12 08:00')).toBeTruthy();

    fireEvent.changeText(getByDisplayValue('Cape Town City Hall'), 'Durban City Hall');
    fireEvent.press(getByText('Save Changes'));

    await waitFor(() => {
      expect(updateEvent).toHaveBeenCalledWith(
        'event-1',
        expect.objectContaining({ name: 'National Sisters Conference', venue: 'Durban City Hall' })
      );
    });
    await waitFor(() => getByText('+ Add Event'));
  });

  it('warns about existing registrations before deleting, then removes the event', async () => {
    getEventRegistrationCount.mockResolvedValue(3);
    deleteEvent.mockResolvedValue({ success: true });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      const deleteButton = buttons?.find((b) => b.text === 'Delete');
      if (deleteButton) deleteButton.onPress();
    });

    const { getByText, queryByText } = renderScreen();
    await waitFor(() => getByText('Delete'));

    await act(async () => {
      fireEvent.press(getByText('Delete'));
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Delete Event?',
        expect.stringContaining('3 people are registered'),
        expect.anything()
      );
      expect(deleteEvent).toHaveBeenCalledWith('event-1');
      expect(queryByText('National Sisters Conference')).toBeNull();
    });
  });
});
