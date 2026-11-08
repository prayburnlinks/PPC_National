// The daily reminder job, driven through the real sendReminders handler against
// an in-memory database. It exists mostly for registrations a leader made on
// someone's behalf: they have no userId, and the job used to send to
// users/{userId}, which throws on a missing id and would end the whole run.

const mockState = { current: null };

jest.mock('../../functions/node_modules/firebase-admin', () => {
  const firestore = jest.fn(() => mockState.current.db);
  firestore.FieldValue = { serverTimestamp: () => 'SERVER_TIMESTAMP', increment: (n) => ({ increment: n }) };
  return { initializeApp: jest.fn(), firestore };
});

const { sendReminders } = require('../../functions/index');

const NOW = new Date('2026-09-10T08:00:00Z').getTime();
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(NOW - n * DAY);
const daysFromNow = (n) => new Date(NOW + n * DAY);

const makeDb = ({ eventRegistrations = {}, merchOrders = {}, events = {} }) => {
  const tables = {
    eventRegistrations: structuredClone(eventRegistrations),
    merchOrders: structuredClone(merchOrders),
    events: structuredClone(events),
  };
  const notifications = [];

  const snapOf = (table, id) => ({
    id,
    data: () => tables[table][id],
    ref: { table, id },
  });
  const read = (table, filters = []) => ({
    docs: Object.keys(tables[table])
      .filter((id) => filters.every(([field, value]) => tables[table][id][field] === value))
      .map((id) => snapOf(table, id)),
  });

  const db = {
    collection: (name) => ({
      get: async () => read(name),
      where: (field, op, value) => ({ get: async () => read(name, [[field, value]]) }),
      doc: (uid) => ({
        collection: () => ({
          add: async (data) => {
            if (typeof uid !== 'string' || !uid) {
              // What the real Admin SDK does with a missing document id.
              throw new Error('Value for argument "documentPath" is not a valid resource path.');
            }
            notifications.push({ uid, ...data });
          },
        }),
      }),
    }),
    batch: () => {
      const updates = [];
      return {
        update: (ref, data) => updates.push([ref, data]),
        commit: async () => {
          updates.forEach(([ref, data]) => Object.assign(tables[ref.table][ref.id], data));
        },
      };
    },
  };

  return { db, tables, notifications };
};

const run = async (data) => {
  mockState.current = makeDb(data);
  await sendReminders.run({});
  return mockState.current;
};

const member = (overrides) => ({
  userId: 'member-1',
  userName: 'Mia Member',
  eventId: 'event-1',
  eventName: 'National Convention',
  status: 'awaiting_payment',
  registeredAt: daysAgo(5),
  ...overrides,
});

