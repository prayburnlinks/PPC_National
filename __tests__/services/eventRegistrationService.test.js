import {
  registerForEvent,
  getUserEventRegistrationsMap,
  getUserEventRegistrations,
  submitEventRegistrationPayment,
  getPendingEventRegistrations,
  approveEventRegistration,
  rejectEventRegistration,
  getEventRegistrationsByEvent,
  getEventRegistrationCount,
  registerAttendee,
  cancelAttendee,
  getAttendeesRegisteredBy,
} from '../../services/eventRegistrationService';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db, path) => ({ path })),
  doc: jest.fn((db, ...segments) => ({ path: segments.join('/') })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  query: jest.fn((...args) => args),
  where: jest.fn((...args) => ({ where: args })),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(() => new Date('2026-01-01')),
}));

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(),
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

jest.mock('../../services/firestoreService', () => ({
  createUserNotification: jest.fn(),
  getEventById: jest.fn(),
  incrementEventAttendeeCount: jest.fn(),
}));

import { getDoc, getDocs, setDoc, updateDoc, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { createUserNotification, getEventById, incrementEventAttendeeCount } from '../../services/firestoreService';

const mockUser = { uid: 'uid-1', name: 'Test User', congregation: 'Ebenezer', district: 'Southern Cape' };

const mockPaidEvent = {
  id: 'event-1',
  name: 'Youth Camp',
  eventDate: new Date('2026-09-01'),
  registrationFee: 250,
  currency: 'ZAR',
  requiresPayment: true,
};

const mockFreeEvent = {
  id: 'event-2',
  name: 'Prayer Meeting',
  eventDate: new Date('2026-09-05'),
  registrationFee: 0,
  currency: 'ZAR',
  requiresPayment: false,
};

const mockFile = { uri: 'file:///tmp/proof.jpg', name: 'proof.jpg', mimeType: 'image/jpeg' };

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn(() => Promise.resolve({ blob: () => Promise.resolve(new Blob()) }));
});

describe('registerForEvent', () => {
  it('creates an awaiting_payment registration and increments attendee count for a paid event', async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    setDoc.mockResolvedValue();
    incrementEventAttendeeCount.mockResolvedValue();

    const result = await registerForEvent(mockUser, mockPaidEvent);

    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'uid-1',
        eventId: 'event-1',
        requiresPayment: true,
        status: 'awaiting_payment',
      })
    );
    expect(incrementEventAttendeeCount).toHaveBeenCalledWith('event-1');
    expect(result).toEqual({ success: true, registrationId: 'uid-1_event-1' });
  });

  it('creates a confirmed registration for a free event', async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    setDoc.mockResolvedValue();
    incrementEventAttendeeCount.mockResolvedValue();

    await registerForEvent(mockUser, mockFreeEvent);

    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ requiresPayment: false, status: 'confirmed' })
    );
  });

  it('throws if already registered', async () => {
    getDoc.mockResolvedValue({ exists: () => true });

    await expect(registerForEvent(mockUser, mockPaidEvent)).rejects.toMatchObject({
      message: 'You are already registered for this event.',
    });
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('throws on write failure', async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    setDoc.mockRejectedValue(new Error('Quota exceeded'));

    await expect(registerForEvent(mockUser, mockPaidEvent)).rejects.toMatchObject({
      message: 'Quota exceeded',
    });
  });

  it('still succeeds when the attendee count bump fails', async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    setDoc.mockResolvedValue();
    incrementEventAttendeeCount.mockRejectedValue(new Error('offline'));

    const result = await registerForEvent(mockUser, mockPaidEvent);

    expect(result).toEqual({ success: true, registrationId: 'uid-1_event-1' });
  });
});

describe('getUserEventRegistrationsMap', () => {
  it('returns a map keyed by eventId', async () => {
    getDocs.mockResolvedValue({
      docs: [{ id: 'uid-1_event-1', data: () => ({ eventId: 'event-1', status: 'approved' }) }],
    });

    const result = await getUserEventRegistrationsMap('uid-1');

    expect(result.get('event-1')).toMatchObject({ id: 'uid-1_event-1', status: 'approved' });
  });

  it('returns an empty map on error', async () => {
    getDocs.mockRejectedValue(new Error('Network error'));

    const result = await getUserEventRegistrationsMap('uid-1');

    expect(result.size).toBe(0);
  });
});

