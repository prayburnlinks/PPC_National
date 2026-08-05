import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase-config';
import { createUserNotification, getEventById, incrementEventAttendeeCount } from './firestoreService';

// storage.rules only allows these — must always send one, since an
// undefined contentType fails the rule's regex match outright.
const MIME_BY_EXT = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf' };

const uploadPaymentProof = async (userId, file) => {
  try {
    const response = await fetch(file.uri);
    const blob = await response.blob();
    const ext = file.name?.split('.').pop()?.toLowerCase() || (file.mimeType?.includes('pdf') ? 'pdf' : 'jpg');
    const contentType = file.mimeType || MIME_BY_EXT[ext] || 'image/jpeg';
    const storageRef = ref(storage, `eventRegistrations/${userId}/${Date.now()}.${ext}`);
    await uploadBytes(storageRef, blob, { contentType });
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('Event payment proof upload error:', error);
    throw { message: 'Failed to upload file. Please try again.' };
  }
};

// Doc id is deterministic (`${uid}_${eventId}`) — one registration per
// user per event, and a cheap direct-get instead of a query to check it.
const makeRegistrationId = (userId, eventId) => `${userId}_${eventId}`;

export const registerForEvent = async (user, event) => {
  try {
    const id = makeRegistrationId(user.uid, event.id);
    const registrationRef = doc(db, 'eventRegistrations', id);

    const existing = await getDoc(registrationRef);
    if (existing.exists()) {
      throw { message: 'You are already registered for this event.' };
    }

    const requiresPayment = !!event.requiresPayment && (event.registrationFee || 0) > 0;

    await setDoc(registrationRef, {
      userId: user.uid,
      userName: user.name,
      congregation: user.congregation || null,
      district: user.district || null,
      eventId: event.id,
      eventName: event.name,
      eventDate: event.eventDate || null,
      registrationFee: event.registrationFee || 0,
      currency: event.currency || 'ZAR',
      requiresPayment,
      status: requiresPayment ? 'awaiting_payment' : 'confirmed',
      attended: false,
      fileUrl: null,
      fileName: null,
      mimeType: null,
      registeredAt: serverTimestamp(),
      paymentSubmittedAt: null,
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
    });

    // Non-fatal bookkeeping: the registration itself succeeded, so a failed
    // counter bump must not surface as a registration error. The count is
    // advisory — the Admin Events tab derives true counts from the
    // registration docs themselves.
    try {
      await incrementEventAttendeeCount(event.id);
    } catch (countError) {
      console.error('Attendee count bump failed (non-fatal):', countError);
    }

    return { success: true, registrationId: id };
  } catch (error) {
    console.error('Error registering for event:', error);
    throw { message: error.message || 'Failed to register for event' };
  }
};

