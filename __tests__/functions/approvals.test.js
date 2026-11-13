const {
  NOTIFICATION_TYPE,
  BODY_MAX,
  startedWaiting,
  describe: describeSubmission,
  findReviewers,
  notifyReviewers,
} = require('../../functions/approvals');

const FieldValue = { serverTimestamp: () => 'SERVER_TIMESTAMP' };

// Members as the users collection holds them.
const people = {
  'admin-1': { role: 'admin', status: 'approved', congregation: 'Ebenezer' },
  'admin-2': { role: 'admin', status: 'approved', congregation: 'Paarl' },
  'admin-pending': { role: 'admin', status: 'pending', congregation: 'Ebenezer' },
  'leader-ceres': { role: 'leader', status: 'approved', congregation: 'Ceres' },
  'leader-ceres-2': { role: 'leader', status: 'approved', congregation: 'Ceres' },
  'leader-paarl': { role: 'leader', status: 'approved', congregation: 'Paarl' },
  'leader-ceres-pending': { role: 'leader', status: 'pending', congregation: 'Ceres' },
  'member-ceres': { role: 'member', status: 'approved', congregation: 'Ceres' },
};

// An in-memory stand-in for the parts of the Admin SDK's Firestore these helpers touch.
const makeDb = ({ users = people, failFor = [], preexisting = [] } = {}) => {
  const created = []; // { uid, id, data }
  const taken = new Set(preexisting);

  const query = (filters) => ({
    where: (field, op, value) => query([...filters, [field, value]]),
    get: async () => ({
      docs: Object.entries(users)
        .filter(([, data]) => filters.every(([field, value]) => data[field] === value))
        .map(([id]) => ({ id })),
    }),
  });

  const db = {
    collection: (name) => {
      if (name !== 'users') throw new Error(`unexpected collection ${name}`);
      return {
        where: (field, op, value) => query([[field, value]]),
        doc: (uid) => ({
          collection: () => ({
            doc: (id) => ({
              create: async (data) => {
                if (failFor.includes(uid)) throw new Error('unavailable');
                const key = `${uid}/${id}`;
                if (taken.has(key)) throw Object.assign(new Error('already exists'), { code: 6 });
                taken.add(key);
                created.push({ uid, id, data });
              },
            }),
          }),
        }),
      };
    },
  };

  return { db, created };
};

const eventPayment = {
  userId: 'member-ceres',
  userName: 'Sarah Adams',
  congregation: 'Ceres',
  eventName: 'Annual Conference',
  registrationFee: 350,
  status: 'payment_submitted',
};

const guestPayment = {
  userId: null,
  registeredBy: 'leader-ceres',
  registeredByName: 'Lena',
  userName: 'Pastor Visser',
  congregation: 'Ceres',
  eventName: 'Annual Conference',
  registrationFee: 350,
  status: 'payment_submitted',
};

const merchOrder = {
  userId: 'member-ceres',
  userName: 'Sarah Adams',
  congregation: 'Ceres',
  itemName: 'Church T-shirt',
  totalAmount: 180,
  status: 'payment_submitted',
};

const newAccount = { name: 'Thabo Mokoena', role: 'leader', congregation: 'Paarl', status: 'pending' };

describe('startedWaiting', () => {
  describe('a new account', () => {
    it('counts when it is created pending', () => {
      expect(startedWaiting('account', undefined, { status: 'pending' })).toBe(true);
    });

    it('does not count an edit to an account that is already pending', () => {
      expect(startedWaiting('account', { status: 'pending' }, { status: 'pending', name: 'New name' })).toBe(false);
    });

    it('does not count approval, rejection, or a member who signs up already approved', () => {
      expect(startedWaiting('account', { status: 'pending' }, { status: 'approved' })).toBe(false);
      expect(startedWaiting('account', { status: 'pending' }, { status: 'rejected' })).toBe(false);
      expect(startedWaiting('account', undefined, { status: 'approved' })).toBe(false);
    });
  });

  describe.each(['event_payment', 'merch_order'])('%s', (kind) => {
    it('counts when proof of payment is submitted', () => {
      expect(startedWaiting(kind, { status: 'awaiting_payment' }, { status: 'payment_submitted' })).toBe(true);
    });

    it('counts again when proof is resubmitted after a rejection', () => {
      expect(startedWaiting(kind, { status: 'rejected' }, { status: 'payment_submitted' })).toBe(true);
    });

    it('does not count creating the order or registration before any proof', () => {
      expect(startedWaiting(kind, undefined, { status: 'awaiting_payment' })).toBe(false);
    });

    it('does not count a change to something already waiting, or the decision itself', () => {
      expect(startedWaiting(kind, { status: 'payment_submitted' }, { status: 'payment_submitted', fileName: 'x' })).toBe(false);
      expect(startedWaiting(kind, { status: 'payment_submitted' }, { status: 'approved' })).toBe(false);
      expect(startedWaiting(kind, { status: 'payment_submitted' }, { status: 'rejected' })).toBe(false);
    });
  });

  it('ignores a deleted document and an unknown kind', () => {
    expect(startedWaiting('account', { status: 'pending' }, undefined)).toBe(false);
    expect(startedWaiting('nonsense', undefined, { status: 'pending' })).toBe(false);
  });
});