describe('getUserEventRegistrations', () => {
  it('joins registrations with events and sorts by date', async () => {
    getDocs.mockResolvedValue({
      docs: [
        { id: 'uid-1_event-2', data: () => ({ eventId: 'event-2', status: 'confirmed', fileUrl: null, rejectionReason: null }) },
        { id: 'uid-1_event-1', data: () => ({ eventId: 'event-1', status: 'awaiting_payment', fileUrl: null, rejectionReason: null }) },
      ],
    });
    getEventById.mockImplementation((id) => Promise.resolve(id === 'event-1' ? mockPaidEvent : mockFreeEvent));

    const result = await getUserEventRegistrations('uid-1');

    expect(result.map(e => e.id)).toEqual(['event-1', 'event-2']);
    expect(result[0]).toMatchObject({ registrationId: 'uid-1_event-1', registrationStatus: 'awaiting_payment' });
  });

  it('returns empty array on error', async () => {
    getDocs.mockRejectedValue(new Error('Network error'));

    const result = await getUserEventRegistrations('uid-1');

    expect(result).toEqual([]);
  });
});

describe('submitEventRegistrationPayment', () => {
  it('uploads proof and updates the registration to payment_submitted', async () => {
    ref.mockReturnValue('storage-ref');
    uploadBytes.mockResolvedValue();
    getDownloadURL.mockResolvedValue('https://storage.example.com/proof.jpg');
    updateDoc.mockResolvedValue();

    const result = await submitEventRegistrationPayment('uid-1_event-1', mockUser, mockFile);

    expect(uploadBytes).toHaveBeenCalled();
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ fileUrl: 'https://storage.example.com/proof.jpg', status: 'payment_submitted' })
    );
    expect(result.success).toBe(true);
  });

  it('throws when upload fails', async () => {
    ref.mockReturnValue('storage-ref');
    uploadBytes.mockRejectedValue(new Error('Upload failed'));

    await expect(submitEventRegistrationPayment('uid-1_event-1', mockUser, mockFile)).rejects.toMatchObject({
      message: expect.stringContaining('Failed to upload'),
    });
  });
});

describe('getPendingEventRegistrations', () => {
  it('fetches all payment_submitted registrations for admins', async () => {
    getDocs.mockResolvedValue({
      docs: [{ id: 'uid-1_event-1', data: () => ({ status: 'payment_submitted' }) }],
    });

    const result = await getPendingEventRegistrations('admin', null);

    expect(result).toHaveLength(1);
  });

  it('filters by congregation for leaders', async () => {
    getDocs.mockResolvedValue({ docs: [] });

    const result = await getPendingEventRegistrations('leader', 'Ebenezer');

    expect(result).toEqual([]);
  });
});

describe('getEventRegistrationsByEvent', () => {
  it('groups registrations by event with attendees sorted by name, newest event first', async () => {
    getDocs.mockResolvedValue({
      docs: [
        { id: 'u1_e1', data: () => ({ eventId: 'e1', eventName: 'Youth Camp', eventDate: new Date('2026-09-01'), userId: 'u1', userName: 'Zanele', status: 'approved' }) },
        { id: 'u2_e2', data: () => ({ eventId: 'e2', eventName: 'Sisters Conference', eventDate: new Date('2026-10-01'), userId: 'u2', userName: 'Ben', status: 'awaiting_payment' }) },
        { id: 'u3_e1', data: () => ({ eventId: 'e1', eventName: 'Youth Camp', eventDate: new Date('2026-09-01'), userId: 'u3', userName: 'Alice', status: 'confirmed' }) },
      ],
    });

    const result = await getEventRegistrationsByEvent('admin', null);

    expect(result).toHaveLength(2);
    expect(result[0].eventName).toBe('Sisters Conference'); // newest first
    expect(result[1].eventName).toBe('Youth Camp');
    expect(result[1].attendees.map(a => a.userName)).toEqual(['Alice', 'Zanele']);
  });

  it('scopes the query to the congregation for leaders', async () => {
    getDocs.mockResolvedValue({ docs: [] });
    const { where } = require('firebase/firestore');

    await getEventRegistrationsByEvent('leader', 'Ebenezer');

    expect(where).toHaveBeenCalledWith('congregation', '==', 'Ebenezer');
  });

  it('returns an empty array on error', async () => {
    getDocs.mockRejectedValue(new Error('offline'));

    const result = await getEventRegistrationsByEvent('admin', null);

    expect(result).toEqual([]);
  });
});

