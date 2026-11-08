import React from 'react';
import { Alert } from 'react-native';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import MyAttendeesScreen from '../../screens/MyAttendeesScreen';
import { UserContext } from '../../context/UserContext';

jest.mock('../../services/eventRegistrationService', () => ({
  getAttendeesRegisteredBy: jest.fn(),
  submitEventRegistrationPayment: jest.fn(),
  cancelAttendee: jest.fn(),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}));

import * as DocumentPicker from 'expo-document-picker';
import {
  getAttendeesRegisteredBy,
  submitEventRegistrationPayment,
  cancelAttendee,
} from '../../services/eventRegistrationService';

const leader = { uid: 'leader-1', name: 'Lena Leader', role: 'leader', congregation: 'Ceres', district: 'Boland' };

const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

const attendee = (overrides) => ({
  id: 'reg-1',
  userId: null,
  userName: 'Alice Adams',
  attendeePhone: '082 123 4567',
  onBehalf: true,
  registeredBy: 'leader-1',
  congregation: 'Ceres',
  eventId: 'evt-1',
  eventName: 'National Convention',
  eventDate: future,
  registrationFee: 350,
  paymentReference: 'CONV26',
  requiresPayment: true,
  status: 'awaiting_payment',
  ...overrides,
});

const renderScreen = () => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  const utils = render(
    <UserContext.Provider value={{ user: leader, onLogin: jest.fn(), onLogout: jest.fn() }}>
      <MyAttendeesScreen navigation={navigation} />
    </UserContext.Provider>
  );
  return { ...utils, navigation };
};

const lastAlert = () => Alert.alert.mock.calls[Alert.alert.mock.calls.length - 1];

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  getAttendeesRegisteredBy.mockResolvedValue([attendee()]);
});

