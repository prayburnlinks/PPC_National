const {
  chunk,
  isExpoPushToken,
  buildMessages,
  sendExpoPush,
  pushToMembers,
  deliverPush,
} = require('../../functions/push');

const TOKEN_A = 'ExponentPushToken[aaa]';
const TOKEN_B = 'ExponentPushToken[bbb]';

// Expo answers a batch with one ticket per message, in order.
const okTicket = () => ({ status: 'ok', id: 'ticket' });
const deadTicket = () => ({
  status: 'error',
  message: 'not registered',
  details: { error: 'DeviceNotRegistered' },
});

const makeFetch = (ticketFor = okTicket) =>
  jest.fn(async (url, { body }) => ({
    ok: true,
    status: 200,
    json: async () => ({ data: JSON.parse(body).map((message) => ticketFor(message)) }),
  }));

const sentBodies = (fetchImpl) => fetchImpl.mock.calls.map(([, init]) => JSON.parse(init.body));

// Just enough of the Admin SDK's Firestore for the push helpers.
// `tokensByUser` is { uid: [expoToken, ...] }; `unreadByUser` is { uid: count }
// for the unread-notification counts behind each device's icon badge.
const makeDb = (tokensByUser = {}, unreadByUser = {}, { failCountFor = [] } = {}) => {
  const queries = [];
  const countQueries = [];
  const deleted = [];
  const batchSizes = [];

  const db = {
    collection: jest.fn((name) => {
      if (name === 'users') {
        return {
          doc: (uid) => ({
            collection: (sub) => ({
              where: (field, op, value) => ({
                count: () => ({
                  get: async () => {
                    countQueries.push({ uid, sub, field, op, value });
                    if (failCountFor.includes(uid)) throw new Error('count failed');
                    return { data: () => ({ count: unreadByUser[uid] ?? 0 }) };
                  },
                }),
              }),
            }),
          }),
        };
      }
      return {
        where: (field, op, ids) => ({
          get: async () => {
            queries.push({ name, field, op, ids });
            return {
              docs: ids.flatMap((id) =>
                (tokensByUser[id] || []).map((token) => ({ id: token, data: () => ({ userId: id }) }))
              ),
            };
          },
        }),
        doc: (id) => ({ path: `${name}/${id}` }),
      };
    }),
    batch: () => {
      const ops = [];
      return {
        delete: (ref) => ops.push(ref.path.split('/')[1]),
        commit: async () => {
          batchSizes.push(ops.length);
          deleted.push(...ops);
        },
      };
    },
  };

  return { db, queries, countQueries, deleted, batchSizes };
};

const notification = { type: 'approval_status', title: 'Account Approved', body: 'Welcome!' };
const data = { type: 'approval_status', notificationId: 'notif-1' };

describe('chunk', () => {
  it('splits a list into groups of at most the given size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
  });
});

describe('isExpoPushToken', () => {
  it.each([TOKEN_A, 'ExpoPushToken[xyz]'])('accepts %s', (token) => {
    expect(isExpoPushToken(token)).toBe(true);
  });

  it.each(['ExponentPushToken[]', 'ExponentPushToken', 'fcm-native-token', '', null, undefined, 42])(
    'rejects %p',
    (value) => {
      expect(isExpoPushToken(value)).toBe(false);
    }
  );
});

describe('buildMessages', () => {
  it('builds one high-priority message per token carrying the data the app routes a tap by', () => {
    expect(buildMessages([TOKEN_A, TOKEN_B], notification, data)).toEqual([
      {
        to: TOKEN_A,
        title: 'Account Approved',
        body: 'Welcome!',
        sound: 'default',
        channelId: 'default',
        priority: 'high',
        data,
      },
      expect.objectContaining({ to: TOKEN_B }),
    ]);
  });

  it('sends no badge unless it is given one, so an icon is never changed by accident', () => {
    const [message] = buildMessages([TOKEN_A], notification, data);
    expect(message).not.toHaveProperty('badge');
  });

  it("puts each device's own number on its message, including a 0 that clears the icon", () => {
    const messages = buildMessages([TOKEN_A, TOKEN_B], notification, data, { [TOKEN_A]: 3, [TOKEN_B]: 0 });
    expect(messages[0].badge).toBe(3);
    expect(messages[1].badge).toBe(0);
  });

  it('leaves a device that has no number without a badge', () => {
    const messages = buildMessages([TOKEN_A, TOKEN_B], notification, data, { [TOKEN_A]: 2 });
    expect(messages[0].badge).toBe(2);
    expect(messages[1]).not.toHaveProperty('badge');
  });
});

