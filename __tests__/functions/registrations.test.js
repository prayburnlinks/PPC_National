const {
  getRegistrar,
  parseRegistration,
  registerAttendee,
  cancelAttendee,
} = require('../../functions/registrations');

const FieldValue = {
  serverTimestamp: () => 'SERVER_TIMESTAMP',
  increment: (n) => ({ increment: n }),
};

const NOW = new Date('2026-09-01T10:00:00Z').getTime();
const DAY = 24 * 60 * 60 * 1000;

const leader = {
  uid: 'leader-1',
  name: 'Lena Leader',
  role: 'leader',
  congregation: 'Ceres',
  district: 'Boland',
};
const otherLeader = { ...leader, uid: 'leader-2', name: 'Otto Other' };
const admin = { uid: 'admin-1', name: 'Nadia', role: 'admin', congregation: 'Paarl', district: 'Boland' };

const paidEvent = {
  name: 'National Convention',
  eventDate: new Date(NOW + 30 * DAY),
  registrationFee: 350,
  currency: 'ZAR',
  requiresPayment: true,
  paymentReference: 'CONV26',
  capacity: 100,
  attendeeCount: 10,
};
const freeEvent = { name: 'Prayer Night', eventDate: new Date(NOW + 2 * DAY), registrationFee: 0, requiresPayment: false };

// An in-memory stand-in for the parts of the Admin SDK's Firestore these
// functions touch, including transactions. Writes are staged and applied when
// the transaction function returns, as in the real thing, so a thrown
// HttpsError leaves nothing behind.
const makeDb = ({ events = {}, registrations = {}, users = {} } = {}) => {
  // One level deep is enough, and keeps any methods on the fixtures (such as a
  // Timestamp's toMillis) intact.
  const copy = (table) =>
    Object.fromEntries(Object.entries(table).map(([id, doc]) => [id, { ...doc }]));
  const state = {
    events: copy(events),
    eventRegistrations: copy(registrations),
    users: copy(users),
  };
  let nextId = 1;

  const snapshot = (collection, id) => ({
    exists: state[collection][id] !== undefined,
    id,
    data: () => state[collection][id],
  });
  const ref = (collection, id) => ({ collection, id, get: async () => snapshot(collection, id) });
  const query = (collection, filters) => ({
    collection,
    filters,
    where: (field, op, value) => query(collection, [...filters, [field, value]]),
  });

  const apply = (staged) => {
    staged.forEach(([kind, target, data]) => {
      const table = state[target.collection];
      if (kind === 'create') table[target.id] = data;
      if (kind === 'delete') delete table[target.id];
      if (kind === 'update') {
        Object.entries(data).forEach(([field, value]) => {
          table[target.id][field] = value?.increment != null
            ? (table[target.id][field] || 0) + value.increment
            : value;
        });
      }
    });
  };

  const db = {
    collection: (name) => ({
      doc: (id) => ref(name, id ?? `${name}-${nextId++}`),
      where: (field, op, value) => query(name, [[field, value]]),
    }),
    runTransaction: async (fn) => {
      const staged = [];
      const tx = {
        get: async (target) =>
          target.filters
            ? {
                docs: Object.keys(state[target.collection])
                  .filter((id) => target.filters.every(([f, v]) => state[target.collection][id][f] === v))
                  .map((id) => snapshot(target.collection, id)),
              }
            : snapshot(target.collection, target.id),
        create: (target, data) => staged.push(['create', target, data]),
        update: (target, data) => staged.push(['update', target, data]),
        delete: (target) => staged.push(['delete', target]),
      };
      const result = await fn(tx);
      apply(staged);
      return result;
    },
  };

  return { db, state };
};

const register = (db, registrar, data, now = NOW) =>
  registerAttendee(db, { FieldValue, registrar, data, now });

const cancel = (db, registrar, data) => cancelAttendee(db, { FieldValue, registrar, data });

const valid = { eventId: 'event-1', attendeeName: 'Alice Adams' };

