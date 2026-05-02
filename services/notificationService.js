/**
 * Notification Service
 * Handles Firebase Cloud Messaging and push notifications
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { db } from '../firebase-config';
import { doc, updateDoc } from 'firebase/firestore';

/**
 * Request user permission and get notification token
 */
export const requestNotificationPermission = async (userId) => {
  try {
    if (!Device.isDevice) {
      console.log('Notifications only work on physical devices');
      return null;
    }

    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync();

    if (status !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Get the token
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'YOUR_PROJECT_ID', // Update with your Expo project ID
    });

    // Save token to Firestore
    if (userId && token) {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'notifications.expoPushToken': token.data,
        'notifications.tokenUpdatedAt': new Date(),
      });
    }

    return token.data;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
};

/**
 * Setup notification channel (Android)
 */
export const setupNotificationChannel = () => {
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4B1D8E',
    });
  }
};

/**
 * Handle notification response (when user taps notification)
 */
export const handleNotificationResponse = (response) => {
  const notification = response.notification;
  const data = notification.request.content.data;

  // Navigate based on notification type
  if (data.type === 'event_reminder') {
    // Navigate to events screen
    return { screen: 'Events', eventId: data.eventId };
  } else if (data.type === 'giving_receipt') {
    // Navigate to giving screen
    return { screen: 'Giving' };
  } else if (data.type === 'approval_status') {
    // Navigate to profile screen
    return { screen: 'Profile' };
  }

  return null;
};

/**
 * Send local notification (for testing)
 */
export const sendLocalNotification = async (title, body, data = {}) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
      priority: 'high',
    },
    trigger: { seconds: 2 },
  });
};

/**
 * Setup notification listeners
 */
export const setupNotificationListeners = (onNotificationReceived, onResponseReceived) => {
  // Notification received while app is foregrounded
  const subscription1 = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // User taps on notification
  const subscription2 = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification response:', response);
    if (onResponseReceived) {
      onResponseReceived(response);
    }
  });

  // Return unsubscribe functions
  return () => {
    subscription1.remove();
    subscription2.remove();
  };
};

export default {
  requestNotificationPermission,
  setupNotificationChannel,
  handleNotificationResponse,
  sendLocalNotification,
  setupNotificationListeners,
};
