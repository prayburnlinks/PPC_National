/**
 * Event listing expiry rules: an event disappears from every listing only
 * after its last day — endDate for multi-day events, eventDate otherwise —
 * has fully passed. Uses a fresh module per test to bypass the events cache.
 */

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

const DAY = 86400000;

const makeQuerySnap = (rows) => ({
  docs: rows.map(([id, data]) => ({ id, exists: () => true, data: () => data })),
});

// Fresh service + matching firebase mock instance, so the module-level
// events cache never leaks between tests.
const freshService = (rows) => {
  jest.resetModules();
  const { getDocsFromServer } = require('firebase/firestore');
  getDocsFromServer.mockResolvedValue(makeQuerySnap(rows));
  return require('../../services/firestoreService');
};

describe('event listing expiry', () => {
  it('getAllEvents removes an event after its last day has passed', async () => {
    const { getAllEvents } = freshService([
      ['past', { name: 'Winter Camp', eventDate: new Date(Date.now() - 3 * DAY), endDate: new Date(Date.now() - 2 * DAY) }],
      ['future', { name: 'Spring Conference', eventDate: new Date(Date.now() + 7 * DAY) }],
    ]);

    const { events } = await getAllEvents(20);

    expect(events.map(e => e.name)).toEqual(['Spring Conference']);
  });

  it('getAllEvents keeps a multi-day event that is still in progress', async () => {
    const { getAllEvents } = freshService([
      ['running', { name: 'National Sisters Conference', eventDate: new Date(Date.now() - DAY), endDate: new Date(Date.now() + DAY) }],
    ]);

    const { events } = await getAllEvents(20);

    expect(events.map(e => e.name)).toEqual(['National Sisters Conference']);
  });

  it('getAllEvents keeps a single-day event through the end of that day', async () => {
    const startedThisMorning = new Date();
    startedThisMorning.setHours(0, 30, 0, 0);
    const { getAllEvents } = freshService([
      ['today', { name: 'Youth Rally', eventDate: startedThisMorning }],
      ['yesterday', { name: 'Old Rally', eventDate: new Date(Date.now() - DAY) }],
    ]);

    const { events } = await getAllEvents(20);

    expect(events.map(e => e.name)).toEqual(['Youth Rally']);
  });

  it('getUpcomingEvents keeps an in-progress multi-day event', async () => {
    const { getUpcomingEvents } = freshService([
      ['running', { name: 'Leaders Retreat', eventDate: new Date(Date.now() - DAY), endDate: new Date(Date.now() + DAY) }],
      ['done', { name: 'Ended Retreat', eventDate: new Date(Date.now() - 3 * DAY), endDate: new Date(Date.now() - 2 * DAY) }],
    ]);

    const result = await getUpcomingEvents(4);

    expect(result.map(e => e.name)).toEqual(['Leaders Retreat']);
  });
});

describe('malformed event docs', () => {
  it('excludes an event with no date from all listings', async () => {
    const svc = freshService([
      ['dateless', { name: 'Broken Event' }],
      ['ok', { name: 'Real Event', eventDate: new Date(Date.now() + DAY) }],
    ]);

    const { events } = await svc.getAllEvents(20);
    expect(events.map(e => e.name)).toEqual(['Real Event']);
  });
});
