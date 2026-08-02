import {
  registerForEvent,
  getUserEventRegistrationsMap,
  getUserEventRegistrations,
  submitEventRegistrationPayment,
  getPendingEventRegistrations,
  approveEventRegistration,
  rejectEventRegistration,
} from '../../services/eventRegistrationService';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db, path) => ({ path })),
  doc: jest.fn((db, ...segments) => ({ path: segments.join('/') })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  query: jest.fn((...args) => args),
  where: jest.fn(),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(() => new Date('2026-01-01')),
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

import { getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
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

  it('throws on failure', async () => {
    updateDoc.mockRejectedValue(new Error('Network error'));

    await expect(rejectEventRegistration('uid-1_event-1', 'uid-1', 'reviewer')).rejects.toMatchObject({
      message: 'Failed to reject payment.',
    });
  });
});