describe('sendExpoPush', () => {
  const messages = (count) => buildMessages(
    Array.from({ length: count }, (_, i) => `ExponentPushToken[${i}]`),
    notification,
    data
  );

  it('posts the messages to Expo as JSON, with no auth header by default', async () => {
    const fetchImpl = makeFetch();

    await sendExpoPush(messages(2), { fetchImpl });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://exp.host/--/api/v2/push/send');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers.Authorization).toBeUndefined();
    expect(JSON.parse(init.body)).toHaveLength(2);
  });

  it('sends the access token when one is configured', async () => {
    const fetchImpl = makeFetch();

    await sendExpoPush(messages(1), { fetchImpl, accessToken: 'secret' });

    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe('Bearer secret');
  });

  it('splits more than 100 messages across requests', async () => {
    const fetchImpl = makeFetch();

    const result = await sendExpoPush(messages(250), { fetchImpl });

    expect(sentBodies(fetchImpl).map((batch) => batch.length)).toEqual([100, 100, 50]);
    expect(result).toEqual({ accepted: 250, failed: 0, deadTokens: [] });
  });

  it('returns the tokens Expo says are no longer registered, even from a later batch', async () => {
    const dead = 'ExponentPushToken[150]';
    const fetchImpl = makeFetch((message) => (message.to === dead ? deadTicket() : okTicket()));

    const result = await sendExpoPush(messages(250), { fetchImpl });

    expect(result.deadTokens).toEqual([dead]);
    expect(result.accepted).toBe(249);
    expect(result.failed).toBe(1);
  });

  it('keeps a token whose push failed for some other reason', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const fetchImpl = makeFetch(() => ({
      status: 'error',
      message: 'rate limited',
      details: { error: 'MessageRateExceeded' },
    }));

    const result = await sendExpoPush(messages(1), { fetchImpl });

    expect(result).toEqual({ accepted: 0, failed: 1, deadTokens: [] });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('counts a request Expo itself fails as undelivered, and carries on with the next batch', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    let call = 0;
    const fetchImpl = jest.fn(async (url, { body }) => {
      call++;
      if (call === 1) return { ok: false, status: 503 };
      return { ok: true, status: 200, json: async () => ({ data: JSON.parse(body).map(okTicket) }) };
    });

    const result = await sendExpoPush(messages(150), { fetchImpl });

    expect(result).toEqual({ accepted: 50, failed: 100, deadTokens: [] });
    consoleError.mockRestore();
  });

  it('counts the batch as undelivered when Expo cannot be reached at all', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const fetchImpl = jest.fn(async () => { throw new Error('network down'); });

    const result = await sendExpoPush(messages(3), { fetchImpl });

    expect(result).toEqual({ accepted: 0, failed: 3, deadTokens: [] });
    consoleError.mockRestore();
  });
});