describe('describe', () => {
  it('names who signed up, as what, and where', () => {
    expect(describeSubmission('account', newAccount)).toEqual({
      title: 'Account awaiting approval',
      body: 'Thabo Mokoena signed up as leader (Paarl) and is waiting for approval.',
    });
  });

  it('copes with an account missing its details', () => {
    expect(describeSubmission('account', {}).body).toBe('Someone signed up as a leader and is waiting for approval.');
  });

  it('names the member, the event and the fee for an event payment', () => {
    expect(describeSubmission('event_payment', eventPayment)).toEqual({
      title: 'Payment to review',
      body: 'Sarah Adams sent proof of payment for Annual Conference (R350).',
    });
  });

  it('says who sent the proof for a guest registered by a leader', () => {
    expect(describeSubmission('event_payment', guestPayment).body).toBe(
      'Lena sent proof of payment for Pastor Visser for Annual Conference (R350).'
    );
  });

  it('names the item and total for a merchandise order', () => {
    expect(describeSubmission('merch_order', merchOrder)).toEqual({
      title: 'Order payment to review',
      body: 'Sarah Adams sent proof of payment for Church T-shirt (R180).',
    });
  });

  it('writes cents only when there are some, and leaves out a missing amount', () => {
    expect(describeSubmission('merch_order', { ...merchOrder, totalAmount: 12.5 }).body).toContain('(R12.50)');
    expect(describeSubmission('merch_order', { ...merchOrder, totalAmount: undefined }).body).toBe(
      'Sarah Adams sent proof of payment for Church T-shirt.'
    );
  });
});

describe('findReviewers', () => {
  it('sends a new account to approved admins only', async () => {
    const { db } = makeDb();

    const reviewers = await findReviewers(db, 'account', newAccount);

    expect(reviewers.sort()).toEqual(['admin-1', 'admin-2']);
  });

  it('sends an event payment to admins and the registrant’s congregation leaders, not other congregations’', async () => {
    const { db } = makeDb();

    const reviewers = await findReviewers(db, 'event_payment', eventPayment);

    expect(reviewers.sort()).toEqual(['admin-1', 'admin-2', 'leader-ceres', 'leader-ceres-2']);
  });

  it('does the same for a merchandise order', async () => {
    const { db } = makeDb();

    const reviewers = await findReviewers(db, 'merch_order', merchOrder);

    expect(reviewers.sort()).toEqual(['admin-1', 'admin-2', 'leader-ceres', 'leader-ceres-2']);
  });

  it('never includes anyone who is not approved, or a plain member', async () => {
    const { db } = makeDb();

    const reviewers = await findReviewers(db, 'event_payment', eventPayment);

    expect(reviewers).not.toContain('admin-pending');
    expect(reviewers).not.toContain('leader-ceres-pending');
    expect(reviewers).not.toContain('member-ceres');
  });

  it('leaves out the person who submitted it, even if they are a leader or an admin', async () => {
    const { db } = makeDb();

    const byLeader = await findReviewers(db, 'event_payment', { ...eventPayment, userId: 'leader-ceres' });
    expect(byLeader).not.toContain('leader-ceres');
    expect(byLeader).toContain('leader-ceres-2');

    const byAdmin = await findReviewers(db, 'merch_order', { ...merchOrder, userId: 'admin-1' });
    expect(byAdmin).not.toContain('admin-1');
    expect(byAdmin).toContain('admin-2');
  });

  it('leaves out the leader who registered a guest, since they cannot approve their own', async () => {
    const { db } = makeDb();

    const reviewers = await findReviewers(db, 'event_payment', guestPayment);

    expect(reviewers).not.toContain('leader-ceres');
    expect(reviewers.sort()).toEqual(['admin-1', 'admin-2', 'leader-ceres-2']);
  });

  it('goes to admins alone when the payment has no congregation', async () => {
    const { db } = makeDb();

    const reviewers = await findReviewers(db, 'event_payment', { ...eventPayment, congregation: null });

    expect(reviewers.sort()).toEqual(['admin-1', 'admin-2']);
  });

  it('returns nobody when the only reviewer is the submitter', async () => {
    const { db } = makeDb({ users: { 'admin-1': people['admin-1'] } });

    expect(await findReviewers(db, 'merch_order', { ...merchOrder, userId: 'admin-1' })).toEqual([]);
  });
});

