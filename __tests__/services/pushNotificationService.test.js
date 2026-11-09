import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setDoc, deleteDoc } from 'firebase/firestore';
import {
  configureNotificationHandling,
  registerForPushNotifications,
  unregisterPushToken,
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
  it('shows notifications that arrive while the app is open', async () => {
    configureNotificationHandling();

    const { handleNotification } = Notifications.setNotificationHandler.mock.calls[0][0];
    await expect(handleNotification()).resolves.toEqual({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    });
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