describe('pushToMembers', () => {
  it('pushes to every device of every member, looking members up 30 at a time', async () => {
    const userIds = Array.from({ length: 65 }, (_, i) => `uid-${i}`);
    const { db, queries } = makeDb({
      'uid-0': [TOKEN_A],
      'uid-40': [TOKEN_B, 'ExponentPushToken[ccc]'],
    });
    const fetchImpl = makeFetch();

    const result = await pushToMembers(db, userIds, notification, data, { fetchImpl });

    expect(queries.map((q) => q.ids.length)).toEqual([30, 30, 5]);
    expect(queries.every((q) => q.name === 'pushTokens' && q.field === 'userId' && q.op === 'in')).toBe(true);
    const [batch] = sentBodies(fetchImpl);
    expect(batch.map((message) => message.to).sort()).toEqual([TOKEN_A, 'ExponentPushToken[ccc]', TOKEN_B].sort());
    expect(result).toEqual({ devices: 3, failed: 0 });
  });

  it('ignores stored documents that are not Expo push tokens', async () => {
    const { db } = makeDb({ 'uid-1': ['not-a-token', TOKEN_A] });
    const fetchImpl = makeFetch();

    await pushToMembers(db, ['uid-1'], notification, data, { fetchImpl });

    expect(sentBodies(fetchImpl)[0].map((message) => message.to)).toEqual([TOKEN_A]);
  });

  it('sends nothing when none of the members has a registered device', async () => {
    const { db } = makeDb({});
    const fetchImpl = makeFetch();

    const result = await pushToMembers(db, ['uid-1'], notification, data, { fetchImpl });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toEqual({ devices: 0, failed: 0 });
  });

  it('forgets devices Expo reports as gone, and keeps the rest', async () => {
    const { db, deleted } = makeDb({ 'uid-1': [TOKEN_A, TOKEN_B] });
    const fetchImpl = makeFetch((message) => (message.to === TOKEN_B ? deadTicket() : okTicket()));

    const result = await pushToMembers(db, ['uid-1'], notification, data, { fetchImpl });

    expect(deleted).toEqual([TOKEN_B]);
    expect(result).toEqual({ devices: 1, failed: 1 });
  });

  it('removes dead devices in batches under the Firestore write limit', async () => {
    const tokens = Array.from({ length: 450 }, (_, i) => `ExponentPushToken[dead${i}]`);
    const { db, deleted, batchSizes } = makeDb({ 'uid-1': tokens });
    const fetchImpl = makeFetch(deadTicket);

    await pushToMembers(db, ['uid-1'], notification, data, { fetchImpl });

    expect(deleted).toHaveLength(450);
    expect(Math.max(...batchSizes)).toBeLessThanOrEqual(400);
  });
});

describe('pushToMembers badge', () => {
  it("puts each member's own unread total on their devices", async () => {
    const { db } = makeDb({ 'uid-1': [TOKEN_A, TOKEN_B], 'uid-2': ['ExponentPushToken[ccc]'] }, { 'uid-1': 4, 'uid-2': 1 });
    const fetchImpl = makeFetch();

    await pushToMembers(db, ['uid-1', 'uid-2'], notification, data, { fetchImpl });

    const badges = Object.fromEntries(sentBodies(fetchImpl)[0].map((m) => [m.to, m.badge]));
    expect(badges).toEqual({ [TOKEN_A]: 4, [TOKEN_B]: 4, 'ExponentPushToken[ccc]': 1 });
  });

  it('counts only unread notifications in the member’s own feed, once per member however many phones they have', async () => {
    const { db, countQueries } = makeDb({ 'uid-1': [TOKEN_A, TOKEN_B] }, { 'uid-1': 2 });

    await pushToMembers(db, ['uid-1'], notification, data, { fetchImpl: makeFetch() });

    expect(countQueries).toEqual([
      { uid: 'uid-1', sub: 'notifications', field: 'read', op: '==', value: false },
    ]);
  });

  it('counts nobody when no member has a device', async () => {
    const { db, countQueries } = makeDb({});

    await pushToMembers(db, ['uid-1'], notification, data, { fetchImpl: makeFetch() });

    expect(countQueries).toEqual([]);
  });

  it('still sends the push, without a badge, when a count cannot be read', async () => {
    const { db } = makeDb({ 'uid-1': [TOKEN_A], 'uid-2': [TOKEN_B] }, { 'uid-2': 5 }, { failCountFor: ['uid-1'] });
    const fetchImpl = makeFetch();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await pushToMembers(db, ['uid-1', 'uid-2'], notification, data, { fetchImpl });

    const byToken = Object.fromEntries(sentBodies(fetchImpl)[0].map((m) => [m.to, m]));
    expect(byToken[TOKEN_A]).not.toHaveProperty('badge');
    expect(byToken[TOKEN_B].badge).toBe(5);
    expect(result).toEqual({ devices: 2, failed: 0 });
    console.error.mockRestore();
  });

  it('looks counts up in groups rather than all at once for a large audience', async () => {
    const tokensByUser = {};
    const userIds = Array.from({ length: 45 }, (_, i) => `uid-${i}`);
    userIds.forEach((uid, i) => { tokensByUser[uid] = [`ExponentPushToken[t${i}]`]; });
    let running = 0;
    let peak = 0;
    const { db } = makeDb(tokensByUser);
    const original = db.collection.getMockImplementation();
    db.collection.mockImplementation((name) => {
      const c = original(name);
      if (name !== 'users') return c;
      return {
        doc: (uid) => ({
          collection: () => ({
            where: () => ({
              count: () => ({
                get: async () => {
                  running++;
                  peak = Math.max(peak, running);
                  await Promise.resolve();
                  running--;
                  return { data: () => ({ count: 1 }) };
                },
              }),
            }),
          }),
        }),
      };
    });

    await pushToMembers(db, userIds, notification, data, { fetchImpl: makeFetch() });

    expect(peak).toBeLessThanOrEqual(20);
    expect(peak).toBeGreaterThan(1);
  });
});

