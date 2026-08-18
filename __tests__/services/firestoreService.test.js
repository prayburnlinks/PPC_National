import {
  getPrayerRequests,
  getUserPrayerRequests,
  submitPrayerRequest,
  prayForRequest,
  getLiveStatus,
  incrementEventAttendeeCount,
  getUpcomingEvents,
  getUserProfile,
  updateUserProfile,
  createUserNotification,
} from '../../services/firestoreService';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db, path) => ({ path })),
  doc: jest.fn((db, ...segments) => ({ path: segments.join('/') })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  getDocsFromServer: jest.fn(),
  addDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  query: jest.fn((...args) => args),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  increment: jest.fn((n) => ({ __increment: n })),
  arrayUnion: jest.fn((v) => ({ __arrayUnion: v })),
  arrayRemove: jest.fn((v) => ({ __arrayRemove: v })),
  serverTimestamp: jest.fn(() => new Date('2026-01-01')),
  runTransaction: jest.fn(),
}));

import {
  getDoc,
  getDocs,
  getDocsFromServer,
  addDoc,
  updateDoc,
  runTransaction,
} from 'firebase/firestore';

beforeEach(() => {
  jest.clearAllMocks();
});

// Helper to build a Firestore doc snapshot
const makeSnap = (id, data, exists = true) => ({
  id,
  exists: () => exists,
  data: () => data,
});

const makeQuerySnap = (rows) => ({
  docs: rows.map(([id, data]) => ({ ...makeSnap(id, data), id })),
});

describe('getPrayerRequests', () => {
  it('returns national requests by default', async () => {
    getDocs.mockResolvedValue(
      makeQuerySnap([
        ['req-1', { title: 'Prayer 1', body: 'Body 1', prayCount: 3, createdAt: null }],
      ])
    );

    const result = await getPrayerRequests('national', null);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('id', 'req-1');
  });

  it('returns district requests when scope is district and district provided', async () => {
    getDocs.mockResolvedValue(
      makeQuerySnap([
        ['req-2', { title: 'District Prayer', body: 'Body', prayCount: 0, createdAt: null }],
      ])
    );

    const result = await getPrayerRequests('district', 'Garden Route');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('req-2');
  });

  it('returns empty array on error', async () => {
    getDocs.mockRejectedValue(new Error('Network error'));

    const result = await getPrayerRequests('national', null);

    expect(result).toEqual([]);
  });
});

describe('getUserPrayerRequests', () => {
  it("returns the user's own submitted requests", async () => {
    getDocs.mockResolvedValue(
      makeQuerySnap([
        ['req-1', { title: 'Mine', body: 'Body', createdBy: 'uid-1', createdAt: null }],
      ])
    );

    const result = await getUserPrayerRequests('uid-1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('req-1');
  });

  it('returns empty array on error', async () => {
    getDocs.mockRejectedValue(new Error('Network error'));

    const result = await getUserPrayerRequests('uid-1');

    expect(result).toEqual([]);
  });
});

describe('submitPrayerRequest', () => {
  it('creates a prayer request with correct payload', async () => {
    addDoc.mockResolvedValue({ id: 'new-req' });

    const result = await submitPrayerRequest('uid-1', {
      title: 'Heal my father',
      body: 'Please pray',
      scope: 'national',
    });

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        createdBy: 'uid-1',
        scope: 'national',
        prayCount: 0,
        prayingBy: [],
      })
    );
    expect(result.success).toBe(true);
    expect(result.id).toBe('new-req');
  });

  it('throws on failure', async () => {
    addDoc.mockRejectedValue(new Error('Write failed'));

    await expect(
      submitPrayerRequest('uid-1', { title: 'T', body: 'B', scope: 'national' })
    ).rejects.toMatchObject({ message: 'Failed to submit prayer request' });
  });
});

describe('prayForRequest', () => {
  it('adds user to prayingBy when they have not prayed', async () => {
    runTransaction.mockImplementation(async (db, fn) => {
      const mockTx = {
        get: jest.fn().mockResolvedValue(
          makeSnap('req-1', { prayingBy: [], prayCount: 0 })
        ),
        update: jest.fn(),
      };
      return fn(mockTx);
    });

    const result = await prayForRequest('req-1', 'uid-1');

    expect(result.action).toBe('added');
  });

  it('removes user from prayingBy when they already prayed', async () => {
    runTransaction.mockImplementation(async (db, fn) => {
      const mockTx = {
        get: jest.fn().mockResolvedValue(
          makeSnap('req-1', { prayingBy: ['uid-1'], prayCount: 5 })
        ),
        update: jest.fn(),
      };
      return fn(mockTx);
    });

    const result = await prayForRequest('req-1', 'uid-1');

    expect(result.action).toBe('removed');
  });

  it('throws when the request does not exist', async () => {
    runTransaction.mockImplementation(async (db, fn) => {
      const mockTx = {
        get: jest.fn().mockResolvedValue(makeSnap('req-1', null, false)),
        update: jest.fn(),
      };
      return fn(mockTx);
    });

    await expect(prayForRequest('req-1', 'uid-1')).rejects.toMatchObject({
      message: 'Failed to update prayer',
    });
  });
});