// Used by EventsScreen to badge a whole list of event cards in one query
// instead of one lookup per card.
export const getUserEventRegistrationsMap = async (userId) => {
  try {
    const q = query(collection(db, 'eventRegistrations'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const map = new Map();
    snap.docs.forEach(d => map.set(d.data().eventId, { id: d.id, ...d.data() }));
    return map;
  } catch (error) {
    console.error('Error fetching user event registrations:', error);
    return new Map();
  }
};

// Used by MyEventsScreen — joins each registration with its event, flattened
// onto one object so the screen can render without a separate lookup.
export const getUserEventRegistrations = async (userId) => {
  try {
    const q = query(collection(db, 'eventRegistrations'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const registrations = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const events = await Promise.all(registrations.map(r => getEventById(r.eventId)));

    return registrations
      .map((r, i) => events[i] && ({
        ...events[i],
        registrationId: r.id,
        registrationStatus: r.status,
        fileUrl: r.fileUrl,
        rejectionReason: r.rejectionReason,
      }))
      .filter(Boolean)
      .sort((a, b) => a.eventDate - b.eventDate);
  } catch (error) {
    console.error('Error fetching user registered events:', error);
    return [];
  }
};

export const submitEventRegistrationPayment = async (registrationId, user, file) => {
  try {
    const fileUrl = await uploadPaymentProof(user.uid, file);
    await updateDoc(doc(db, 'eventRegistrations', registrationId), {
      fileUrl,
      fileName: file.name || 'proof_of_payment',
      mimeType: file.mimeType || 'application/octet-stream',
      status: 'payment_submitted',
      paymentSubmittedAt: serverTimestamp(),
      rejectionReason: null,
    });
    return { success: true };
  } catch (error) {
    console.error('Submit event registration payment error:', error);
    throw { message: error.message || 'Failed to submit proof of payment.' };
  }
};

// Admin: fetch all registrations awaiting review
// Leader: filtered to their congregation
export const getPendingEventRegistrations = async (reviewerRole, reviewerCongregation) => {
  try {
    let q;
    if (reviewerRole === 'leader') {
      q = query(
        collection(db, 'eventRegistrations'),
        where('status', '==', 'payment_submitted'),
        where('congregation', '==', reviewerCongregation),
        orderBy('paymentSubmittedAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'eventRegistrations'),
        where('status', '==', 'payment_submitted'),
        orderBy('paymentSubmittedAt', 'desc')
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Get pending event registrations error:', error);
    return [];
  }
};

// Every registration grouped by event, for the Admin panel's Events tab.
// Admins see all congregations; leaders only their own (mirrors the
// firestore.rules read scoping, so a leader's query doesn't get denied).
export const getEventRegistrationsByEvent = async (reviewerRole, reviewerCongregation) => {
  try {
    const q = reviewerRole === 'leader'
      ? query(collection(db, 'eventRegistrations'), where('congregation', '==', reviewerCongregation))
      : collection(db, 'eventRegistrations');
    const snap = await getDocs(q);

    const groups = new Map();
    snap.docs.forEach(d => {
      const reg = { id: d.id, ...d.data() };
      if (!groups.has(reg.eventId)) {
        groups.set(reg.eventId, {
          eventId: reg.eventId,
          eventName: reg.eventName,
          eventDate: reg.eventDate,
          attendees: [],
        });
      }
      groups.get(reg.eventId).attendees.push(reg);
    });

    const toMs = (raw) => {
      if (raw?.toDate) return raw.toDate().getTime();
      if (raw?.seconds) return raw.seconds * 1000;
      return raw ? new Date(raw).getTime() : 0;
    };
    return [...groups.values()]
      .map(g => ({
        ...g,
        attendees: g.attendees.sort((a, b) => (a.userName || '').localeCompare(b.userName || '')),
      }))
      .sort((a, b) => toMs(b.eventDate) - toMs(a.eventDate));
  } catch (error) {
    console.error('Get event registrations by event error:', error);
    return [];
  }
};

export const approveEventRegistration = async (registrationId, userId, reviewerUid) => {
  try {
    await updateDoc(doc(db, 'eventRegistrations', registrationId), {
      status: 'approved',
      reviewedBy: reviewerUid,
      reviewedAt: new Date(),
    });
    createUserNotification(userId, {
      type: 'event_payment_status',
      title: 'Payment Approved',
      body: 'Your event payment has been approved. You are registered & paid!',
    });
    return { success: true };
  } catch (error) {
    console.error('Approve event registration error:', error);
    throw { message: 'Failed to approve payment.' };
  }
};

export const rejectEventRegistration = async (registrationId, userId, reviewerUid, reason = '') => {
  try {
    await updateDoc(doc(db, 'eventRegistrations', registrationId), {
      status: 'rejected',
      reviewedBy: reviewerUid,
      reviewedAt: new Date(),
      rejectionReason: reason,
    });
    createUserNotification(userId, {
      type: 'event_payment_status',
      title: 'Payment Not Approved',
      body: reason
        ? `Your event payment was rejected: ${reason}`
        : 'Your event payment was not approved. Please resubmit or contact the church office.',
    });
    return { success: true };
  } catch (error) {
    console.error('Reject event registration error:', error);
    throw { message: 'Failed to reject payment.' };
  }
};
