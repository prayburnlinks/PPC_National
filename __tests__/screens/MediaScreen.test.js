import React from 'react';
import { Linking, Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import MediaScreen from '../../screens/MediaScreen';
import { UserContext } from '../../context/UserContext';

jest.mock('../../services/firestoreService', () => ({
  getLiveStatus: jest.fn(),
}));

jest.mock('../../services/mediaService', () => ({
  getMediaLinks: jest.fn(),
  saveMediaLinks: jest.fn(),
  getFeaturedVideos: jest.fn(),
  addFeaturedVideo: jest.fn(),
  removeFeaturedVideo: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => require('react').useEffect(cb, [cb]),
}));

import { getLiveStatus } from '../../services/firestoreService';
import {
  getMediaLinks,
  saveMediaLinks,
  getFeaturedVideos,
  addFeaturedVideo,
  removeFeaturedVideo,
} from '../../services/mediaService';

const member = { uid: 'member-1', name: 'Member', role: 'member', status: 'approved' };
const admin = { uid: 'admin-1', name: 'Admin', role: 'admin', status: 'approved' };

// Fire the named choice on the most recent Alert.alert call.
const pressAlertButton = (alertSpy, label) => {
  const buttons = alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2];
  return buttons.find(b => b.text === label).onPress();
};

const renderScreen = async (user = member) => {
  const utils = render(
    <UserContext.Provider value={{ user, onLogin: jest.fn(), onLogout: jest.fn() }}>
      <MediaScreen navigation={{ navigate: jest.fn() }} />
    </UserContext.Provider>
  );
  await act(async () => {});
  return utils;
};

beforeEach(() => {
  jest.clearAllMocks();
  getLiveStatus.mockResolvedValue({ isLive: false, title: '' });
  getMediaLinks.mockResolvedValue({});
  getFeaturedVideos.mockResolvedValue([]);
  saveMediaLinks.mockResolvedValue({ success: true });
  addFeaturedVideo.mockResolvedValue({ success: true, id: 'new-id' });
  removeFeaturedVideo.mockResolvedValue({ success: true });
  jest.spyOn(Linking, 'openURL').mockResolvedValue();
});

