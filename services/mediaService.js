import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase-config';

/**
 * ============================================
 * LIVE STREAM LINKS
 * Admin-editable so a new YouTube/Facebook stream can be pointed at without
 * a code deploy. Stored in config/mediaLinks, alongside the existing
 * config/liveStatus doc — a visitor needs to read this without signing in,
 * since Media is a public tab.
 * ============================================
 */

export const getMediaLinks = async () => {
  try {
    const snap = await getDoc(doc(db, 'config', 'mediaLinks'));
    return snap.exists() ? snap.data() : {};
  } catch (error) {
    console.error('Get media links error:', error);
    throw { message: 'Failed to load media links.' };
  }
};

export const saveMediaLinks = async (adminUser, links) => {
  try {
    await setDoc(
      doc(db, 'config', 'mediaLinks'),
      { ...links, updatedBy: adminUser.uid, updatedAt: serverTimestamp() },
      { merge: true }
    );
    return { success: true };
  } catch (error) {
    console.error('Save media links error:', error);
    throw { message: error.message || 'Failed to save media links.' };
  }
};

/**
 * ============================================
 * FEATURED VIDEOS
 * A short, admin-curated list shown on the Media tab. Newest first.
 * ============================================
 */

export const getFeaturedVideos = async () => {
  try {
    const q = query(collection(db, 'featuredVideos'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Get featured videos error:', error);
    return [];
  }
};

export const addFeaturedVideo = async (adminUser, { platform, url, assembly, district }) => {
  try {
    const ref = await addDoc(collection(db, 'featuredVideos'), {
      platform,
      url,
      assembly: assembly || '',
      district: district || '',
      createdBy: adminUser.uid,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (error) {
    console.error('Add featured video error:', error);
    throw { message: error.message || 'Failed to add featured video.' };
  }
};

export const removeFeaturedVideo = async (videoId) => {
  try {
    await deleteDoc(doc(db, 'featuredVideos', videoId));
    return { success: true };
  } catch (error) {
    console.error('Remove featured video error:', error);
    throw { message: 'Failed to remove featured video.' };
  }
};