describe('approveEventRegistration', () => {
  it('updates status to approved and notifies the owner', async () => {
    updateDoc.mockResolvedValue();

    const result = await approveEventRegistration('uid-1_event-1', 'uid-1', 'reviewer-uid');

    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'approved', reviewedBy: 'reviewer-uid' })
    );
    expect(createUserNotification).toHaveBeenCalledWith('uid-1', expect.objectContaining({ type: 'event_payment_status' }));
    expect(result.success).toBe(true);
  });

  it('tells the leader who registered someone, naming the person, rather than speaking to them', async () => {
    updateDoc.mockResolvedValue();

    await approveEventRegistration('reg-1', 'leader-1', 'reviewer-uid', 'Alice Adams');

    expect(createUserNotification).toHaveBeenCalledWith('leader-1', {
      type: 'event_payment_status',
      title: 'Payment Approved',
      body: "Alice Adams's event payment has been approved. They are registered & paid!",
    });
  });

  it('throws on failure', async () => {
    updateDoc.mockRejectedValue(new Error('Permission denied'));

    await expect(approveEventRegistration('uid-1_event-1', 'uid-1', 'reviewer')).rejects.toMatchObject({
      message: 'Failed to approve payment.',
    });
  });
});

describe('rejectEventRegistration', () => {
  it('updates status to rejected with reason and notifies the owner', async () => {
    updateDoc.mockResolvedValue();

    const result = await rejectEventRegistration('uid-1_event-1', 'uid-1', 'reviewer-uid', 'Wrong reference');

    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'rejected', rejectionReason: 'Wrong reference' })
    );
    expect(createUserNotification).toHaveBeenCalledWith('uid-1', expect.objectContaining({
      type: 'event_payment_status',
      body: expect.stringContaining('Wrong reference'),
    }));
    expect(result.success).toBe(true);
  });

  it('tells the leader who registered someone, naming the person and the reason', async () => {
    updateDoc.mockResolvedValue();

    await rejectEventRegistration('reg-1', 'leader-1', 'reviewer-uid', 'Wrong reference', 'Alice Adams');

    expect(createUserNotification).toHaveBeenCalledWith('leader-1', {
      type: 'event_payment_status',
      title: 'Payment Not Approved',
      body: "Alice Adams's event payment was rejected: Wrong reference",
    });
  });

  it('asks the leader to resubmit the person’s proof when no reason is given', async () => {
    updateDoc.mockResolvedValue();

    await rejectEventRegistration('reg-1', 'leader-1', 'reviewer-uid', '', 'Alice Adams');

    expect(createUserNotification).toHaveBeenCalledWith('leader-1', expect.objectContaining({
      body: "Alice Adams's event payment was not approved. Please resubmit their proof of payment or contact the church office.",
    }));
  });

  it('keeps the wording for a member’s own registration', async () => {
    updateDoc.mockResolvedValue();

    await rejectEventRegistration('uid-1_event-1', 'uid-1', 'reviewer-uid');

    expect(createUserNotification).toHaveBeenCalledWith('uid-1', expect.objectContaining({
      body: 'Your event payment was not approved. Please resubmit or contact the church office.',
    }));
  });

  it('throws on failure', async () => {
    updateDoc.mockRejectedValue(new Error('Network error'));

    await expect(rejectEventRegistration('uid-1_event-1', 'uid-1', 'reviewer')).rejects.toMatchObject({
      message: 'Failed to reject payment.',
    });
  });
});

describe('getEventRegistrationCount', () => {
  it('counts how many registrations exist for the event', async () => {
    getDocs.mockResolvedValue({
      docs: [
        { id: 'a_event-1', data: () => ({ eventId: 'event-1' }) },
        { id: 'b_event-1', data: () => ({ eventId: 'event-1' }) },
        { id: 'c_event-1', data: () => ({ eventId: 'event-1' }) },
      ],
    });

    const count = await getEventRegistrationCount('event-1');

    expect(count).toBe(3);
  });

  it('returns 0 instead of throwing when the query fails', async () => {
    getDocs.mockRejectedValue(new Error('Network error'));

    const count = await getEventRegistrationCount('event-1');

    expect(count).toBe(0);
  });
});

