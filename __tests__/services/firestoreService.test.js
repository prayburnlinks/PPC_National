import {
  getPrayerRequests,
  getUserPrayerRequests,
  submitPrayerRequest,
  reportPrayerRequest,
  blockMember,
  prayForRequest,
  getLiveStatus,
  incrementEventAttendeeCount,
  getUpcomingEvents,
  getUserProfile,
  updateUserProfile,
  createUserNotification,
  subscribeToNotifications,
  markAllNotificationsAsRead,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../../services/firestoreService';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db, path) => ({ path })),
  doc: jest.fn((db, ...segments) => ({ path: segments.join('/') })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  getDocsFromServer: jest.fn(),
  onSnapshot: jest.fn(),
  addDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn((...args) => args),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  increment: jest.fn((n) => ({ __increment: n })),
  arrayUnion: jest.fn((v) => ({ __arrayUnion: v })),
  arrayRemove: jest.fn((v) => ({ __arrayRemove: v })),
  serverTimestamp: jest.fn(() => new Date('2026-01-01')),
  runTransaction: jest.fn(),
  writeBatch: jest.fn(),
  Timestamp: { fromDate: jest.fn((d) => ({ __timestamp: d.toISOString() })) },
}));

// Posting now goes through a callable so the profanity filter runs somewhere
// the member cannot reach — see submitPrayerRequest in functions/index.js.
const mockCallable = jest.fn();
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockCallable),
}));

import {
  getDoc,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  writeBatch,
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
  it('posts through the callable and never writes to Firestore directly', async () => {
    mockCallable.mockResolvedValue({ data: { success: true } });

    const result = await submitPrayerRequest('uid-1', {
      title: 'Heal my father',
      body: 'Please pray',
      scope: 'national',
    });

    expect(mockCallable).toHaveBeenCalledWith({
      title: 'Heal my father',
      body: 'Please pray',
      scope: 'national',
    });
    // firestore.rules refuses client creates on prayerRequests, so a direct
    // write here would fail in production even if the test passed.
    expect(addDoc).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('surfaces the filter rejection wording rather than a generic failure', async () => {
    mockCallable.mockRejectedValue(
      new Error('Please rephrase your request — it contains language that is not allowed on the prayer wall.')
    );

    await expect(
      submitPrayerRequest('uid-1', { title: 'T', body: 'B', scope: 'national' })
    ).rejects.toMatchObject({
      message: expect.stringContaining('rephrase'),
    });
  });
});

describe('prayer wall moderation', () => {
  it('reports a request through the callable', async () => {
    mockCallable.mockResolvedValue({ data: { success: true } });

    const result = await reportPrayerRequest('req-9', 'abusive language');

    expect(mockCallable).toHaveBeenCalledWith({ requestId: 'req-9', reason: 'abusive language' });
    expect(result.success).toBe(true);
  });

  it('blocking writes only to the blocker\'s own profile', async () => {
    updateDoc.mockResolvedValue(undefined);

    await blockMember('uid-1', 'uid-2');

    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/uid-1' }),
      { blockedUsers: { __arrayUnion: 'uid-2' } }
    );
  });

  it('refuses to let a member block themselves', async () => {
    await expect(blockMember('uid-1', 'uid-1')).rejects.toMatchObject({
      message: 'Failed to block this member',
    });
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('hides requests the viewer reported, blocked, or an admin removed', async () => {
    getDocs.mockResolvedValue(
      makeQuerySnap([
        ['keep',      { body: 'visible', createdBy: 'uid-9', createdAt: null }],
        ['reported',  { body: 'x', createdBy: 'uid-9', reportedBy: ['uid-1'], createdAt: null }],
        ['blocked',   { body: 'x', createdBy: 'uid-bad', createdAt: null }],
        ['hidden',    { body: 'x', createdBy: 'uid-9', hidden: true, createdAt: null }],
      ])
    );

    const result = await getPrayerRequests('national', null, {
      uid: 'uid-1',
      blockedUsers: ['uid-bad'],
    });

    expect(result.map(r => r.id)).toEqual(['keep']);
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

describe('createEvent', () => {
  const adminUser = { uid: 'admin-1' };

  it('writes an event doc with the expected shape', async () => {
    addDoc.mockResolvedValue({ id: 'event-1' });

    const result = await createEvent(adminUser, {
      name: 'Youth Rally',
      description: 'A night of worship',
      category: 'Youth',
      venue: 'Durban City Hall',
      eventDate: new Date('2026-08-01T08:00:00'),
      requiresPayment: false,
    });

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: 'Youth Rally',
        venue: 'Durban City Hall',
        attendeeCount: 0,
        requiresPayment: false,
        registrationFee: 0,
        createdBy: 'admin-1',
      })
    );
    expect(result).toEqual({ success: true, eventId: 'event-1' });
  });

  it('carries the registration fee and reference only when payment is required', async () => {
    addDoc.mockResolvedValue({ id: 'event-2' });

    await createEvent(adminUser, {
      name: 'Sisters Conference',
      category: 'Women',
      venue: 'Cape Town City Hall',
      eventDate: new Date('2026-09-01T08:00:00'),
      requiresPayment: true,
      registrationFee: 100,
      paymentReference: 'Sisters2026',
    });

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        requiresPayment: true,
        registrationFee: 100,
        paymentReference: 'Sisters2026',
      })
    );
  });

  it('throws a friendly error when the write fails', async () => {
    addDoc.mockRejectedValue(new Error('Permission denied'));

    await expect(
      createEvent(adminUser, {
        name: 'Youth Rally',
        category: 'Youth',
        venue: 'Durban City Hall',
        eventDate: new Date('2026-08-01T08:00:00'),
      })
    ).rejects.toEqual({ message: 'Permission denied' });
  });
});

