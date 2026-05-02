/**
 * Firestore Service
 * Handles all Firestore database queries and operations
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase-config';

/**
 * ============================================
 * EVENTS
 * ============================================
 */

/**
 * Get upcoming events for home screen
 */
export const getUpcomingEvents = async (maxResults = 4) => {
  try {
    const now = new Date();
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef,
      where('eventDate', '>=', Timestamp.fromDate(now)),
      orderBy('eventDate', 'asc'),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      eventDate: doc.data().eventDate?.toDate?.() || new Date(doc.data().eventDate),
    }));
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    return [];
  }
};

/**
 * Get all events (paginated)
 */
export const getAllEvents = async (pageSize = 20, startDoc = null) => {
  try {
    const now = new Date();
    const eventsRef = collection(db, 'events');
    let q = query(
      eventsRef,
      where('eventDate', '>=', Timestamp.fromDate(now)),
      orderBy('eventDate', 'asc'),
      limit(pageSize + 1)
    );

    if (startDoc) {
      q = query(
        eventsRef,
        where('eventDate', '>=', Timestamp.fromDate(now)),
        orderBy('eventDate', 'asc'),
        startAfter(startDoc),
        limit(pageSize + 1)
      );
    }

    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      eventDate: doc.data().eventDate?.toDate?.() || new Date(doc.data().eventDate),
    }));

    return {
      events: docs.slice(0, pageSize),
      hasMore: docs.length > pageSize,
      lastDoc: docs.length > pageSize ? snapshot.docs[pageSize] : null,
    };
  } catch (error) {
    console.error('Error fetching all events:', error);
    return { events: [], hasMore: false, lastDoc: null };
  }
};

/**
 * Get event by ID
 */
export const getEventById = async (eventId) => {
  try {
    const eventDoc = await getDoc(doc(db, 'events', eventId));
    if (!eventDoc.exists()) return null;

    const data = eventDoc.data();
    return {
      ...data,
      id: eventDoc.id,
      eventDate: data.eventDate?.toDate?.() || new Date(data.eventDate),
    };
  } catch (error) {
    console.error('Error fetching event:', error);
    return null;
  }
};

/**
 * Get events by category
 */
export const getEventsByCategory = async (category) => {
  try {
    const now = new Date();
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef,
      where('category', '==', category),
      where('eventDate', '>=', Timestamp.fromDate(now)),
      orderBy('eventDate', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      eventDate: doc.data().eventDate?.toDate?.() || new Date(doc.data().eventDate),
    }));
  } catch (error) {
    console.error('Error fetching events by category:', error);
    return [];
  }
};

/**
 * ============================================
 * EVENT REGISTRATION
 * ============================================
 */

/**
 * Register user for an event
 */
export const registerForEvent = async (userId, eventId) => {
  try {
    const registrationRef = doc(
      db,
      'users',
      userId,
      'registeredEvents',
      eventId
    );

    await setDoc(registrationRef, {
      eventId,
      registeredAt: new Date(),
      attended: false,
      feePaid: false,
    });

    // Update event attendee count
    const eventRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventRef);
    const currentCount = eventDoc.data().attendeeCount || 0;

    await updateDoc(eventRef, {
      attendeeCount: currentCount + 1,
    });

    return { success: true, message: 'Registered for event' };
  } catch (error) {
    console.error('Error registering for event:', error);
    throw { message: 'Failed to register for event' };
  }
};

/**
 * Get user's registered events
 */
export const getUserRegisteredEvents = async (userId) => {
  try {
    const registeredRef = collection(db, 'users', userId, 'registeredEvents');
    const snapshot = await getDocs(registeredRef);

    const eventIds = snapshot.docs.map(doc => doc.id);
    const events = [];

    for (const eventId of eventIds) {
      const event = await getEventById(eventId);
      if (event) {
        events.push(event);
      }
    }

    return events.sort((a, b) => a.eventDate - b.eventDate);
  } catch (error) {
    console.error('Error fetching user registered events:', error);
    return [];
  }
};

/**
 * Check if user is registered for an event
 */