describe('registerAttendee', () => {
  const attendee = { name: 'Alice Adams', phone: '082 123 4567' };

  it('asks the function to register them and passes on what it says happens next', async () => {
    const callable = jest.fn().mockResolvedValue({
      data: { registrationId: 'reg-1', status: 'awaiting_payment', requiresPayment: true, registrationFee: 250 },
    });
    httpsCallable.mockReturnValue(callable);

    const result = await registerAttendee(mockPaidEvent, attendee);

    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'registerEventAttendee');
    expect(callable).toHaveBeenCalledWith({
      eventId: 'event-1',
      attendeeName: 'Alice Adams',
      attendeePhone: '082 123 4567',
      congregation: undefined,
      district: undefined,
      allowDuplicate: undefined,
    });
    expect(result).toEqual({
      success: true,
      registrationId: 'reg-1',
      status: 'awaiting_payment',
      requiresPayment: true,
      registrationFee: 250,
    });
  });

  it('passes an admin’s choice of congregation, and a confirmation to go ahead anyway', async () => {
    const callable = jest.fn().mockResolvedValue({ data: {} });
    httpsCallable.mockReturnValue(callable);

    await registerAttendee(mockPaidEvent, {
      ...attendee,
      congregation: 'Despatch',
      district: 'Eastern Cape',
      allowDuplicate: true,
    });

    expect(callable).toHaveBeenCalledWith(
      expect.objectContaining({ congregation: 'Despatch', district: 'Eastern Cape', allowDuplicate: true })
    );
  });

  it('passes on the function’s own wording and its code', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    httpsCallable.mockReturnValue(
      jest.fn().mockRejectedValue({ code: 'functions/already-exists', message: 'Alice Adams is already registered for this event.' })
    );

    await expect(registerAttendee(mockPaidEvent, attendee)).rejects.toEqual({
      code: 'functions/already-exists',
      message: 'Alice Adams is already registered for this event.',
    });
    consoleError.mockRestore();
  });

  it('falls back to a generic message', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    httpsCallable.mockReturnValue(jest.fn().mockRejectedValue(new Error('')));

    await expect(registerAttendee(mockPaidEvent, attendee)).rejects.toMatchObject({
      message: 'Failed to register this person.',
    });
    consoleError.mockRestore();
  });
});

describe('cancelAttendee', () => {
  it('asks the function to cancel the registration', async () => {
    const callable = jest.fn().mockResolvedValue({ data: { success: true } });
    httpsCallable.mockReturnValue(callable);

    await expect(cancelAttendee('reg-1')).resolves.toEqual({ success: true });

    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'cancelEventAttendee');
    expect(callable).toHaveBeenCalledWith({ registrationId: 'reg-1' });
  });

  it('passes on why it could not', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    httpsCallable.mockReturnValue(
      jest.fn().mockRejectedValue({ message: "A payment has already been submitted for this registration, so it can't be cancelled here." })
    );

    await expect(cancelAttendee('reg-1')).rejects.toEqual({
      message: "A payment has already been submitted for this registration, so it can't be cancelled here.",
    });
    consoleError.mockRestore();
  });
});

describe('getAttendeesRegisteredBy', () => {
  const docs = [
    { id: 'r3', data: () => ({ userName: 'Zed Zulu', eventDate: new Date('2026-09-01') }) },
    { id: 'r1', data: () => ({ userName: 'Bob Brown', eventDate: new Date('2026-08-01') }) },
    { id: 'r2', data: () => ({ userName: 'Alice Adams', eventDate: new Date('2026-09-01') }) },
  ];

  it('lists a leader’s guests for their congregation, soonest event first and then by name', async () => {
    getDocs.mockResolvedValue({ docs });

    const result = await getAttendeesRegisteredBy({ uid: 'leader-1', role: 'leader', congregation: 'Ceres' });

    expect(result.map(r => r.id)).toEqual(['r1', 'r2', 'r3']);
    expect(where).toHaveBeenCalledWith('registeredBy', '==', 'leader-1');
    expect(where).toHaveBeenCalledWith('congregation', '==', 'Ceres');
  });

  it('is not limited to one congregation for an admin', async () => {
    getDocs.mockResolvedValue({ docs: [] });

    await getAttendeesRegisteredBy({ uid: 'admin-1', role: 'admin', congregation: 'Paarl' });

    expect(where).toHaveBeenCalledWith('registeredBy', '==', 'admin-1');
    expect(where).not.toHaveBeenCalledWith('congregation', '==', expect.anything());
  });

  it('copes with dates that are Firestore Timestamps', async () => {
    getDocs.mockResolvedValue({
      docs: [
        { id: 'late', data: () => ({ userName: 'A', eventDate: { toDate: () => new Date('2026-10-01') } }) },
        { id: 'early', data: () => ({ userName: 'B', eventDate: { seconds: new Date('2026-09-01').getTime() / 1000 } }) },
      ],
    });

    const result = await getAttendeesRegisteredBy({ uid: 'leader-1', role: 'leader', congregation: 'Ceres' });

    expect(result.map(r => r.id)).toEqual(['early', 'late']);
  });

  it('returns an empty list instead of throwing when the read fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    getDocs.mockRejectedValue(new Error('permission-denied'));

    await expect(getAttendeesRegisteredBy({ uid: 'leader-1', role: 'leader', congregation: 'Ceres' })).resolves.toEqual([]);
    consoleError.mockRestore();
  });
});