describe('notifyReviewers', () => {
  const run = (db, overrides = {}) =>
    notifyReviewers(db, {
      FieldValue,
      kind: 'event_payment',
      sourceId: 'reg-1',
      eventId: 'evt-100',
      data: eventPayment,
      ...overrides,
    });

  it('puts one entry in each reviewer’s notifications, shaped so the existing push trigger sends it', async () => {
    const { db, created } = makeDb();

    const notified = await run(db);

    expect(notified).toBe(4);
    expect(created.map((c) => c.uid).sort()).toEqual(['admin-1', 'admin-2', 'leader-ceres', 'leader-ceres-2']);
    expect(created[0].data).toEqual({
      type: NOTIFICATION_TYPE,
      title: 'Payment to review',
      body: 'Sarah Adams sent proof of payment for Annual Conference (R350).',
      read: false,
      createdAt: 'SERVER_TIMESTAMP',
      reviewKind: 'event_payment',
      reviewId: 'reg-1',
    });
    // deliverPush skips anything carrying a broadcastId; this must not.
    expect(created[0].data).not.toHaveProperty('broadcastId');
  });

  it('uses the type the app knows to open the Admin screen', () => {
    expect(NOTIFICATION_TYPE).toBe('approval_needed');
  });

  it('does not notify twice when Firestore redelivers the same event', async () => {
    const { db, created } = makeDb();

    await run(db);
    const second = await run(db);

    expect(second).toBe(0);
    expect(created).toHaveLength(4);
  });

  it('notifies again for a resubmission, which is a new event', async () => {
    const { db, created } = makeDb();

    await run(db, { eventId: 'evt-100' });
    const again = await run(db, { eventId: 'evt-200' });

    expect(again).toBe(4);
    expect(created).toHaveLength(8);
  });

  it('builds an id that is safe as a document id even if the event id is not', async () => {
    const { db, created } = makeDb();

    await run(db, { eventId: 'weird/id with spaces' });

    expect(created[0].id).toBe('review-event_payment-reg-1-weird_id_with_spaces');
  });

  it('still tells the others when one reviewer’s write fails', async () => {
    const { db, created } = makeDb({ failFor: ['admin-1'] });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const notified = await run(db);

    expect(notified).toBe(3);
    expect(created.map((c) => c.uid)).not.toContain('admin-1');
    console.error.mockRestore();
  });

  it('writes nothing when there is nobody to tell', async () => {
    const { db, created } = makeDb({ users: {} });
    jest.spyOn(console, 'log').mockImplementation(() => {});

    expect(await run(db)).toBe(0);
    expect(created).toEqual([]);
    console.log.mockRestore();
  });

  it('keeps a very long name from overrunning the notification', async () => {
    const { db, created } = makeDb();

    await run(db, { data: { ...eventPayment, userName: 'x'.repeat(1000) } });

    expect(created[0].data.body.length).toBeLessThanOrEqual(BODY_MAX);
  });

  it('notifies admins about a new account with the Pending tab’s kind', async () => {
    const { db, created } = makeDb();

    await run(db, { kind: 'account', sourceId: 'new-uid', data: newAccount });

    expect(created.map((c) => c.uid).sort()).toEqual(['admin-1', 'admin-2']);
    expect(created[0].data).toMatchObject({ title: 'Account awaiting approval', reviewKind: 'account', reviewId: 'new-uid' });
  });
});
