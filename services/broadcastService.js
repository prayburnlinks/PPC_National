/**
 * Broadcast Service
 * Admin announcements: a message to everyone, a district or a congregation,
 * added to each member's notifications and pushed to their phones. Sending runs
 * in the sendBroadcast Cloud Function — see functions/broadcast.js.
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from '../firebase-config';
import { USER_STATUS } from '../constants/config';

// Must match the region declared in functions/index.js, or the callables
// resolve to URLs that don't exist.
const FUNCTIONS_REGION = 'us-central1';

// Keep in step with functions/broadcast.js, which is what actually enforces them.
export const TITLE_MAX = 65;
export const BODY_MAX = 300;

// An audience is { type: 'all' } or { type: 'district' | 'congregation', value },
// matching the `district` / `congregation` fields on a member's profile.

/**
 * How many approved members an audience reaches, so the admin can see what they
 * are about to do. Null when it can't be worked out — callers still let the
 * admin send, since the function is the one that decides.
 */
export const getAudienceCount = async ({ type, value }) => {
  try {
    const constraints = [where('status', '==', USER_STATUS.APPROVED)];
    if (type !== 'all') constraints.push(where(type, '==', value));
    const snapshot = await getCountFromServer(query(collection(db, 'users'), ...constraints));
    return snapshot.data().count;
  } catch (error) {
    console.error('Error counting announcement audience:', error);
    return null;
  }
};

/**
 * Send an announcement. Resolves with { recipients, devices, failed, pushFailed }:
 * the members it reached, the devices Expo accepted the push for, and what went
 * wrong with the push, if anything. The function's rejection wording
 * ("choose who should receive this") is member-facing, so it is surfaced.
 */
export const sendBroadcast = async ({ title, body, audience }) => {
  try {
    const callable = httpsCallable(getFunctions(app, FUNCTIONS_REGION), 'sendBroadcast');
    const { data } = await callable({ title, body, audience });
    return { success: true, ...data };
  } catch (error) {
    console.error('Error sending announcement:', error);
    throw { message: error?.message || 'Failed to send the announcement.' };
  }
};

/**
 * The latest announcements, newest first (admins only, per firestore.rules).
 */
export const getRecentBroadcasts = async (maxResults = 10) => {
  try {
    const snapshot = await getDocs(
      query(collection(db, 'broadcasts'), orderBy('sentAt', 'desc'), limit(maxResults))
    );
    return snapshot.docs.map((d) => {
      const data = d.data();
      return { ...data, id: d.id, sentAt: data.sentAt?.toDate ? data.sentAt.toDate() : null };
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return [];
  }
};