describe('updateEvent', () => {
  it('writes the updated fields to the event doc', async () => {
    updateDoc.mockResolvedValue();

    const result = await updateEvent('event-1', {
      name: 'Youth Rally (Updated)',
      category: 'Youth',
      venue: 'Durban City Hall',
      eventDate: new Date('2026-08-01T08:00:00'),
      requiresPayment: false,
    });

    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: 'Youth Rally (Updated)',
        venue: 'Durban City Hall',
        requiresPayment: false,
        registrationFee: 0,
      })
    );
    expect(result).toEqual({ success: true });
  });

  it('throws a friendly error when the write fails', async () => {
    updateDoc.mockRejectedValue(new Error('Permission denied'));

    await expect(
      updateEvent('event-1', {
        name: 'Youth Rally',
        category: 'Youth',
        venue: 'Durban City Hall',
        eventDate: new Date('2026-08-01T08:00:00'),
      })
    ).rejects.toEqual({ message: 'Permission denied' });
  });
});

describe('deleteEvent', () => {
  it('deletes the event doc', async () => {
    deleteDoc.mockResolvedValue();

    const result = await deleteEvent('event-1');

    expect(deleteDoc).toHaveBeenCalledWith(expect.anything());
    expect(result).toEqual({ success: true });
  });

  it('throws a friendly error when the delete fails', async () => {
    deleteDoc.mockRejectedValue(new Error('Permission denied'));

    await expect(deleteEvent('event-1')).rejects.toEqual({ message: 'Permission denied' });
  });
});