export const isUserRegisteredForEvent = async (userId, eventId) => {
  try {
    const registrationRef = doc(
      db,
      'users',
      userId,
      'registeredEvents',
      eventId
    );
    const registrationDoc = await getDoc(registrationRef);
    return registrationDoc.exists();
  } catch (error) {
    console.error('Error checking registration:', error);
    return false;
  }
};

/**
 * ============================================
 * GIVING / TITHE
 * ============================================
 */

/**
 * Log a giving transaction
 */
export const logGivingTransaction = async (userId, transactionData) => {
  try {
    const givingRef = collection(db, 'users', userId, 'givingHistory');

    const transaction = {
      ...transactionData,
      createdAt: new Date(),
      status: 'pending', // manual EFT payment
    };

    const docRef = await addDoc(givingRef, transaction);

    // Also create a global giving record for analytics
    await addDoc(collection(db, 'givingTransactions'), {
      ...transaction,
      userId,
      transactionId: docRef.id,
    });

    return { success: true, transactionId: docRef.id };
  } catch (error) {
    console.error('Error logging giving transaction:', error);
    throw { message: 'Failed to save transaction' };
  }
};

/**
 * Get user's giving history
 */
export const getUserGivingHistory = async (userId) => {
  try {
    const givingRef = collection(db, 'users', userId, 'givingHistory');
    const q = query(givingRef, orderBy('createdAt', 'desc'));

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
    }));
  } catch (error) {
    console.error('Error fetching giving history:', error);
    return [];
  }
};

/**
 * Get user's total giving
 */
export const getUserTotalGiving = async (userId) => {
  try {
    const givingHistory = await getUserGivingHistory(userId);
    return givingHistory.reduce((total, tx) => total + (tx.amount || 0), 0);
  } catch (error) {
    console.error('Error calculating total giving:', error);
    return 0;
  }
};

/**
 * ============================================
 * USER DATA
 * ============================================
 */

/**
 * Get user profile
 */
export const getUserProfile = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return null;

    const data = userDoc.data();
    return {
      ...data,
      uid: userDoc.id,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw { message: 'Failed to update profile' };
  }
};

/**
 * Get user's ministries
 */
export const getUserMinistries = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.data()?.ministries || [];
  } catch (error) {
    console.error('Error fetching user ministries:', error);
    return [];
  }
};

/**
 * ============================================
 * DISTRICTS
 * ============================================
 */

/**
 * Get all districts
 */
export const getAllDistricts = async () => {
  try {
    const districtRef = collection(db, 'districts');
    const snapshot = await getDocs(districtRef);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error('Error fetching districts:', error);
    return [];
  }
};

/**
 * Get district by ID
 */
export const getDistrictById = async (districtId) => {
  try {
    const districtDoc = await getDoc(doc(db, 'districts', districtId));
    if (!districtDoc.exists()) return null;
    return { ...districtDoc.data(), id: districtDoc.id };
  } catch (error) {
    console.error('Error fetching district:', error);
    return null;
  }
};

/**
 * ============================================
 * NOTIFICATIONS
 * ============================================
 */

/**
 * Get user's notifications
 */
export const getUserNotifications = async (userId, maxResults = 10) => {
  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const q = query(
      notificationsRef,
      orderBy('createdAt', 'desc'),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
    }));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (userId, notificationId) => {
  try {
    const notifRef = doc(db, 'users', userId, 'notifications', notificationId);
    await updateDoc(notifRef, { read: true });
    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false };
  }
};

export default {
  // Events
  getUpcomingEvents,
  getAllEvents,
  getEventById,
  getEventsByCategory,
  
  // Event Registration
  registerForEvent,
  getUserRegisteredEvents,
  isUserRegisteredForEvent,
  
  // Giving
  logGivingTransaction,
  getUserGivingHistory,
  getUserTotalGiving,
  
  // User
  getUserProfile,
  updateUserProfile,
  getUserMinistries,
  
  // Districts
  getAllDistricts,
  getDistrictById,
  
  // Notifications
  getUserNotifications,
  markNotificationAsRead,
};
