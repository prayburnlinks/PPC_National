/**
 * Push Notification Service
 * Registers this device for push, and removes it again at sign-out.
 *
 * Delivery itself happens server-side: sendPushOnNotification in
 * functions/index.js pushes every document added to a member's notifications
 * feed to the devices registered here.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase-config';

// Must match channelId in functions/push.js.
const ANDROID_CHANNEL_ID = 'default';

// The token this install last registered, so sign-out can remove it without
// another round trip to Expo.
const TOKEN_STORAGE_KEY = 'pushToken';

// Sign-out must not hang on a delete that can't reach Firestore.
const UNREGISTER_TIMEOUT_MS = 4000;

/**
 * Handle notifications that arrive while the app is open. They are kept in the
 * notification list and still play the sound, but the on-screen banner is left
 * to the app's own toast (components/NotificationToast.js), which the live
 * notification feed raises at the same moment. Showing both would put two
 * banners on screen for one notification. Call once at startup.
 */
export const configureNotificationHandling = () => {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
};

/**
 * Put the member's unread count on the app icon (0 clears it). Resolves to
 * whether it took: iOS only allows it once notification permission has been
 * granted, and some Android launchers have no icon badges. Never throws; an
 * icon badge is a nicety.
 */
export const setAppIconBadge = async (count) => {
  if (Platform.OS === 'web') return false;
  try {
    return await Notifications.setBadgeCountAsync(Math.max(0, Math.floor(count) || 0));
  } catch (error) {
    console.error('Set app icon badge error:', error);
    return false;
  }
};

/**
 * Ask for permission (once), get this device's Expo push token and record it
 * against the member. Returns the token, or null when push isn't available:
 * simulator, permission refused, or the build has no FCM/APNs credentials.
 * Never throws — registration is a background nicety, not part of sign-in.
 */
export const registerForPushNotifications = async (uid) => {
  if (Platform.OS === 'web' || !Device.isDevice || !uid) return null;

  try {
    if (Platform.OS === 'android') {
      // Android 13+ only shows the permission prompt once a channel exists.
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'General',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    let { status, canAskAgain } = await Notifications.getPermissionsAsync();
    // Once refused, don't nag on every launch — they can switch it on in Settings.
    if (status !== 'granted' && canAskAgain) {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    // Keyed by token: signing in on a handset someone else used simply takes
    // the token over (see the pushTokens rule in firestore.rules).
    await setDoc(doc(db, 'pushTokens', token), {
      userId: uid,
      platform: Platform.OS,
      updatedAt: serverTimestamp(),
    });
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);

    return token;
  } catch (error) {
    console.error('Push registration error:', error);
    return null;
  }
};

/**
 * Stop this device receiving the signed-in member's notifications. Has to run
 * before signOut, while the delete is still allowed.
 */
export const unregisterPushToken = async () => {
  if (Platform.OS === 'web') return;

  let timer;
  try {
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) return;

    await Promise.race([
      deleteDoc(doc(db, 'pushTokens', token)),
      new Promise((resolve) => { timer = setTimeout(resolve, UNREGISTER_TIMEOUT_MS); }),
    ]);
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.error('Push unregister error:', error);
  } finally {
    clearTimeout(timer);
  }
};

export default {
  configureNotificationHandling,
  registerForPushNotifications,
  unregisterPushToken,
};