describe('MediaScreen', () => {
  it('renders the platform cards and scripture board', async () => {
    const { getByText } = await renderScreen();

    expect(getByText('Watch & Follow')).toBeTruthy();
    expect(getByText('YouTube')).toBeTruthy();
    expect(getByText('Facebook')).toBeTruthy();
    expect(getByText('VERSE OF THE DAY')).toBeTruthy();
  });

  it('shows the LIVE badge and banner only when actually live', async () => {
    getLiveStatus.mockResolvedValue({ isLive: true, platform: 'youtube', title: 'Sunday Service' });
    const { getByText, getAllByText } = await renderScreen();

    await waitFor(() => expect(getByText('Sunday Service')).toBeTruthy());
    expect(getAllByText('LIVE').length).toBeGreaterThan(0);
  });

  it('opens the admin-set YouTube live link when the live banner is tapped', async () => {
    getLiveStatus.mockResolvedValue({ isLive: true, platform: 'youtube', title: 'Sunday Service' });
    getMediaLinks.mockResolvedValue({ youtubeLiveUrl: 'https://youtube.com/watch?v=custom' });
    const { getByText } = await renderScreen();

    await waitFor(() => expect(getByText('Sunday Service')).toBeTruthy());
    fireEvent.press(getByText('Sunday Service'));

    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('https://youtube.com/watch?v=custom'));
  });

  it('falls back to the default live link before an admin has ever set one', async () => {
    getLiveStatus.mockResolvedValue({ isLive: true, platform: 'facebook', title: 'Sunday Service' });
    const { getByText } = await renderScreen();

    await waitFor(() => expect(getByText('Sunday Service')).toBeTruthy());
    fireEvent.press(getByText('Sunday Service'));

    await waitFor(() =>
      expect(Linking.openURL).toHaveBeenCalledWith('https://www.facebook.com/PPCNationalChurch')
    );
  });

  it('renders a featured video with its assembly and district', async () => {
    getFeaturedVideos.mockResolvedValue([
      { id: 'v1', platform: 'youtube', url: 'https://y/1', assembly: 'Ebenezer Assembly', district: 'Southern Cape District' },
    ]);
    const { getByText } = await renderScreen();

    await waitFor(() => expect(getByText('Ebenezer Assembly')).toBeTruthy());
    expect(getByText('Southern Cape District')).toBeTruthy();
    expect(getByText('FEATURED')).toBeTruthy();

    fireEvent.press(getByText('Ebenezer Assembly'));
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('https://y/1'));
  });

  describe('editing', () => {
    it('is not offered to a member', async () => {
      const { queryByText } = await renderScreen();
      expect(queryByText('Edit')).toBeNull();
    });

    it('is not offered until the saved links have loaded', async () => {
      getMediaLinks.mockRejectedValue(new Error('offline'));
      const { queryByText } = await renderScreen(admin);
      expect(queryByText('Edit')).toBeNull();
    });

    it('lets an admin change the YouTube live link and save it', async () => {
      const { getByText, getByLabelText, queryByText } = await renderScreen(admin);

      fireEvent.press(getByText('Edit'));
      const input = getByLabelText('YouTube Live URL');
      fireEvent.changeText(input, 'https://youtube.com/watch?v=new-stream');
      fireEvent.press(getByText('Save'));

      await waitFor(() => expect(queryByText('Save')).toBeNull());
      expect(saveMediaLinks).toHaveBeenCalledWith(admin, { youtubeLiveUrl: 'https://youtube.com/watch?v=new-stream' });
    });

    it('does not write anything when nothing changed', async () => {
      getMediaLinks.mockResolvedValue({ youtubeLiveUrl: 'https://youtube.com/watch?v=existing' });
      const { getByText, getByLabelText, queryByText } = await renderScreen(admin);

      fireEvent.press(getByText('Edit'));
      fireEvent.changeText(getByLabelText('YouTube Live URL'), 'https://youtube.com/watch?v=existing');
      fireEvent.press(getByText('Save'));

      await waitFor(() => expect(queryByText('Save')).toBeNull());
      expect(saveMediaLinks).not.toHaveBeenCalled();
    });

    it('discards an unsaved link edit on Cancel', async () => {
      const { getByText, getByLabelText, queryByLabelText } = await renderScreen(admin);

      fireEvent.press(getByText('Edit'));
      fireEvent.changeText(getByLabelText('YouTube Live URL'), 'https://youtube.com/watch?v=discard-me');
      fireEvent.press(getByText('Cancel'));

      expect(queryByLabelText('YouTube Live URL')).toBeNull();
      expect(saveMediaLinks).not.toHaveBeenCalled();
    });

    it('reports the error and stays in edit mode when saving fails', async () => {
      saveMediaLinks.mockRejectedValue({ message: 'Missing or insufficient permissions.' });
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const { getByText, getByLabelText } = await renderScreen(admin);

      fireEvent.press(getByText('Edit'));
      fireEvent.changeText(getByLabelText('YouTube Live URL'), 'https://youtube.com/watch?v=new-stream');
      fireEvent.press(getByText('Save'));

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('Could not save', 'Missing or insufficient permissions.')
      );
      expect(getByText('Save')).toBeTruthy();
      alertSpy.mockRestore();
    });
  });

  describe('featured videos', () => {
    it('lets an admin add a video and see it appear', async () => {
      const { getByText, getByLabelText, queryByText } = await renderScreen(admin);

      fireEvent.press(getByText('Edit'));
      fireEvent.press(getByText('+ Add Featured Video'));
      fireEvent.changeText(getByLabelText('New featured video link'), 'https://y/new');
      fireEvent.changeText(getByLabelText('New featured video assembly'), 'Paarl Assembly');
      fireEvent.press(getByText('Add'));

      await waitFor(() => expect(queryByText('+ Add Featured Video')).toBeTruthy());
      expect(addFeaturedVideo).toHaveBeenCalledWith(admin, {
        platform: 'youtube', url: 'https://y/new', assembly: 'Paarl Assembly', district: '',
      });
      expect(getByText('Paarl Assembly')).toBeTruthy();
    });

    it('adds a Facebook video when that platform is selected', async () => {
      const { getByText, getByLabelText } = await renderScreen(admin);

      fireEvent.press(getByText('Edit'));
      fireEvent.press(getByText('+ Add Featured Video'));
      fireEvent.press(getByLabelText('Platform: Facebook'));
      fireEvent.changeText(getByLabelText('New featured video link'), 'https://f/new');
      fireEvent.press(getByText('Add'));

      await waitFor(() => expect(addFeaturedVideo).toHaveBeenCalled());
      expect(addFeaturedVideo).toHaveBeenCalledWith(admin, expect.objectContaining({ platform: 'facebook' }));
    });

    it('requires a link before adding', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const { getByText } = await renderScreen(admin);

      fireEvent.press(getByText('Edit'));
      fireEvent.press(getByText('+ Add Featured Video'));
      fireEvent.press(getByText('Add'));

      expect(alertSpy).toHaveBeenCalledWith('Missing Info', 'Please enter a video or reel link.');
      expect(addFeaturedVideo).not.toHaveBeenCalled();
      alertSpy.mockRestore();
    });

    it('lets an admin remove a video after confirming', async () => {
      getFeaturedVideos.mockResolvedValue([
        { id: 'v1', platform: 'youtube', url: 'https://y/1', assembly: 'Ebenezer Assembly' },
      ]);
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const { getByText, getByLabelText, queryByText } = await renderScreen(admin);

      await waitFor(() => expect(getByText('Ebenezer Assembly')).toBeTruthy());
      fireEvent.press(getByText('Edit'));
      fireEvent.press(getByLabelText('Remove Ebenezer Assembly video'));

      expect(alertSpy).toHaveBeenCalledWith(
        'Remove this video?',
        'This removes it from the Media tab for everyone.',
        expect.any(Array)
      );
      await act(async () => { await pressAlertButton(alertSpy, 'Remove'); });

      expect(removeFeaturedVideo).toHaveBeenCalledWith('v1');
      await waitFor(() => expect(queryByText('Ebenezer Assembly')).toBeNull());
      alertSpy.mockRestore();
    });

    it('is not offered to a member', async () => {
      getFeaturedVideos.mockResolvedValue([
        { id: 'v1', platform: 'youtube', url: 'https://y/1', assembly: 'Ebenezer Assembly' },
      ]);
      const { getByText, queryByText, queryByLabelText } = await renderScreen();

      await waitFor(() => expect(getByText('Ebenezer Assembly')).toBeTruthy());
      expect(queryByText('+ Add Featured Video')).toBeNull();
      expect(queryByLabelText('Remove Ebenezer Assembly video')).toBeNull();
    });
  });
});
