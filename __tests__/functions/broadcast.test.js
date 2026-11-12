const { parseBroadcast, runBroadcast, TITLE_MAX, BODY_MAX } = require('../../functions/broadcast');

const TOKEN_A = 'ExponentPushToken[aaa]';
const TOKEN_B = 'ExponentPushToken[bbb]';
const TOKEN_C = 'ExponentPushToken[ccc]';

const FieldValue = { serverTimestamp: () => 'SERVER_TIMESTAMP' };
const sender = { uid: 'admin-1', name: 'Nadia' };

// Members as the users collection holds them.
const members = {
  'uid-1': { status: 'approved', district: 'Boland', congregation: 'Ceres' },
  'uid-2': { status: 'approved', district: 'Boland', congregation: 'Paarl' },
  'uid-3': { status: 'approved', district: 'Eden', congregation: 'Oudtshoorn' },
  'uid-4': { status: 'pending', district: 'Boland', congregation: 'Ceres' },
  'uid-5': { status: 'rejected', district: 'Eden', congregation: 'Oudtshoorn' },
};

const tokens = {
  [TOKEN_A]: { userId: 'uid-1' },
  [TOKEN_B]: { userId: 'uid-3' },
  [TOKEN_C]: { userId: 'uid-4' },
};

// An in-memory stand-in for the parts of the Admin SDK's Firestore that
// runBroadcast touches.
const makeDb = ({ users = members, pushTokens = tokens, failFeedWrites = false, failTokenLookup = false } = {}) => {
  const feed = []; // { uid, data }
  const records = {}; // broadcastId -> document
  const batchSizes = [];
  let nextId = 1;

  const userQuery = (filters) => ({
    where: (field, op, value) => userQuery([...filters, [field, value]]),
    get: async () => ({
      docs: Object.entries(users)
        .filter(([, data]) => filters.every(([field, value]) => data[field] === value))
        .map(([id]) => ({ id })),
    }),
  });

  const db = {
    collection: (name) => {
      if (name === 'users') {
        return {
          where: (field, op, value) => userQuery([[field, value]]),
          // A member's feed: `doc` is where the announcement is written, and the
          // unread count is whatever has been written to that feed so far.
          doc: (uid) => ({
            collection: () => ({
              doc: () => ({ uid }),
              where: () => ({
                count: () => ({
                  get: async () => ({ data: () => ({ count: feed.filter((entry) => entry.uid === uid).length }) }),
                }),
              }),
            }),
          }),
        };
      }
      if (name === 'broadcasts') {
        return {
          doc: () => {
            const id = `broadcast-${nextId++}`;
            return {
              id,
              set: async (data) => { records[id] = { ...data }; },
              update: async (data) => { Object.assign(records[id], data); },
            };
          },
        };
      }
      return {
        where: (field, op, ids) => ({
          get: async () => {
            if (failTokenLookup) throw new Error('unavailable');
            return {
              docs: Object.entries(pushTokens)
                .filter(([, token]) => ids.includes(token.userId))
                .map(([id, token]) => ({ id, data: () => token })),
            };
          },
        }),
        doc: (id) => ({ path: `pushTokens/${id}` }),
      };
    },
    batch: () => {
      const ops = [];
      return {
        set: (ref, data) => ops.push({ kind: 'set', ref, data }),
        delete: () => ops.push({ kind: 'delete' }),
        commit: async () => {
          if (failFeedWrites && ops.some((op) => op.kind === 'set')) throw new Error('write failed');
          batchSizes.push(ops.length);
          ops.filter((op) => op.kind === 'set').forEach((op) => feed.push({ uid: op.ref.uid, data: op.data }));
        },
      };
    },
  };

  return { db, feed, records, batchSizes };
};

const okFetch = () =>
  jest.fn(async (url, { body }) => ({
    ok: true,
    status: 200,
    json: async () => ({ data: JSON.parse(body).map(() => ({ status: 'ok', id: 't' })) }),
  }));

const send = (db, data, fetchImpl = okFetch()) =>
  runBroadcast(db, { FieldValue, sender, data, pushOptions: { fetchImpl } });

const valid = { title: 'Convention', body: 'Registration is open.', audience: { type: 'all' } };

describe('parseBroadcast', () => {
  it('trims the text and returns the audience', () => {
    expect(
      parseBroadcast({ title: '  Convention ', body: ' Open now ', audience: { type: 'district', value: ' Boland ' } })
    ).toEqual({ title: 'Convention', body: 'Open now', audience: { type: 'district', value: 'Boland' } });
  });

  it('drops any value sent with the everyone audience', () => {
    expect(parseBroadcast({ ...valid, audience: { type: 'all', value: 'Boland' } }).audience).toEqual({
      type: 'all',
      value: null,
    });
  });

  it.each([
    ['a missing title', { ...valid, title: '  ' }],
    ['a missing message', { ...valid, body: '' }],
    ['a non-string title', { ...valid, title: 42 }],
    ['an over-long title', { ...valid, title: 'x'.repeat(TITLE_MAX + 1) }],
    ['an over-long message', { ...valid, body: 'x'.repeat(BODY_MAX + 1) }],
    ['an unknown audience', { ...valid, audience: { type: 'role', value: 'leader' } }],
    ['no audience', { title: 'a', body: 'b' }],
    ['a district with no name', { ...valid, audience: { type: 'district', value: '' } }],
    ['a congregation with no name', { ...valid, audience: { type: 'congregation' } }],
    ['an over-long audience name', { ...valid, audience: { type: 'district', value: 'x'.repeat(101) } }],
    ['nothing at all', undefined],
  ])('rejects %s', (label, data) => {
    expect(() => parseBroadcast(data)).toThrow(expect.objectContaining({ code: 'invalid-argument' }));
  });

  it('accepts a title and message exactly at the limit', () => {
    expect(() =>
      parseBroadcast({ ...valid, title: 'x'.repeat(TITLE_MAX), body: 'x'.repeat(BODY_MAX) })
    ).not.toThrow();
  });
});