describe('getRegistrar', () => {
  const users = {
    'leader-1': { role: 'leader', status: 'approved', name: 'Lena', congregation: 'Ceres', district: 'Boland' },
    'admin-1': { role: 'admin', status: 'approved', name: 'Nadia' },
    'member-1': { role: 'member', status: 'approved' },
    'pending-1': { role: 'leader', status: 'pending' },
    'rejected-1': { role: 'admin', status: 'rejected' },
  };

  it('refuses a caller who is not signed in', async () => {
    const { db } = makeDb({ users });

    await expect(getRegistrar(db, undefined)).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it.each(['member-1', 'pending-1', 'rejected-1', 'nobody'])('refuses %s', async (uid) => {
    const { db } = makeDb({ users });

    await expect(getRegistrar(db, uid)).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it.each(['leader-1', 'admin-1'])('accepts an approved leader or admin (%s)', async (uid) => {
    const { db } = makeDb({ users });

    await expect(getRegistrar(db, uid)).resolves.toMatchObject({ uid, role: users[uid].role });
  });

  it("returns the profile fields a registration is stamped with", async () => {
    const { db } = makeDb({ users });

    await expect(getRegistrar(db, 'leader-1')).resolves.toEqual({
      uid: 'leader-1',
      name: 'Lena',
      role: 'leader',
      congregation: 'Ceres',
      district: 'Boland',
    });
  });
});

describe('parseRegistration', () => {
  it('tidies the name and keeps an optional phone as typed', () => {
    expect(
      parseRegistration({ ...valid, attendeeName: '  Alice   Adams ', attendeePhone: ' 082 123 4567 ' }, leader)
    ).toMatchObject({ name: 'Alice Adams', phone: '082 123 4567' });
  });

  it('treats a blank phone as none', () => {
    expect(parseRegistration({ ...valid, attendeePhone: '   ' }, leader).phone).toBe('');
  });

  it.each([
    ['no event', { attendeeName: 'Alice Adams' }],
    ['no name', { eventId: 'e' }],
    ['a one-letter name', { eventId: 'e', attendeeName: 'A' }],
    ['an over-long name', { eventId: 'e', attendeeName: 'x'.repeat(81) }],
    ['a non-string name', { eventId: 'e', attendeeName: 42 }],
    ['a phone with letters', { eventId: 'e', attendeeName: 'Alice', attendeePhone: 'call me' }],
    ['a too-short phone', { eventId: 'e', attendeeName: 'Alice', attendeePhone: '123' }],
    ['nothing at all', undefined],
  ])('rejects %s', (label, data) => {
    expect(() => parseRegistration(data, leader)).toThrow(expect.objectContaining({ code: 'invalid-argument' }));
  });

  it('uses the leader’s own congregation, whatever the app sent', () => {
    const parsed = parseRegistration({ ...valid, congregation: 'Paarl', district: 'Boland' }, leader);

    expect(parsed).toMatchObject({ congregation: 'Ceres', district: 'Boland' });
  });

  it('lets an admin choose the congregation', () => {
    const parsed = parseRegistration({ ...valid, congregation: 'Despatch', district: 'Eastern Cape' }, admin);

    expect(parsed).toMatchObject({ congregation: 'Despatch', district: 'Eastern Cape' });
  });

  it('falls back to the admin’s own congregation when none is chosen', () => {
    expect(parseRegistration(valid, admin)).toMatchObject({ congregation: 'Paarl', district: 'Boland' });
  });

  it('needs the congregation and district chosen together', () => {
    const parsed = parseRegistration({ ...valid, congregation: 'Despatch' }, admin);

    expect(parsed).toMatchObject({ congregation: 'Paarl', district: 'Boland' });
  });

  it('refuses a leader whose profile has no congregation', () => {
    expect(() => parseRegistration(valid, { ...leader, congregation: undefined })).toThrow(
      expect.objectContaining({ code: 'failed-precondition' })
    );
  });

  it('refuses an admin with no congregation of their own and none chosen', () => {
    expect(() => parseRegistration(valid, { ...admin, congregation: undefined, district: undefined })).toThrow(
      expect.objectContaining({ code: 'failed-precondition', message: expect.stringContaining('choose') })
    );
  });

  it('only treats allowDuplicate as a confirmation when it is exactly true', () => {
    expect(parseRegistration({ ...valid, allowDuplicate: true }, leader).allowDuplicate).toBe(true);
    expect(parseRegistration({ ...valid, allowDuplicate: 'yes' }, leader).allowDuplicate).toBe(false);
    expect(parseRegistration(valid, leader).allowDuplicate).toBe(false);
  });
});

describe('registerAttendee', () => {
  it('registers someone for a paid event as awaiting payment, on behalf of the leader', async () => {
    const { db, state } = makeDb({ events: { 'event-1': paidEvent } });

    const result = await register(db, leader, { ...valid, attendeePhone: '082 123 4567' });

    expect(state.eventRegistrations[result.registrationId]).toEqual({
      userId: null,
      userName: 'Alice Adams',
      attendeePhone: '082 123 4567',
      onBehalf: true,
      registeredBy: 'leader-1',
      registeredByName: 'Lena Leader',
      congregation: 'Ceres',
      district: 'Boland',
      eventId: 'event-1',
      eventName: 'National Convention',
      eventDate: paidEvent.eventDate,
      registrationFee: 350,
      currency: 'ZAR',
      paymentReference: 'CONV26',
      requiresPayment: true,
      status: 'awaiting_payment',
      attended: false,
      fileUrl: null,
      fileName: null,
      mimeType: null,
      registeredAt: 'SERVER_TIMESTAMP',
      paymentSubmittedAt: null,
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
    });
  });

  it('counts them against the event', async () => {
    const { db, state } = makeDb({ events: { 'event-1': paidEvent } });

    await register(db, leader, valid);

    expect(state.events['event-1'].attendeeCount).toBe(11);
  });

  it('tells the leader what happens next', async () => {
    const { db } = makeDb({ events: { 'event-1': paidEvent } });

    await expect(register(db, leader, valid)).resolves.toMatchObject({
      status: 'awaiting_payment',
      requiresPayment: true,
      registrationFee: 350,
      currency: 'ZAR',
      paymentReference: 'CONV26',
    });
  });

  it('confirms a free event straight away, with no phone on file', async () => {
    const { db, state } = makeDb({ events: { 'event-1': freeEvent } });

    const result = await register(db, leader, valid);

    expect(state.eventRegistrations[result.registrationId]).toMatchObject({
      status: 'confirmed',
      requiresPayment: false,
      attendeePhone: null,
      paymentReference: null,
    });
    expect(result.requiresPayment).toBe(false);
  });

  it('treats a zero fee as free even when the event says payment is required', async () => {
    const { db } = makeDb({ events: { 'event-1': { ...paidEvent, registrationFee: 0 } } });

    await expect(register(db, leader, valid)).resolves.toMatchObject({ status: 'confirmed' });
  });

  it('registers for the congregation the admin chose', async () => {
    const { db, state } = makeDb({ events: { 'event-1': paidEvent } });

    const result = await register(db, admin, { ...valid, congregation: 'Despatch', district: 'Eastern Cape' });

    expect(state.eventRegistrations[result.registrationId]).toMatchObject({
      congregation: 'Despatch',
      district: 'Eastern Cape',
      registeredBy: 'admin-1',
    });
  });

  it('cannot register a leader’s guest into a congregation that is not theirs', async () => {
    const { db, state } = makeDb({ events: { 'event-1': paidEvent } });

    const result = await register(db, leader, { ...valid, congregation: 'Despatch', district: 'Eastern Cape' });

    expect(state.eventRegistrations[result.registrationId].congregation).toBe('Ceres');
  });

  it('refuses an event that does not exist', async () => {
    const { db } = makeDb();

    await expect(register(db, leader, valid)).rejects.toMatchObject({ code: 'not-found' });
  });

  describe('capacity', () => {
    it('refuses a full event, and writes nothing', async () => {
      const { db, state } = makeDb({ events: { 'event-1': { ...paidEvent, capacity: 10, attendeeCount: 10 } } });

      await expect(register(db, leader, valid)).rejects.toMatchObject({
        code: 'failed-precondition',
        message: 'This event is full.',
      });

      expect(state.eventRegistrations).toEqual({});
      expect(state.events['event-1'].attendeeCount).toBe(10);
    });

    it('takes the last place, then refuses the next person', async () => {
      const { db } = makeDb({ events: { 'event-1': { ...paidEvent, capacity: 11, attendeeCount: 10 } } });

      await register(db, leader, valid);

      await expect(register(db, leader, { ...valid, attendeeName: 'Bob Brown' })).rejects.toMatchObject({
        message: 'This event is full.',
      });
    });

    it('has no limit when the event sets none', async () => {
      const { db } = makeDb({ events: { 'event-1': { ...freeEvent, attendeeCount: 5000 } } });

      await expect(register(db, leader, valid)).resolves.toMatchObject({ status: 'confirmed' });
    });
  });

  describe('when the event is', () => {
    it('long past, it refuses', async () => {
      const { db } = makeDb({ events: { 'event-1': { ...paidEvent, eventDate: new Date(NOW - 5 * DAY) } } });

      await expect(register(db, leader, valid)).rejects.toMatchObject({
        code: 'failed-precondition',
        message: 'This event has already taken place.',
      });
    });

    it('earlier today, it still allows it', async () => {
      const { db } = makeDb({ events: { 'event-1': { ...paidEvent, eventDate: new Date(NOW - 2 * 60 * 60 * 1000) } } });

      await expect(register(db, leader, valid)).resolves.toBeDefined();
    });

    it('a multi-day event still running, it allows it, going by the end date', async () => {
      const running = { ...paidEvent, eventDate: new Date(NOW - 3 * DAY), endDate: new Date(NOW + DAY) };
      const { db } = makeDb({ events: { 'event-1': running } });

      await expect(register(db, leader, valid)).resolves.toBeDefined();
    });

    it('stored as a Firestore Timestamp, it reads the date correctly', async () => {
      const timestamp = (ms) => ({ toMillis: () => ms });
      const past = { ...paidEvent, eventDate: timestamp(NOW - 5 * DAY) };
      const { db } = makeDb({ events: { 'event-1': past } });

      await expect(register(db, leader, valid)).rejects.toMatchObject({ code: 'failed-precondition' });
    });
  });

  describe('double entries', () => {
    const existing = (overrides) => ({
      'reg-1': {
        eventId: 'event-1',
        congregation: 'Ceres',
        userName: 'Alice Adams',
        ...overrides,
      },
    });

    it('warns when the same name is already registered for this event in this congregation', async () => {
      const { db, state } = makeDb({ events: { 'event-1': paidEvent }, registrations: existing() });

      await expect(register(db, leader, valid)).rejects.toMatchObject({
        code: 'already-exists',
        message: 'Alice Adams is already registered for this event.',
      });

      expect(Object.keys(state.eventRegistrations)).toEqual(['reg-1']);
    });

    it.each(['alice adams', 'ALICE  ADAMS', ' Alice Adams. '])('sees "%s" as the same name', async (name) => {
      const { db } = makeDb({ events: { 'event-1': paidEvent }, registrations: existing() });

      await expect(register(db, leader, { ...valid, attendeeName: name })).rejects.toMatchObject({
        code: 'already-exists',
      });
    });

    it('sees through accents', async () => {
      const { db } = makeDb({
        events: { 'event-1': paidEvent },
        registrations: existing({ userName: 'Renée Botha' }),
      });

      await expect(register(db, leader, { ...valid, attendeeName: 'Renee Botha' })).rejects.toMatchObject({
        code: 'already-exists',
      });
    });

    it('also catches someone who registered themselves through the app', async () => {
      const { db } = makeDb({
        events: { 'event-1': paidEvent },
        registrations: existing({ userId: 'member-1', onBehalf: undefined }),
      });

      await expect(register(db, leader, valid)).rejects.toMatchObject({ code: 'already-exists' });
    });

    it('registers them anyway once the leader confirms', async () => {
      const { db, state } = makeDb({ events: { 'event-1': paidEvent }, registrations: existing() });

      await register(db, leader, { ...valid, allowDuplicate: true });

      expect(Object.keys(state.eventRegistrations)).toHaveLength(2);
    });

    it.each([
      ['another congregation', existing({ congregation: 'Paarl' })],
      ['another event', existing({ eventId: 'event-2' })],
    ])('does not mind the same name in %s', async (label, registrations) => {
      const { db } = makeDb({ events: { 'event-1': paidEvent }, registrations });

      await expect(register(db, leader, valid)).resolves.toBeDefined();
    });

    it('does not mistake a similar name for the same one', async () => {
      const { db } = makeDb({
        events: { 'event-1': paidEvent },
        registrations: existing({ userName: 'Alison Adams' }),
      });

      await expect(register(db, leader, valid)).resolves.toBeDefined();
    });
  });
});

describe('cancelAttendee', () => {
  const proxy = (overrides) => ({
    onBehalf: true,
    registeredBy: 'leader-1',
    userId: null,
    userName: 'Alice Adams',
    eventId: 'event-1',
    status: 'awaiting_payment',
    ...overrides,
  });

  const setup = (registration, event = { ...paidEvent, attendeeCount: 11 }) =>
    makeDb({ events: { 'event-1': event }, registrations: { 'reg-1': registration } });

  it('removes the registration and gives the place back', async () => {
    const { db, state } = setup(proxy());

    await expect(cancel(db, leader, { registrationId: 'reg-1' })).resolves.toEqual({ success: true });

    expect(state.eventRegistrations['reg-1']).toBeUndefined();
    expect(state.events['event-1'].attendeeCount).toBe(10);
  });

  it.each(['awaiting_payment', 'rejected', 'confirmed'])('cancels one that is %s', async (status) => {
    const { db, state } = setup(proxy({ status }));

    await cancel(db, leader, { registrationId: 'reg-1' });

    expect(state.eventRegistrations['reg-1']).toBeUndefined();
  });

  it.each(['payment_submitted', 'approved'])('will not cancel one that is %s', async (status) => {
    const { db, state } = setup(proxy({ status }));

    await expect(cancel(db, leader, { registrationId: 'reg-1' })).rejects.toMatchObject({
      code: 'failed-precondition',
      message: expect.stringContaining('contact an admin'),
    });

    expect(state.eventRegistrations['reg-1']).toBeDefined();
    expect(state.events['event-1'].attendeeCount).toBe(11);
  });

  it('is only for the leader who registered them', async () => {
    const { db, state } = setup(proxy());

    await expect(cancel(db, otherLeader, { registrationId: 'reg-1' })).rejects.toMatchObject({
      code: 'permission-denied',
    });

    expect(state.eventRegistrations['reg-1']).toBeDefined();
  });

  it('can be done by an admin for anyone’s registration', async () => {
    const { db, state } = setup(proxy());

    await cancel(db, admin, { registrationId: 'reg-1' });

    expect(state.eventRegistrations['reg-1']).toBeUndefined();
  });

  it('leaves a member’s own registration alone', async () => {
    const { db, state } = setup(proxy({ onBehalf: undefined, userId: 'member-1', registeredBy: undefined }));

    await expect(cancel(db, admin, { registrationId: 'reg-1' })).rejects.toMatchObject({
      code: 'failed-precondition',
    });

    expect(state.eventRegistrations['reg-1']).toBeDefined();
  });

  it('never takes the counter below zero', async () => {
    const { db, state } = setup(proxy(), { ...paidEvent, attendeeCount: 0 });

    await cancel(db, leader, { registrationId: 'reg-1' });

    expect(state.events['event-1'].attendeeCount).toBe(0);
  });

  it('still works when the event has since been deleted', async () => {
    const { db, state } = makeDb({ registrations: { 'reg-1': proxy() } });

    await expect(cancel(db, leader, { registrationId: 'reg-1' })).resolves.toEqual({ success: true });

    expect(state.eventRegistrations['reg-1']).toBeUndefined();
  });

  it('refuses a registration that does not exist', async () => {
    const { db } = makeDb();

    await expect(cancel(db, leader, { registrationId: 'nope' })).rejects.toMatchObject({ code: 'not-found' });
  });

  it('refuses a missing id', async () => {
    const { db } = makeDb();

    await expect(cancel(db, leader, {})).rejects.toMatchObject({ code: 'invalid-argument' });
  });
});