describe('deliverPush', () => {
  it("pushes to every device registered to the notification's owner", async () => {
    const { db, queries } = makeDb({ 'uid-1': [TOKEN_A, TOKEN_B] });
    const fetchImpl = makeFetch();

    await deliverPush(db, { userId: 'uid-1', notificationId: 'notif-1', notification }, { fetchImpl });

    expect(queries).toEqual([{ name: 'pushTokens', field: 'userId', op: 'in', ids: ['uid-1'] }]);
    const [batch] = sentBodies(fetchImpl);
    expect(batch.map((message) => message.to)).toEqual([TOKEN_A, TOKEN_B]);
    expect(batch[0]).toMatchObject({ title: 'Account Approved', body: 'Welcome!', data });
  });

  it('tolerates a notification with no type', async () => {
    const { db } = makeDb({ 'uid-1': [TOKEN_A] });
    const fetchImpl = makeFetch();

    await deliverPush(
      db,
      { userId: 'uid-1', notificationId: 'notif-1', notification: { title: 't', body: 'b' } },
      { fetchImpl }
    );

    expect(sentBodies(fetchImpl)[0][0].data).toEqual({ type: null, notificationId: 'notif-1' });
  });

  it('sends nothing for a notification without a title and body', async () => {
    const { db } = makeDb({ 'uid-1': [TOKEN_A] });
    const fetchImpl = makeFetch();

    await deliverPush(db, { userId: 'uid-1', notificationId: 'n', notification: { type: 'x' } }, { fetchImpl });
    await deliverPush(db, { userId: 'uid-1', notificationId: 'n', notification: undefined }, { fetchImpl });

    expect(db.collection).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('leaves announcements to sendBroadcast, which pushes them in bulk', async () => {
    const { db } = makeDb({ 'uid-1': [TOKEN_A] });
    const fetchImpl = makeFetch();

    await deliverPush(
      db,
      { userId: 'uid-1', notificationId: 'n', notification: { ...notification, broadcastId: 'b-1' } },
      { fetchImpl }
    );

    expect(db.collection).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('never throws when Firestore fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const db = {
      collection: () => ({ where: () => ({ get: async () => { throw new Error('unavailable'); } }) }),
    };

    await expect(
      deliverPush(db, { userId: 'uid-1', notificationId: 'n', notification }, { fetchImpl: makeFetch() })
    ).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("sets the icon to the owner's unread total, which already includes this notification", async () => {
    const { db, countQueries } = makeDb({ 'uid-1': [TOKEN_A] }, { 'uid-1': 3 });
    const fetchImpl = makeFetch();

    await deliverPush(db, { userId: 'uid-1', notificationId: 'notif-1', notification }, { fetchImpl });

    expect(sentBodies(fetchImpl)[0][0].badge).toBe(3);
    expect(countQueries).toHaveLength(1);
  });
});
