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
// `tokensByUser` is { uid: [expoToken, ...] }.
const makeDb = (tokensByUser = {}) => {
  const queries = [];
  const deleted = [];
  const batchSizes = [];

  const db = {
    collection: jest.fn((name) => ({
      where: (field, op, ids) => ({
        get: async () => {
          queries.push({ name, field, op, ids });
          return {
            docs: ids.flatMap((id) => (tokensByUser[id] || []).map((token) => ({ id: token }))),
          };
        },
      }),
      doc: (id) => ({ path: `${name}/${id}` }),
    })),
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

  return { db, queries, deleted, batchSizes };
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
});
