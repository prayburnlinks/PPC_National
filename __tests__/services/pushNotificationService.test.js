import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setDoc, deleteDoc } from 'firebase/firestore';
import {
  configureNotificationHandling,
  registerForPushNotifications,
  unregisterPushToken,
  setAppIconBadge,
} from '../../services/pushNotificationService';

let mockIsDevice = true;

jest.mock('expo-device', () => ({
  __esModule: true,
  get isDevice() { return mockIsDevice; },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'project-123' } } } },
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  AndroidImportance: { HIGH: 4 },
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((db, ...segments) => ({ path: segments.join('/') })),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
}));

const TOKEN = 'ExponentPushToken[abc123]';

let platformOverride;

const setPlatform = (os) => {
  platformOverride = jest.replaceProperty(Platform, 'OS', os);
};

beforeEach(async () => {
  jest.clearAllMocks();
  mockIsDevice = true;
  await AsyncStorage.clear();
  Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted', canAskAgain: true });
  Notifications.getExpoPushTokenAsync.mockResolvedValue({ data: TOKEN });
  setDoc.mockResolvedValue();
  deleteDoc.mockResolvedValue();
});

afterEach(() => {
  platformOverride?.restore();
  platformOverride = undefined;
  jest.useRealTimers();
});

describe('configureNotificationHandling', () => {
  it('keeps notifications that arrive while the app is open, but leaves the banner to the in-app toast', async () => {
    configureNotificationHandling();

    const { handleNotification } = Notifications.setNotificationHandler.mock.calls[0][0];
    await expect(handleNotification()).resolves.toEqual({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    });
  });
});

describe('setAppIconBadge', () => {
  it('puts the count on the app icon', async () => {
    Notifications.setBadgeCountAsync.mockResolvedValue(true);

    await expect(setAppIconBadge(4)).resolves.toBe(true);

    expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(4);
  });

  it('clears the icon at 0, and never goes negative or fractional', async () => {
    Notifications.setBadgeCountAsync.mockResolvedValue(true);

    await setAppIconBadge(0);
    await setAppIconBadge(-3);
    await setAppIconBadge(2.9);

    expect(Notifications.setBadgeCountAsync.mock.calls).toEqual([[0], [0], [2]]);
  });

  it('resolves false when the phone will not show a badge (no permission, or no launcher support)', async () => {
    Notifications.setBadgeCountAsync.mockResolvedValue(false);
    await expect(setAppIconBadge(3)).resolves.toBe(false);
  });

  it('never throws, so a badge problem cannot break the app', async () => {
    Notifications.setBadgeCountAsync.mockRejectedValue(new Error('native module missing'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(setAppIconBadge(3)).resolves.toBe(false);

    console.error.mockRestore();
  });

  it('skips the web build', async () => {
    setPlatform('web');

    await expect(setAppIconBadge(3)).resolves.toBe(false);

    expect(Notifications.setBadgeCountAsync).not.toHaveBeenCalled();
  });
});

describe('registerForPushNotifications', () => {
  it('saves the device token against the member and remembers it locally', async () => {
    setPlatform('ios');

    const token = await registerForPushNotifications('uid-1');

    expect(token).toBe(TOKEN);
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'project-123' });
    expect(setDoc).toHaveBeenCalledWith(
      { path: `pushTokens/${TOKEN}` },
      { userId: 'uid-1', platform: 'ios', updatedAt: 'SERVER_TIMESTAMP' }
    );
    expect(await AsyncStorage.getItem('pushToken')).toBe(TOKEN);
  });

  it('asks for permission when it has not been decided yet', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined', canAskAgain: true });
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });

    const token = await registerForPushNotifications('uid-1');

    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    expect(token).toBe(TOKEN);
  });

  it('returns null and saves nothing when the member declines the prompt', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined', canAskAgain: true });
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });

    expect(await registerForPushNotifications('uid-1')).toBeNull();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('does not ask again once permission has been refused for good', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'denied', canAskAgain: false });

    expect(await registerForPushNotifications('uid-1')).toBeNull();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('creates the Android channel before asking for permission', async () => {
    setPlatform('android');
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined', canAskAgain: true });
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });

    await registerForPushNotifications('uid-1');

    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('default', {
      name: 'General',
      importance: 4,
    });
    expect(Notifications.setNotificationChannelAsync.mock.invocationCallOrder[0]).toBeLessThan(
      Notifications.requestPermissionsAsync.mock.invocationCallOrder[0]
    );
    expect(setDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ platform: 'android' }));
  });

  it('skips simulators, which cannot receive push', async () => {
    mockIsDevice = false;

    expect(await registerForPushNotifications('uid-1')).toBeNull();
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
  });

  it('skips the web build', async () => {
    setPlatform('web');

    expect(await registerForPushNotifications('uid-1')).toBeNull();
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
  });

  it('skips when there is no signed-in member', async () => {
    expect(await registerForPushNotifications(undefined)).toBeNull();
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
  });

  it('returns null instead of throwing when no token can be fetched', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    Notifications.getExpoPushTokenAsync.mockRejectedValue(new Error('Default FirebaseApp is not initialized'));

    await expect(registerForPushNotifications('uid-1')).resolves.toBeNull();
    expect(setDoc).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe('unregisterPushToken', () => {
  it('removes the stored token from Firestore and forgets it', async () => {
    await AsyncStorage.setItem('pushToken', TOKEN);

    await unregisterPushToken();

    expect(deleteDoc).toHaveBeenCalledWith({ path: `pushTokens/${TOKEN}` });
    expect(await AsyncStorage.getItem('pushToken')).toBeNull();
  });

  it('does nothing when this install never registered', async () => {
    await unregisterPushToken();

    expect(deleteDoc).not.toHaveBeenCalled();
  });

  it('gives up after a few seconds so sign-out cannot hang offline', async () => {
    jest.useFakeTimers();
    await AsyncStorage.setItem('pushToken', TOKEN);
    deleteDoc.mockReturnValue(new Promise(() => {}));

    const pending = unregisterPushToken();
    await jest.advanceTimersByTimeAsync(4000);
    await pending;

    expect(await AsyncStorage.getItem('pushToken')).toBeNull();
  });

  it('never throws, so a failure cannot block sign-out', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    await AsyncStorage.setItem('pushToken', TOKEN);
    deleteDoc.mockRejectedValue(new Error('permission-denied'));

    await expect(unregisterPushToken()).resolves.toBeUndefined();
    consoleError.mockRestore();
  });
});