const guest = (name, overrides) => ({
  userId: null,
  userName: name,
  onBehalf: true,
  registeredBy: 'leader-1',
  registeredByName: 'Lena Leader',
  eventId: 'event-1',
  eventName: 'National Convention',
  status: 'awaiting_payment',
  registeredAt: daysAgo(5),
  ...overrides,
});

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('payment reminders', () => {
  it('still reminds a member about their own registration', async () => {
    const { notifications, tables } = await run({ eventRegistrations: { 'reg-1': member() } });

    expect(notifications).toEqual([
      expect.objectContaining({
        uid: 'member-1',
        type: 'payment_reminder',
        title: 'Payment Pending',
        body: expect.stringContaining('National Convention'),
      }),
    ]);
    expect(tables.eventRegistrations['reg-1'].paymentReminderSent).toBe(true);
  });

  it('leaves a registration alone until it has waited three days', async () => {
    const { notifications } = await run({
      eventRegistrations: { 'reg-1': member({ registeredAt: daysAgo(1) }), 'reg-2': guest('Alice', { registeredAt: daysAgo(1) }) },
    });

    expect(notifications).toEqual([]);
  });

  it('does not remind twice', async () => {
    const { notifications } = await run({
      eventRegistrations: { 'reg-1': member({ paymentReminderSent: true }), 'reg-2': guest('Alice', { paymentReminderSent: true }) },
    });

    expect(notifications).toEqual([]);
  });

  describe('for people a leader registered', () => {
    it('tells the leader, naming the person', async () => {
      const { notifications, tables } = await run({ eventRegistrations: { 'reg-1': guest('Alice Adams') } });

      expect(notifications).toEqual([
        expect.objectContaining({
          uid: 'leader-1',
          type: 'payment_reminder',
          body: "Alice Adams's registration for National Convention is still awaiting payment. Please arrange their EFT and upload their proof of payment.",
        }),
      ]);
      expect(tables.eventRegistrations['reg-1'].paymentReminderSent).toBe(true);
    });

    it('sends one notification per event, not one per person', async () => {
      const { notifications, tables } = await run({
        eventRegistrations: {
          'reg-1': guest('Alice Adams'),
          'reg-2': guest('Bob Brown'),
          'reg-3': guest('Cara Cole'),
        },
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0].body).toBe(
        '3 people you registered for National Convention are still awaiting payment: Alice Adams, Bob Brown, Cara Cole. Please arrange their EFT and upload each proof of payment.'
      );
      expect(Object.values(tables.eventRegistrations).every((r) => r.paymentReminderSent)).toBe(true);
    });

    it('keeps the list short when there are many', async () => {
      const registrations = {};
      for (let i = 1; i <= 8; i++) registrations[`reg-${i}`] = guest(`Guest ${i}`);

      const { notifications } = await run({ eventRegistrations: registrations });

      expect(notifications[0].body).toContain('8 people');
      expect(notifications[0].body).toContain('Guest 1, Guest 2, Guest 3, Guest 4, Guest 5 and 3 more');
    });

    it('keeps each leader’s and each event’s separate', async () => {
      const { notifications } = await run({
        eventRegistrations: {
          'reg-1': guest('Alice Adams'),
          'reg-2': guest('Bob Brown', { registeredBy: 'leader-2' }),
          'reg-3': guest('Cara Cole', { eventId: 'event-2', eventName: 'Youth Camp' }),
        },
      });

      expect(notifications.map((n) => n.uid).sort()).toEqual(['leader-1', 'leader-1', 'leader-2']);
    });

    it('only counts the ones that have waited long enough, and leaves the rest for later', async () => {
      const { notifications, tables } = await run({
        eventRegistrations: {
          'reg-1': guest('Alice Adams'),
          'reg-2': guest('Bob Brown', { registeredAt: daysAgo(1) }),
        },
      });

      expect(notifications[0].body).toContain("Alice Adams's registration");
      expect(tables.eventRegistrations['reg-2'].paymentReminderSent).toBeUndefined();
    });

    it('skips one with nobody to tell, instead of ending the run', async () => {
      const { notifications } = await run({
        eventRegistrations: {
          'reg-1': guest('Orphan', { registeredBy: undefined }),
          'reg-2': member(),
        },
      });

      expect(notifications.map((n) => n.uid)).toEqual(['member-1']);
    });

    it('does not get in the way of a member’s reminder', async () => {
      const { notifications } = await run({
        eventRegistrations: { 'reg-1': guest('Alice Adams'), 'reg-2': member() },
      });

      expect(notifications.map((n) => n.uid).sort()).toEqual(['leader-1', 'member-1']);
    });
  });

  it('still reminds about merchandise orders', async () => {
    const { notifications } = await run({
      merchOrders: {
        'order-1': { userId: 'member-1', itemName: 'T-shirt', status: 'awaiting_payment', createdAt: daysAgo(5) },
      },
    });

    expect(notifications).toEqual([
      expect.objectContaining({ uid: 'member-1', body: expect.stringContaining('T-shirt') }),
    ]);
  });
});

describe('event reminders', () => {
  const events = { 'event-1': { name: 'National Convention', eventDate: daysFromNow(3) } };

  it('still reminds a registered member', async () => {
    const { notifications, tables } = await run({
      events,
      eventRegistrations: { 'reg-1': member({ status: 'approved', registeredAt: daysAgo(1) }) },
    });

    expect(notifications).toEqual([
      expect.objectContaining({ uid: 'member-1', type: 'event_reminder', title: 'Upcoming Event' }),
    ]);
    expect(tables.eventRegistrations['reg-1'].reminderSent).toBe(true);
  });

  it('skips people a leader registered, who have no inbox, without ending the run', async () => {
    const { notifications, tables } = await run({
      events,
      eventRegistrations: {
        'reg-1': guest('Alice Adams', { status: 'approved', registeredAt: daysAgo(1) }),
        'reg-2': member({ status: 'approved', registeredAt: daysAgo(1) }),
      },
    });

    expect(notifications.map((n) => n.uid)).toEqual(['member-1']);
    expect(tables.eventRegistrations['reg-1'].reminderSent).toBeUndefined();
    expect(tables.eventRegistrations['reg-2'].reminderSent).toBe(true);
  });
});