describe('subscribeToNotifications', () => {
  const docOf = (id, data) => ({ id, data: () => data });
  const snapshotOf = (docs, changes = []) => ({
    docs,
    docChanges: () => changes.map(([type, doc]) => ({ type, doc })),
  });

  it('listens to the member\'s own notifications feed and returns the unsubscribe', () => {
    const unsubscribe = jest.fn();
    onSnapshot.mockReturnValue(unsubscribe);

    const result = subscribeToNotifications('uid-1', jest.fn());

    expect(onSnapshot.mock.calls[0][0]).toEqual({ path: 'users' });
    expect(result).toBe(unsubscribe);
  });

  it('hands over the feed newest first, with dates parsed, and says which were just added', () => {
    const onChange = jest.fn();
    onSnapshot.mockImplementation((ref, next) => next(snapshotOf(
      [
        docOf('old', { title: 'Old', createdAt: { toDate: () => new Date('2026-11-01T08:00:00Z') }, read: true }),
        docOf('new', { title: 'New', createdAt: { toDate: () => new Date('2026-11-12T08:00:00Z') }, read: false }),
      ],
      [['added', docOf('new', {})], ['modified', docOf('old', {})]]
    )));

    subscribeToNotifications('uid-1', onChange);

    const { notifications, addedIds } = onChange.mock.calls[0][0];
    expect(notifications.map(n => n.id)).toEqual(['new', 'old']);
    expect(notifications[0]).toMatchObject({ title: 'New', read: false });
    expect(notifications[0].createdAt).toEqual(new Date('2026-11-12T08:00:00Z'));
    expect(addedIds).toEqual(['new']);
  });

  it('puts a notification still waiting for its server timestamp at the top', () => {
    const onChange = jest.fn();
    onSnapshot.mockImplementation((ref, next) => next(snapshotOf([
      docOf('settled', { createdAt: { toDate: () => new Date('2026-11-12T08:00:00Z') } }),
      docOf('pending', { createdAt: null }),
    ])));

    subscribeToNotifications('uid-1', onChange);

    expect(onChange.mock.calls[0][0].notifications.map(n => n.id)).toEqual(['pending', 'settled']);
  });

  it('reports a listener failure to the caller instead of throwing', () => {
    const onError = jest.fn();
    const error = new Error('permission-denied');
    jest.spyOn(console, 'error').mockImplementation(() => {});
    onSnapshot.mockImplementation((ref, next, fail) => fail(error));

    expect(() => subscribeToNotifications('uid-1', jest.fn(), onError)).not.toThrow();

    expect(onError).toHaveBeenCalledWith(error);
    console.error.mockRestore();
  });
});

describe('markAllNotificationsAsRead', () => {
  const makeBatch = (commit = jest.fn().mockResolvedValue()) => ({ update: jest.fn(), commit });

  it('marks each notification read, and nothing else', async () => {
    const batch = makeBatch();
    writeBatch.mockReturnValue(batch);

    const result = await markAllNotificationsAsRead('uid-1', ['n1', 'n2']);

    expect(batch.update).toHaveBeenCalledTimes(2);
    expect(batch.update).toHaveBeenCalledWith({ path: 'users/uid-1/notifications/n1' }, { read: true });
    expect(batch.update).toHaveBeenCalledWith({ path: 'users/uid-1/notifications/n2' }, { read: true });
    expect(batch.commit).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true });
  });

  it('splits a long backlog into batches under the 500-write limit', async () => {
    const batches = [];
    writeBatch.mockImplementation(() => { const b = makeBatch(); batches.push(b); return b; });
    const ids = Array.from({ length: 950 }, (_, i) => `n${i}`);

    await markAllNotificationsAsRead('uid-1', ids);

    expect(batches.map(b => b.update.mock.calls.length)).toEqual([400, 400, 150]);
    batches.forEach(b => expect(b.commit).toHaveBeenCalledTimes(1));
  });

  it('writes nothing for an empty list', async () => {
    const result = await markAllNotificationsAsRead('uid-1', []);

    expect(writeBatch).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it('reports failure instead of throwing', async () => {
    writeBatch.mockReturnValue(makeBatch(jest.fn().mockRejectedValue(new Error('offline'))));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(markAllNotificationsAsRead('uid-1', ['n1'])).resolves.toEqual({ success: false });

    console.error.mockRestore();
  });
});
