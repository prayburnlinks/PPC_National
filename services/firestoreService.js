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
  getDocsFromServer,
  addDoc,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  runTransaction,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase-config';

const parseDate = (raw) => {
  if (raw?.toDate) return raw.toDate();
  if (raw?.seconds) return new Date(raw.seconds * 1000);
  if (raw) return new Date(raw);
  return new Date('2099-01-01');
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let eventsCache = null;
let eventsCachedAt = 0;

const fetchEvents = async () => {
  const now = Date.now();
  if (eventsCache && now - eventsCachedAt < CACHE_TTL) return eventsCache;
  const snapshot = await getDocsFromServer(collection(db, 'events'));
  eventsCache = snapshot.docs.map(doc => ({
    ...doc.data(), id: doc.id, eventDate: parseDate(doc.data().eventDate),
  }));
  eventsCachedAt = now;
  return eventsCache;
};

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
    const docs = await fetchEvents();
    return docs
      .filter(e => e.eventDate >= now)
      .sort((a, b) => a.eventDate - b.eventDate)
      .slice(0, maxResults);
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    return [];
  }
};

/**
 * Get all events (paginated)
 */
export const getAllEvents = async (pageSize = 20) => {
  try {
    const docs = await fetchEvents();
    const all = [...docs].sort((a, b) => a.eventDate - b.eventDate);
    return {
      events: all.slice(0, pageSize),
      hasMore: all.length > pageSize,
    };
  } catch (error) {
    console.error('Error fetching all events:', error);
    return { events: [], hasMore: false };
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
    return { ...data, id: eventDoc.id, eventDate: parseDate(data.eventDate) };
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
    const { events } = await getAllEvents(100);
    return events.filter(e => e.category === category && e.eventDate >= now);
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

    // Atomically increment attendee count
    const eventRef = doc(db, 'events', eventId);
    await updateDoc(eventRef, {
      attendeeCount: increment(1),
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
    const results = await Promise.all(eventIds.map(getEventById));
    const events = results.filter(Boolean);

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
 * Log a giving transaction.
 * Pass a falsy `userId` (e.g. an unauthenticated visitor) to log an
 * anonymous transaction — it's recorded only in the global
 * `givingTransactions` collection, not in a per-user subcollection.
 */
export const logGivingTransaction = async (userId, transactionData) => {
  try {
    const transaction = {
      ...transactionData,
      createdAt: new Date(),
      status: 'pending', // manual EFT payment
    };

    let docRef;
    if (userId) {
      const givingRef = collection(db, 'users', userId, 'givingHistory');
      docRef = await addDoc(givingRef, transaction);
    }

    // Also create a global giving record for analytics
    const globalRef = await addDoc(collection(db, 'givingTransactions'), {
      ...transaction,
      userId: userId || null,
      isAnonymous: !userId,
      transactionId: docRef?.id || null,
    });

    return { success: true, transactionId: docRef?.id || globalRef.id };
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
    const snapshot = await getDocs(givingRef);
    return snapshot.docs
      .map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: parseDate(doc.data().createdAt),
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
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
    return { ...data, uid: userDoc.id, createdAt: parseDate(data.createdAt) };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

/**
 * Update user profile
 */
const PROFILE_ALLOWED_FIELDS = ['name', 'phone', 'congregation', 'district'];

export const updateUserProfile = async (userId, updates) => {
  try {
    const safe = Object.fromEntries(
      Object.entries(updates).filter(([k]) => PROFILE_ALLOWED_FIELDS.includes(k))
    );
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { ...safe, updatedAt: new Date() });
    return { success: true };
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw { message: 'Failed to update profile' };
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
    const snapshot = await getDocs(notificationsRef);
    return snapshot.docs
      .map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: parseDate(doc.data().createdAt),
      }))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, maxResults);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

/**
 * Create a notification in a user's feed. Only leaders/admins can do this
 * (firestore.rules) — it's meant for system/reviewer-triggered notices
 * (registration approved, payment reviewed, etc.), not self-service.
 * Fire-and-forget by design: a notification failing to write should never
 * block the action that triggered it.
 */
export const createUserNotification = async (userId, { type, title, body }) => {
  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    await addDoc(notificationsRef, {
      type,
      title,
      body,
      read: false,
      createdAt: new Date(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false };
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


/**
 * Prayer Wall functions
 */
export const getPrayerRequests = async (scope = 'national', district = null) => {
  try {
    const col = collection(db, 'prayerRequests');
    let q;
    if (scope === 'national') {
      q = query(col, where('scope', '==', 'national'), orderBy('createdAt', 'desc'), limit(50));
    } else if (scope === 'district' && district) {
      q = query(col, where('scope', '==', 'district'), where('district', '==', district), orderBy('createdAt', 'desc'), limit(50));
    } else {
      q = query(col, orderBy('createdAt', 'desc'), limit(50));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id, createdAt: parseDate(d.data().createdAt) }));
  } catch (error) {
    console.error('Error fetching prayer requests:', error);
    return [];
  }
};

export const submitPrayerRequest = async (userId, { title, body, scope = 'national', district = null, congregation = null }) => {
  try {
    const payload = {
      title,
      body,
      scope,
      district: district || null,
      congregation: congregation || null,
      createdBy: userId,
      createdAt: serverTimestamp(),
      prayCount: 0,
      prayingBy: [],
    };
    const ref = await addDoc(collection(db, 'prayerRequests'), payload);
    return { success: true, id: ref.id };
  } catch (error) {
    console.error('Error submitting prayer request:', error);
    throw { message: 'Failed to submit prayer request' };
  }
};

/**
 * Get a user's own submitted prayer requests
 */
export const getUserPrayerRequests = async (userId) => {
  try {
    const q = query(
      collection(db, 'prayerRequests'),
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id, createdAt: parseDate(d.data().createdAt) }));
  } catch (error) {
    console.error('Error fetching user prayer requests:', error);
    return [];
  }
};

export const prayForRequest = async (requestId, userId) => {
  try {
    const ref = doc(db, 'prayerRequests', requestId);
    const action = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Not found');
      const data = snap.data();
      const already = Array.isArray(data.prayingBy) && data.prayingBy.includes(userId);
      if (already) {
        tx.update(ref, { prayCount: increment(-1), prayingBy: arrayRemove(userId) });
        return 'removed';
      }
      tx.update(ref, { prayCount: increment(1), prayingBy: arrayUnion(userId) });
      return 'added';
    });
    return { success: true, action };
  } catch (error) {
    console.error('Error toggling pray for request:', error);
    throw { message: 'Failed to update prayer' };
  }
};

export const getLiveStatus = async () => {
  try {
    const snap = await getDoc(doc(db, 'config', 'liveStatus'));
    if (!snap.exists()) return { isLive: false, platform: 'youtube', title: '' };
    return snap.data();
  } catch {
    return { isLive: false, platform: 'youtube', title: '' };
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

  // Notifications
  getUserNotifications,
  createUserNotification,
  markNotificationAsRead,

  // Prayer Wall
  getPrayerRequests,
  getUserPrayerRequests,
  submitPrayerRequest,
  prayForRequest,

  // Live Status
  getLiveStatus,
};
