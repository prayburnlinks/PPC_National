import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase-config';
import { createUserNotification } from './firestoreService';

// storage.rules only allows these — must always send one, since an
// undefined contentType fails the rule's regex match outright.
const MIME_BY_EXT = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf' };

const uploadFile = async (path, file) => {
  try {
    const response = await fetch(file.uri);
    const blob = await response.blob();
    const ext = file.name?.split('.').pop()?.toLowerCase() || (file.mimeType?.includes('pdf') ? 'pdf' : 'jpg');
    const contentType = file.mimeType || MIME_BY_EXT[ext] || 'image/jpeg';
    const storageRef = ref(storage, `${path}.${ext}`);
    await uploadBytes(storageRef, blob, { contentType });
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('File upload error:', error);
    throw { message: 'Failed to upload file. Please try again.' };
  }
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let itemsCache = null;
let itemsCachedAt = 0;

export const uploadMerchItemImage = async (file) => {
  try {
    return await uploadFile(`merchandise/${Date.now()}`, file);
  } catch (error) {
    console.error('Merch image upload error:', error);
    throw { message: 'Failed to upload image. Please try again.' };
  }
};

export const createMerchItem = async (adminUser, { name, description, price, currency, sizes, imageFile }) => {
  try {
    const imageUrl = await uploadMerchItemImage(imageFile);
    const ref_ = await addDoc(collection(db, 'merchandise'), {
      name,
      description,
      price,
      currency,
      sizes,
      imageUrl,
      published: true,
      createdBy: adminUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    itemsCache = null;
    return { success: true, itemId: ref_.id };
  } catch (error) {
    console.error('Create merch item error:', error);
    throw { message: error.message || 'Failed to create item.' };
  }
};

export const updateMerchItem = async (itemId, fields) => {
  try {
    let updates = { ...fields, updatedAt: serverTimestamp() };
    if (fields.imageFile) {
      const { imageFile, ...rest } = updates;
      updates = { ...rest, imageUrl: await uploadMerchItemImage(fields.imageFile) };
    }
    await updateDoc(doc(db, 'merchandise', itemId), updates);
    itemsCache = null;
    return { success: true };
  } catch (error) {
    console.error('Update merch item error:', error);
    throw { message: error.message || 'Failed to update item.' };
  }
};

export const getMerchItems = async () => {
  const now = Date.now();
  if (itemsCache && now - itemsCachedAt < CACHE_TTL) return itemsCache;
  try {
    const snap = await getDocs(query(collection(db, 'merchandise'), where('published', '==', true)));
    itemsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    itemsCachedAt = now;
    return itemsCache;
  } catch (error) {
    console.error('Get merch items error:', error);
    return [];
  }
};

export const getAllMerchItemsForAdmin = async () => {
  try {
    const snap = await getDocs(collection(db, 'merchandise'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Get all merch items error:', error);
    return [];
  }
};

export const createMerchOrder = async (user, item, size, quantity) => {
  try {
    const totalAmount = Math.round(item.price * quantity * 100) / 100;
    const reference = `${user.name} · ${item.name}`;
    const orderRef = await addDoc(collection(db, 'merchOrders'), {
      userId: user.uid,
      userName: user.name,
      congregation: user.congregation || null,
      district: user.district || null,
      itemId: item.id,
      itemName: item.name,
      itemImageUrl: item.imageUrl || null,
      size,
      quantity,
      unitPrice: item.price,
      totalAmount,
      currency: item.currency,
      reference,
      status: 'awaiting_payment',
      fileUrl: null,
      fileName: null,
      mimeType: null,
      createdAt: serverTimestamp(),
      paymentSubmittedAt: null,
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
    });
    return {
      id: orderRef.id,
      itemName: item.name,
      size,
      quantity,
      totalAmount,
      currency: item.currency,
      reference,
    };
  } catch (error) {
    console.error('Create merch order error:', error);
    throw { message: error.message || 'Failed to create order.' };
  }
};

export const submitOrderPayment = async (order, user, file) => {
  try {
    const fileUrl = await uploadFile(`merchOrders/${user.uid}/${Date.now()}`, file);
    await updateDoc(doc(db, 'merchOrders', order.id), {
      fileUrl,
      fileName: file.name || 'proof_of_payment',
      mimeType: file.mimeType || 'application/octet-stream',
      status: 'payment_submitted',
      paymentSubmittedAt: serverTimestamp(),
      rejectionReason: null,
    });
    return { success: true };
  } catch (error) {
    console.error('Submit order payment error:', error);
    throw { message: error.message || 'Failed to submit proof of payment.' };
  }
};

export const getUserMerchOrders = async (userId) => {
  try {
    const q = query(
      collection(db, 'merchOrders'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Get user merch orders error:', error);
    return [];
  }
};

// Admin: fetch all orders awaiting review
// Leader: filtered to their congregation
export const getPendingMerchOrders = async (reviewerRole, reviewerCongregation) => {
  try {
    let q;
    if (reviewerRole === 'leader') {
      q = query(
        collection(db, 'merchOrders'),
        where('status', '==', 'payment_submitted'),
        where('congregation', '==', reviewerCongregation),
        orderBy('paymentSubmittedAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'merchOrders'),
        where('status', '==', 'payment_submitted'),
        orderBy('paymentSubmittedAt', 'desc')
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Get pending merch orders error:', error);
    return [];
  }
};

export const approveMerchOrder = async (orderId, userId, reviewerUid) => {
  try {
    await updateDoc(doc(db, 'merchOrders', orderId), {
      status: 'approved',
      reviewedBy: reviewerUid,
      reviewedAt: new Date(),
    });
    createUserNotification(userId, {
      type: 'merch_order_status',
      title: 'Order Approved',
      body: 'Your merchandise order has been approved. We\'ll be in touch about collection.',
    });
    return { success: true };
  } catch (error) {
    console.error('Approve merch order error:', error);
    throw { message: 'Failed to approve order.' };
  }
};

export const rejectMerchOrder = async (orderId, userId, reviewerUid, reason = '') => {
  try {
    await updateDoc(doc(db, 'merchOrders', orderId), {
      status: 'rejected',
      reviewedBy: reviewerUid,
      reviewedAt: new Date(),
      rejectionReason: reason,
    });
    createUserNotification(userId, {
      type: 'merch_order_status',
      title: 'Order Not Approved',
      body: reason
        ? `Your merchandise order was rejected: ${reason}`
        : 'Your merchandise order was not approved. Please contact the church office.',
    });
    return { success: true };
  } catch (error) {
    console.error('Reject merch order error:', error);
    throw { message: 'Failed to reject order.' };
  }
};