describe('runBroadcast', () => {
  it('adds the announcement to every approved member\'s notifications', async () => {
    const { db, feed } = makeDb();

    const result = await send(db, valid);

    // The pending and rejected accounts are left out.
    expect(feed.map((entry) => entry.uid).sort()).toEqual(['uid-1', 'uid-2', 'uid-3']);
    expect(feed[0].data).toEqual({
      type: 'announcement',
      title: 'Convention',
      body: 'Registration is open.',
      read: false,
      createdAt: 'SERVER_TIMESTAMP',
      broadcastId: result.broadcastId,
    });
  });

  it('sets each phone\'s icon to that member\'s unread total, which already includes the announcement', async () => {
    const { db } = makeDb();
    const fetchImpl = okFetch();

    await send(db, valid, fetchImpl);

    const sent = JSON.parse(fetchImpl.mock.calls[0][1].body);
    // Each member has only the announcement in their feed so far.
    expect(sent.map((message) => message.badge)).toEqual([1, 1]);
  });

  it('pushes it to those members\' devices only', async () => {
    const { db } = makeDb();
    const fetchImpl = okFetch();

    const result = await send(db, valid, fetchImpl);

    // uid-4 has a device but is pending, so TOKEN_C gets nothing.
    const sent = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(sent.map((message) => message.to).sort()).toEqual([TOKEN_A, TOKEN_B]);
    expect(sent[0]).toMatchObject({
      title: 'Convention',
      body: 'Registration is open.',
      data: { type: 'announcement', broadcastId: result.broadcastId },
    });
    expect(result).toMatchObject({ recipients: 3, devices: 2, failed: 0, pushFailed: false });
  });

  it('reaches only the chosen district', async () => {
    const { db, feed } = makeDb();

    const result = await send(db, { ...valid, audience: { type: 'district', value: 'Boland' } });

    expect(feed.map((entry) => entry.uid).sort()).toEqual(['uid-1', 'uid-2']);
    expect(result.recipients).toBe(2);
  });

  it('reaches only the chosen congregation', async () => {
    const { db, feed } = makeDb();

    await send(db, { ...valid, audience: { type: 'congregation', value: 'Paarl' } });

    expect(feed.map((entry) => entry.uid)).toEqual(['uid-2']);
  });

  it('records who sent it, to whom, and how it went', async () => {
    const { db, records } = makeDb();

    const result = await send(db, { ...valid, audience: { type: 'district', value: 'Eden' } });

    expect(records[result.broadcastId]).toEqual({
      title: 'Convention',
      body: 'Registration is open.',
      audience: { type: 'district', value: 'Eden' },
      sentBy: 'admin-1',
      sentByName: 'Nadia',
      sentAt: 'SERVER_TIMESTAMP',
      status: 'sent',
      recipients: 1,
      devices: 1,
      failed: 0,
      pushFailed: false,
    });
  });

  it('refuses, and writes nothing, when nobody matches', async () => {
    const { db, feed, records } = makeDb();
    const fetchImpl = okFetch();

    await expect(
      send(db, { ...valid, audience: { type: 'congregation', value: 'Nowhere' } }, fetchImpl)
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    expect(feed).toEqual([]);
    expect(records).toEqual({});
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects invalid input before touching the database', async () => {
    const { db, records } = makeDb();

    await expect(send(db, { ...valid, title: '' })).rejects.toMatchObject({ code: 'invalid-argument' });

    expect(records).toEqual({});
  });

  it('writes a large audience\'s notifications in batches under the Firestore limit', async () => {
    const users = {};
    for (let i = 0; i < 450; i++) users[`uid-${i}`] = { status: 'approved', district: 'Boland', congregation: 'Ceres' };
    const { db, feed, batchSizes } = makeDb({ users, pushTokens: {} });

    const result = await send(db, valid);

    expect(feed).toHaveLength(450);
    expect(Math.max(...batchSizes)).toBeLessThanOrEqual(400);
    expect(result.recipients).toBe(450);
  });

  it('still reports success, with the shortfall, when Expo cannot be reached', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { db, records } = makeDb();
    const fetchImpl = jest.fn(async () => { throw new Error('network down'); });

    const result = await send(db, valid, fetchImpl);

    // It is in every feed, so the admin must not be told to send it again.
    expect(result).toMatchObject({ recipients: 3, devices: 0, failed: 2, pushFailed: false });
    expect(records[result.broadcastId].status).toBe('sent');
    consoleError.mockRestore();
  });

  it('still reports success, flagged, when the device lookup fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { db, feed, records } = makeDb({ failTokenLookup: true });

    const result = await send(db, valid);

    expect(feed).toHaveLength(3);
    expect(result).toMatchObject({ recipients: 3, devices: 0, pushFailed: true });
    expect(records[result.broadcastId]).toMatchObject({ status: 'sent', pushFailed: true });
    consoleError.mockRestore();
  });

  it('marks the record failed, and tells the admin to check before resending, when the writes fail', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { db, records } = makeDb({ failFeedWrites: true });
    const fetchImpl = okFetch();

    await expect(send(db, valid, fetchImpl)).rejects.toMatchObject({
      code: 'internal',
      message: expect.stringContaining('Recent announcements'),
    });

    // The record existed before the writes began, so the admin can see it.
    const [record] = Object.values(records);
    expect(record).toMatchObject({ title: 'Convention', status: 'failed' });
    expect(fetchImpl).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