describe('MyAttendeesScreen', () => {
  it('looks up the people this leader registered', async () => {
    const { getByText } = renderScreen();

    await waitFor(() => getByText('Alice Adams'));
    expect(getAttendeesRegisteredBy).toHaveBeenCalledWith(leader);
  });

  it('goes back from the header', async () => {
    const { getByText, navigation } = renderScreen();
    await waitFor(() => getByText('Alice Adams'));

    fireEvent.press(getByText('←'));

    expect(navigation.goBack).toHaveBeenCalled();
  });

  describe('when nobody has been registered', () => {
    beforeEach(() => getAttendeesRegisteredBy.mockResolvedValue([]));

    it('explains what will appear here, and offers the events', async () => {
      const { getByText, navigation } = renderScreen();

      await waitFor(() => getByText('Nobody Yet'));
      fireEvent.press(getByText('Browse Events'));

      expect(navigation.navigate).toHaveBeenCalledWith('Events');
    });
  });

  it('shows each person with their event, phone and status', async () => {
    getAttendeesRegisteredBy.mockResolvedValue([
      attendee(),
      attendee({ id: 'reg-2', userName: 'Bob Brown', attendeePhone: null, status: 'confirmed', requiresPayment: false }),
    ]);
    const { getByText, getAllByText } = renderScreen();

    await waitFor(() => getByText('Alice Adams'));
    expect(getByText('📞 082 123 4567')).toBeTruthy();
    expect(getAllByText('National Convention')).toHaveLength(2);
    expect(getByText('Awaiting Payment')).toBeTruthy();
    expect(getByText('Bob Brown')).toBeTruthy();
    expect(getByText('Registered')).toBeTruthy();
  });

  it('offers to register someone else', async () => {
    const { getByText, navigation } = renderScreen();
    await waitFor(() => getByText('Alice Adams'));

    fireEvent.press(getByText('+ Register Someone'));

    expect(navigation.navigate).toHaveBeenCalledWith('Events');
  });

  describe('what can be done with each person', () => {
    const only = async (overrides) => {
      getAttendeesRegisteredBy.mockResolvedValue([attendee(overrides)]);
      const utils = renderScreen();
      await waitFor(() => utils.getByText('Alice Adams'));
      return utils;
    };

    it('awaiting payment: how to pay under their name, upload proof, or cancel', async () => {
      const { getByText } = await only({});

      expect(getByText(/R350 · .* · Ref: Alice Adams · CONV26/)).toBeTruthy();
      expect(getByText('Upload Proof of Payment')).toBeTruthy();
      expect(getByText('Cancel Registration')).toBeTruthy();
    });

    it('payment rejected: the reason, and resubmit or cancel', async () => {
      const { getByText } = await only({ status: 'rejected', rejectionReason: 'Reference did not match' });

      expect(getByText('Payment Rejected')).toBeTruthy();
      expect(getByText('Reference did not match')).toBeTruthy();
      expect(getByText('Resubmit Proof of Payment')).toBeTruthy();
      expect(getByText('Cancel Registration')).toBeTruthy();
    });

    it('under review: nothing to do, and who reviews it', async () => {
      const { getByText, queryByText } = await only({ status: 'payment_submitted' });

      expect(getByText('Under Review')).toBeTruthy();
      expect(getByText('Another leader or an admin reviews payments you submit.')).toBeTruthy();
      expect(queryByText('Upload Proof of Payment')).toBeNull();
      expect(queryByText('Cancel Registration')).toBeNull();
    });

    it('approved: nothing to do — it is paid for', async () => {
      const { getByText, queryByText } = await only({ status: 'approved' });

      expect(getByText('Registered & Paid')).toBeTruthy();
      expect(queryByText('Upload Proof of Payment')).toBeNull();
      expect(queryByText('Cancel Registration')).toBeNull();
    });

    it('free event: cancel, but no payment to make', async () => {
      const { getByText, queryByText } = await only({ status: 'confirmed', requiresPayment: false });

      expect(getByText('Cancel Registration')).toBeTruthy();
      expect(queryByText('Upload Proof of Payment')).toBeNull();
    });
  });

  describe('uploading proof of payment', () => {
    const asset = { uri: 'file:///proof.jpg', name: 'proof.jpg', mimeType: 'image/jpeg' };

    it('sends it for that person’s registration, then refreshes', async () => {
      DocumentPicker.getDocumentAsync.mockResolvedValue({ canceled: false, assets: [asset] });
      submitEventRegistrationPayment.mockResolvedValue({ success: true });
      const { getByText } = renderScreen();
      await waitFor(() => getByText('Upload Proof of Payment'));

      await act(async () => {
        fireEvent.press(getByText('Upload Proof of Payment'));
      });

      await waitFor(() => {
        expect(submitEventRegistrationPayment).toHaveBeenCalledWith('reg-1', leader, asset);
      });
      expect(getAttendeesRegisteredBy).toHaveBeenCalledTimes(2);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Submitted',
        "Alice Adams's proof of payment has been submitted and is awaiting review."
      );
    });

    it('does nothing when no file is chosen', async () => {
      DocumentPicker.getDocumentAsync.mockResolvedValue({ canceled: true });
      const { getByText } = renderScreen();
      await waitFor(() => getByText('Upload Proof of Payment'));

      await act(async () => {
        fireEvent.press(getByText('Upload Proof of Payment'));
      });

      expect(submitEventRegistrationPayment).not.toHaveBeenCalled();
    });

    it('says when the upload fails', async () => {
      DocumentPicker.getDocumentAsync.mockResolvedValue({ canceled: false, assets: [asset] });
      submitEventRegistrationPayment.mockRejectedValue({ message: 'Failed to upload file. Please try again.' });
      const { getByText } = renderScreen();
      await waitFor(() => getByText('Upload Proof of Payment'));

      await act(async () => {
        fireEvent.press(getByText('Upload Proof of Payment'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Upload Failed', 'Failed to upload file. Please try again.');
      });
    });
  });

  describe('cancelling', () => {
    const confirmCancel = async () => {
      const button = lastAlert()[2].find((b) => b.text === 'Cancel Registration');
      await act(async () => {
        await button.onPress();
      });
    };

    it('asks first, saying what it does', async () => {
      const { getByText } = renderScreen();
      await waitFor(() => getByText('Cancel Registration'));

      fireEvent.press(getByText('Cancel Registration'));

      const [title, message, buttons] = lastAlert();
      expect(title).toBe('Cancel Registration?');
      expect(message).toBe('This removes Alice Adams from National Convention and gives their place back.');
      expect(buttons.map((b) => b.text)).toEqual(['Keep', 'Cancel Registration']);
      expect(cancelAttendee).not.toHaveBeenCalled();
    });

    it('takes them off the list once confirmed', async () => {
      cancelAttendee.mockResolvedValue({ success: true });
      const { getByText, queryByText } = renderScreen();
      await waitFor(() => getByText('Cancel Registration'));
      fireEvent.press(getByText('Cancel Registration'));

      await confirmCancel();

      expect(cancelAttendee).toHaveBeenCalledWith('reg-1');
      await waitFor(() => expect(queryByText('Alice Adams')).toBeNull());
    });

    it('keeps them on the list, and says why, when it cannot be cancelled', async () => {
      cancelAttendee.mockRejectedValue({ message: "A payment has already been submitted for this registration, so it can't be cancelled here." });
      const { getByText } = renderScreen();
      await waitFor(() => getByText('Cancel Registration'));
      fireEvent.press(getByText('Cancel Registration'));

      await confirmCancel();

      expect(Alert.alert).toHaveBeenLastCalledWith(
        'Could Not Cancel',
        "A payment has already been submitted for this registration, so it can't be cancelled here."
      );
      expect(getByText('Alice Adams')).toBeTruthy();
    });
  });
});
