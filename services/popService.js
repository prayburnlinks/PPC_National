import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  writeBatch,
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

export const uploadPOP = async (userId, file) => {
  try {
    // Fetch the file as a blob
    const response = await fetch(file.uri);
    const blob = await response.blob();

    const ext = file.name?.split('.').pop()?.toLowerCase() || (file.mimeType?.includes('pdf') ? 'pdf' : 'jpg');
    const contentType = file.mimeType || MIME_BY_EXT[ext] || 'image/jpeg';
    const storageRef = ref(storage, `pop/${userId}/${Date.now()}.${ext}`);
    await uploadBytes(storageRef, blob, { contentType });
    const downloadUrl = await getDownloadURL(storageRef);

    return downloadUrl;
  } catch (error) {
    console.error('POP upload error:', error);
    throw { message: 'Failed to upload file. Please try again.' };
  }
};

export const submitPOP = async (user, file) => {
  try {
    const fileUrl = await uploadPOP(user.uid, file);

    const batch = writeBatch(db);
    const popRef = doc(collection(db, 'proofOfPayments'));
    batch.set(popRef, {
      userId: user.uid,
      userName: user.name,
      congregation: user.congregation || null,
      district: user.district || null,
      fileUrl,
      fileName: file.name || 'proof_of_payment',
      mimeType: file.mimeType || 'application/octet-stream',
      status: 'pending',
      submittedAt: serverTimestamp(),
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
    });
    batch.update(doc(db, 'users', user.uid), {
      popStatus: 'pending',
      updatedAt: new Date(),
    });
    await batch.commit();

    return { success: true, popId: popRef.id };
  } catch (error) {
    console.error('Submit POP error:', error);
    throw { message: error.message || 'Failed to submit proof of payment.' };
  }
};

// Admin: fetch all pending POPs
// Leader: filtered to their congregation
export const getPendingPOPs = async (reviewerRole, reviewerCongregation) => {
  try {
    let q;
    if (reviewerRole === 'leader') {
      q = query(
        collection(db, 'proofOfPayments'),
        where('status', '==', 'pending'),
        where('congregation', '==', reviewerCongregation),
        orderBy('submittedAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'proofOfPayments'),
        where('status', '==', 'pending'),
        orderBy('submittedAt', 'desc')
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Get pending POPs error:', error);
    return [];
  }
};

export const approvePOP = async (popId, userId, reviewerUid) => {
  try {
    await updateDoc(doc(db, 'proofOfPayments', popId), {
      status: 'approved',
      reviewedBy: reviewerUid,
      reviewedAt: new Date(),
    });
    await updateDoc(doc(db, 'users', userId), {
      popStatus: 'approved',
      updatedAt: new Date(),
    });
    createUserNotification(userId, {
      type: 'pop_status',
      title: 'Payment Approved',
      body: 'Your proof of payment has been approved. Thank you for your giving!',
    });
    return { success: true };
  } catch (error) {
    console.error('Approve POP error:', error);
    throw { message: 'Failed to approve payment.' };
  }
};

export const rejectPOP = async (popId, userId, reviewerUid, reason = '') => {
  try {
    await updateDoc(doc(db, 'proofOfPayments', popId), {
      status: 'rejected',
      reviewedBy: reviewerUid,
      reviewedAt: new Date(),
      rejectionReason: reason,
    });
    await updateDoc(doc(db, 'users', userId), {
      popStatus: 'rejected',
      updatedAt: new Date(),
    });
    createUserNotification(userId, {
      type: 'pop_status',
      title: 'Payment Not Approved',
      body: reason
        ? `Your proof of payment was rejected: ${reason}`
        : 'Your proof of payment was not approved. Please resubmit or contact the church office.',
    });
    return { success: true };
  } catch (error) {
    console.error('Reject POP error:', error);
    throw { message: 'Failed to reject payment.' };
  }
};
