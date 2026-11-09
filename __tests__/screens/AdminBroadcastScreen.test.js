import React from 'react';
import { Alert } from 'react-native';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import AdminBroadcastScreen from '../../screens/AdminBroadcastScreen';

jest.mock('../../services/broadcastService', () => ({
  TITLE_MAX: 65,
  BODY_MAX: 300,
  sendBroadcast: jest.fn(),
  getAudienceCount: jest.fn(),
  getRecentBroadcasts: jest.fn(),
}));

import { sendBroadcast, getAudienceCount, getRecentBroadcasts } from '../../services/broadcastService';

const TITLE_PLACEHOLDER = 'e.g. National Convention registration is open';
const BODY_PLACEHOLDER = 'What do members need to know?';

const renderScreen = () => {
  const navigation = { goBack: jest.fn() };
  return { navigation, ...render(<AdminBroadcastScreen navigation={navigation} />) };
};

const fillMessage = ({ getByPlaceholderText }, title = 'Convention', body = 'Registration is open.') => {
  fireEvent.changeText(getByPlaceholderText(TITLE_PLACEHOLDER), title);
  fireEvent.changeText(getByPlaceholderText(BODY_PLACEHOLDER), body);
};

// Presses "Send" in the confirmation dialog the screen raised.
const confirmSend = async () => {
  const buttons = Alert.alert.mock.calls[0][2];
  await act(async () => {
    await buttons.find((button) => button.text === 'Send').onPress();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  getRecentBroadcasts.mockResolvedValue([]);
  getAudienceCount.mockResolvedValue(42);
});

describe('AdminBroadcastScreen', () => {
  it('goes back from the header', async () => {
    const { getByText, navigation } = renderScreen();
    await waitFor(() => getByText('Nothing sent yet.'));

    fireEvent.press(getByText('←'));

    expect(navigation.goBack).toHaveBeenCalled();
  });

  describe('recent announcements', () => {
    it('lists them with who they went to and how they went', async () => {
      getRecentBroadcasts.mockResolvedValue([
        {
          id: 'b-1', title: 'Convention', audience: { type: 'district', value: 'Eden' },
          sentAt: new Date('2026-11-08T10:00:00'), status: 'sent', recipients: 12, devices: 9,
        },
        { id: 'b-2', title: 'Stuck', audience: { type: 'all' }, sentAt: null, status: 'sending' },
        { id: 'b-3', title: 'Broken', audience: { type: 'congregation', value: 'Paarl' }, sentAt: null, status: 'failed' },
      ]);

      const { getByText } = renderScreen();

      await waitFor(() => getByText('Convention'));
      expect(getByText(/Eden district/)).toBeTruthy();
      expect(getByText('12 members · 9 devices pushed')).toBeTruthy();
      expect(getByText('Sending…')).toBeTruthy();
      expect(getByText(/Paarl/)).toBeTruthy();
      expect(getByText('Failed — may not have reached everyone')).toBeTruthy();
    });

    it('says so when nothing has been sent', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => getByText('Nothing sent yet.'));
    });
  });

  describe('choosing who to send to', () => {
    it('counts the members an everyone announcement reaches', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => getByText('Reaches 42 members.'));
      expect(getAudienceCount).toHaveBeenCalledWith({ type: 'all' });
    });

    it('asks for a district, and counts it once one is chosen', async () => {
      const { getByText } = renderScreen();

      fireEvent.press(getByText('A District'));
      expect(getByText('Choose a district.')).toBeTruthy();

      fireEvent.press(getByText('Boland'));

      await waitFor(() => expect(getAudienceCount).toHaveBeenCalledWith({ type: 'district', value: 'Boland' }));
      await waitFor(() => getByText('Reaches 42 members.'));
    });

    it('lists only the chosen district\'s congregations', async () => {
      const { getByText, queryByText } = renderScreen();

      fireEvent.press(getByText('A Congregation'));
      expect(getByText('Choose a district, then a congregation.')).toBeTruthy();
      expect(queryByText('Ceres')).toBeNull();

      fireEvent.press(getByText('Boland'));
      expect(getByText('Ceres')).toBeTruthy();
      expect(queryByText('Despatch')).toBeNull();

      fireEvent.press(getByText('Ceres'));
      await waitFor(() =>
        expect(getAudienceCount).toHaveBeenCalledWith({ type: 'congregation', value: 'Ceres' })
      );
    });

    it('forgets the congregation when the district changes', async () => {
      const { getByText } = renderScreen();
      fireEvent.press(getByText('A Congregation'));
      fireEvent.press(getByText('Boland'));
      fireEvent.press(getByText('Ceres'));
      await waitFor(() => getByText('Reaches 42 members.'));

      fireEvent.press(getByText('Eastern Cape'));

      expect(getByText('Choose a district, then a congregation.')).toBeTruthy();
    });

    it('warns when nobody matches, and will not send', async () => {
      getAudienceCount.mockResolvedValue(0);
      const utils = renderScreen();
      fillMessage(utils);

      await waitFor(() => utils.getByText('No approved members match this audience.'));
      fireEvent.press(utils.getByText('Send Announcement'));

      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('still lets the admin send when the count is unavailable', async () => {
      getAudienceCount.mockResolvedValue(null);
      const utils = renderScreen();
      fillMessage(utils);
      await waitFor(() => expect(getAudienceCount).toHaveBeenCalled());

      fireEvent.press(utils.getByText('Send Announcement'));

      // No count to quote in the confirmation.
      expect(Alert.alert.mock.calls[0][1]).not.toMatch(/member/);
    });
  });

  describe('sending', () => {
    it('will not send without both a title and a message', async () => {
      const utils = renderScreen();
      await waitFor(() => utils.getByText('Reaches 42 members.'));

      fireEvent.press(utils.getByText('Send Announcement'));
      fireEvent.changeText(utils.getByPlaceholderText(TITLE_PLACEHOLDER), 'Convention');
      fireEvent.press(utils.getByText('Send Announcement'));

      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('will not send to a district until one is chosen', async () => {
      const utils = renderScreen();
      fillMessage(utils);
      fireEvent.press(utils.getByText('A District'));

      fireEvent.press(utils.getByText('Send Announcement'));

      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('asks for confirmation, naming the audience and how many it reaches', async () => {
      const utils = renderScreen();
      fillMessage(utils, '  Convention  ');
      fireEvent.press(utils.getByText('A District'));
      fireEvent.press(utils.getByText('Boland'));
      await waitFor(() => utils.getByText('Reaches 42 members.'));

      fireEvent.press(utils.getByText('Send Announcement'));

      const [title, message, buttons] = Alert.alert.mock.calls[0];
      expect(title).toBe('Send Announcement?');
      expect(message).toContain('"Convention"');
      expect(message).toContain('everyone in the Boland district (42 members)');
      expect(buttons.map((button) => button.text)).toEqual(['Cancel', 'Send']);
      expect(sendBroadcast).not.toHaveBeenCalled();
    });

    it('sends the trimmed announcement once confirmed, then clears the form', async () => {
      sendBroadcast.mockResolvedValue({ success: true, recipients: 42, devices: 30, failed: 2, pushFailed: false });
      const utils = renderScreen();
      fillMessage(utils, ' Convention ', ' Registration is open. ');
      await waitFor(() => utils.getByText('Reaches 42 members.'));
      fireEvent.press(utils.getByText('Send Announcement'));

      await confirmSend();

      expect(sendBroadcast).toHaveBeenCalledWith({
        title: 'Convention',
        body: 'Registration is open.',
        audience: { type: 'all' },
      });
      expect(Alert.alert).toHaveBeenLastCalledWith(
        'Announcement Sent',
        "Sent to 42 members. Pushed to 30 devices. 2 devices couldn't be reached."
      );
      expect(utils.getByPlaceholderText(TITLE_PLACEHOLDER).props.value).toBe('');
      expect(utils.getByPlaceholderText(BODY_PLACEHOLDER).props.value).toBe('');
      // The history is refreshed to include it.
      expect(getRecentBroadcasts).toHaveBeenCalledTimes(2);
    });

    it('sends to the chosen congregation', async () => {
      sendBroadcast.mockResolvedValue({ success: true, recipients: 3, devices: 3, failed: 0, pushFailed: false });
      const utils = renderScreen();
      fillMessage(utils);
      fireEvent.press(utils.getByText('A Congregation'));
      fireEvent.press(utils.getByText('Boland'));
      fireEvent.press(utils.getByText('Ceres'));
      await waitFor(() => utils.getByText('Reaches 42 members.'));
      fireEvent.press(utils.getByText('Send Announcement'));

      await confirmSend();

      expect(sendBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({ audience: { type: 'congregation', value: 'Ceres' } })
      );
    });

    it('does nothing when the admin cancels', async () => {
      const utils = renderScreen();
      fillMessage(utils);
      await waitFor(() => utils.getByText('Reaches 42 members.'));
      fireEvent.press(utils.getByText('Send Announcement'));

      // Cancel has no handler: the dialog simply closes.
      const cancel = Alert.alert.mock.calls[0][2].find((button) => button.text === 'Cancel');

      expect(cancel.onPress).toBeUndefined();
      expect(sendBroadcast).not.toHaveBeenCalled();
    });

    it('cannot be sent twice while it is in flight', async () => {
      sendBroadcast.mockReturnValue(new Promise(() => {}));
      const utils = renderScreen();
      fillMessage(utils);
      await waitFor(() => utils.getByText('Reaches 42 members.'));
      fireEvent.press(utils.getByText('Send Announcement'));

      // Not awaited: the send never finishes, which is the point.
      const buttons = Alert.alert.mock.calls[0][2];
      await act(async () => {
        buttons.find((button) => button.text === 'Send').onPress();
      });

      // The button shows a spinner instead of its label.
      expect(utils.queryByText('Send Announcement')).toBeNull();
      expect(sendBroadcast).toHaveBeenCalledTimes(1);
    });

    it('keeps the draft and says what went wrong when sending fails', async () => {
      sendBroadcast.mockRejectedValue({ message: 'Only administrators can send announcements.' });
      const utils = renderScreen();
      fillMessage(utils);
      await waitFor(() => utils.getByText('Reaches 42 members.'));
      fireEvent.press(utils.getByText('Send Announcement'));

      await confirmSend();

      expect(Alert.alert).toHaveBeenLastCalledWith('Error', 'Only administrators can send announcements.');
      expect(utils.getByPlaceholderText(TITLE_PLACEHOLDER).props.value).toBe('Convention');
      // It may have been recorded before it failed, so the history is checked.
      expect(getRecentBroadcasts).toHaveBeenCalledTimes(2);
    });

    it.each([
      [
        'nobody has push switched on',
        { recipients: 1, devices: 0, failed: 0, pushFailed: false },
        'Sent to 1 member. None of them have push notifications switched on yet, but the announcement is in their notifications.',
      ],
      [
        'the push could not be delivered',
        { recipients: 5, devices: 0, failed: 0, pushFailed: true },
        "Sent to 5 members. Push notifications couldn't be delivered right now, but the announcement is in their notifications.",
      ],
      [
        'one device was reached',
        { recipients: 5, devices: 1, failed: 0, pushFailed: false },
        'Sent to 5 members. Pushed to 1 device.',
      ],
    ])('explains the outcome when %s', async (label, result, expected) => {
      sendBroadcast.mockResolvedValue({ success: true, ...result });
      const utils = renderScreen();
      fillMessage(utils);
      await waitFor(() => utils.getByText('Reaches 42 members.'));
      fireEvent.press(utils.getByText('Send Announcement'));

      await confirmSend();

      expect(Alert.alert).toHaveBeenLastCalledWith('Announcement Sent', expected);
    });
  });
});