describe('getLiveStatus', () => {
  it('returns stored config when the document exists', async () => {
    getDoc.mockResolvedValue(
      makeSnap('liveStatus', { isLive: true, platform: 'youtube', title: 'Sunday Service' })
    );

    const result = await getLiveStatus();

    expect(result.isLive).toBe(true);
    expect(result.title).toBe('Sunday Service');
  });

  it('returns safe defaults when document does not exist', async () => {
    getDoc.mockResolvedValue(makeSnap('liveStatus', null, false));

    const result = await getLiveStatus();

    expect(result.isLive).toBe(false);
    expect(result.platform).toBe('youtube');
  });

  it('returns safe defaults on error', async () => {
    getDoc.mockRejectedValue(new Error('Firestore error'));

    const result = await getLiveStatus();

    expect(result.isLive).toBe(false);
  });
});

describe('incrementEventAttendeeCount', () => {
  it('increments attendee count on the event', async () => {
    updateDoc.mockResolvedValue();

    await incrementEventAttendeeCount('event-1');

    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ attendeeCount: expect.objectContaining({ __increment: 1 }) })
    );
  });
});

describe('getUpcomingEvents', () => {
  // Error test runs first to avoid the module-level cache being populated
  it('returns empty array on error', async () => {
    getDocsFromServer.mockRejectedValue(new Error('Network error'));

    const result = await getUpcomingEvents();

    expect(result).toEqual([]);
  });

  it('returns upcoming events sorted by date, filtering out past events', async () => {
    const futureDate1 = new Date(Date.now() + 86400000); // tomorrow
    const futureDate2 = new Date(Date.now() + 172800000); // day after
    const pastDate = new Date(Date.now() - 86400000); // yesterday

    getDocsFromServer.mockResolvedValue(
      makeQuerySnap([
        ['e1', { eventDate: futureDate2, name: 'Event 2' }],
        ['e2', { eventDate: pastDate, name: 'Past Event' }],
        ['e3', { eventDate: futureDate1, name: 'Event 1' }],
      ])
    );

    const result = await getUpcomingEvents(4);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Event 1');
  });
});

describe('getUserProfile', () => {
  it('returns user data when document exists', async () => {
    getDoc.mockResolvedValue(
      makeSnap('uid-1', { name: 'Alice', role: 'member', createdAt: null })
    );

    const result = await getUserProfile('uid-1');

    expect(result).toMatchObject({ uid: 'uid-1', name: 'Alice' });
  });

  it('returns null when document does not exist', async () => {
    getDoc.mockResolvedValue(makeSnap('uid-1', null, false));

    const result = await getUserProfile('uid-1');

    expect(result).toBeNull();
  });
});

describe('updateUserProfile', () => {
  it('only writes allowed fields', async () => {
    updateDoc.mockResolvedValue();

    await updateUserProfile('uid-1', {
      name: 'Bob',
      role: 'admin',
      status: 'approved',
    });

    const [, updates] = updateDoc.mock.calls[0];
    expect(updates).toHaveProperty('name', 'Bob');
    expect(updates).not.toHaveProperty('role');
    expect(updates).not.toHaveProperty('status');
  });

  it('keeps phoneNormalized in step when the number changes', async () => {
    updateDoc.mockResolvedValue();

    await updateUserProfile('uid-1', { phone: '073 481 0683' });

    const [, updates] = updateDoc.mock.calls[0];
    expect(updates).toHaveProperty('phone', '073 481 0683');
    // Without this, phone sign-in keeps matching the member's old number.
    expect(updates).toHaveProperty('phoneNormalized', '0734810683');
  });

  it('records an unusable number as null rather than a stale match', async () => {
    updateDoc.mockResolvedValue();

    await updateUserProfile('uid-1', { phone: 'not a number' });

    const [, updates] = updateDoc.mock.calls[0];
    expect(updates.phoneNormalized).toBeNull();
  });

  it('leaves phoneNormalized alone when the number is not being edited', async () => {
    updateDoc.mockResolvedValue();

    await updateUserProfile('uid-1', { name: 'Bob' });

    const [, updates] = updateDoc.mock.calls[0];
    expect(updates).not.toHaveProperty('phoneNormalized');
  });
});

describe('createUserNotification', () => {
  it('writes a notification doc with the expected shape', async () => {
    addDoc.mockResolvedValue({ id: 'notif-1' });

    const result = await createUserNotification('uid-1', {
      type: 'pop_status',
      title: 'Payment Approved',
      body: 'Thank you for your giving!',
    });

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'pop_status',
        title: 'Payment Approved',
        body: 'Thank you for your giving!',
        read: false,
      })
    );
    expect(result.success).toBe(true);
  });

  it('never throws — returns success:false on failure', async () => {
    addDoc.mockRejectedValue(new Error('Permission denied'));

    const result = await createUserNotification('uid-1', {
      type: 'approval_status',
      title: 'x',
      body: 'x',
    });

    expect(result.success).toBe(false);
  });
});
