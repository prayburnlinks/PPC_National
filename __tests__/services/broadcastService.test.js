import {
  getAudienceCount,
  sendBroadcast,
  getRecentBroadcasts,
} from '../../services/broadcastService';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db, name) => ({ collection: name })),
  query: jest.fn((source, ...constraints) => ({ source, constraints })),
  where: jest.fn((field, op, value) => ({ field, op, value })),
  orderBy: jest.fn((field, direction) => ({ orderBy: field, direction })),
  limit: jest.fn((n) => ({ limit: n })),
  getDocs: jest.fn(),
  getCountFromServer: jest.fn(),
}));

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(),
}));

import { query, where, getDocs, getCountFromServer } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getAudienceCount', () => {
  beforeEach(() => {
    getCountFromServer.mockResolvedValue({ data: () => ({ count: 42 }) });
  });

  it('counts every approved member for the everyone audience', async () => {
    expect(await getAudienceCount({ type: 'all' })).toBe(42);

    expect(query.mock.calls[0][0]).toEqual({ collection: 'users' });
    expect(query.mock.calls[0].slice(1)).toEqual([{ field: 'status', op: '==', value: 'approved' }]);
  });

  it.each([
    ['district', 'Boland'],
    ['congregation', 'Ceres'],
  ])('narrows to the chosen %s', async (type, value) => {
    await getAudienceCount({ type, value });

    expect(where).toHaveBeenCalledWith('status', '==', 'approved');
    expect(where).toHaveBeenCalledWith(type, '==', value);
  });

  it('returns null when the count cannot be worked out', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    getCountFromServer.mockRejectedValue(new Error('offline'));

    expect(await getAudienceCount({ type: 'all' })).toBeNull();
    consoleError.mockRestore();
  });
});

describe('sendBroadcast', () => {
  const payload = { title: 'Convention', body: 'Open now', audience: { type: 'all' } };

  it('calls the sendBroadcast function and returns what it reports', async () => {
    const callable = jest.fn().mockResolvedValue({
      data: { broadcastId: 'b-1', recipients: 12, devices: 9, failed: 0, pushFailed: false },
    });
    httpsCallable.mockReturnValue(callable);

    const result = await sendBroadcast(payload);

    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'sendBroadcast');
    expect(callable).toHaveBeenCalledWith(payload);
    expect(result).toEqual({
      success: true,
      broadcastId: 'b-1',
      recipients: 12,
      devices: 9,
      failed: 0,
      pushFailed: false,
    });
  });

  it("surfaces the function's own wording when it refuses", async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    httpsCallable.mockReturnValue(
      jest.fn().mockRejectedValue({ message: 'No approved members match that audience.' })
    );

    await expect(sendBroadcast(payload)).rejects.toEqual({
      message: 'No approved members match that audience.',
    });
    consoleError.mockRestore();
  });

  it('falls back to a generic message when there is none', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    httpsCallable.mockReturnValue(jest.fn().mockRejectedValue(new Error('')));

    await expect(sendBroadcast(payload)).rejects.toEqual({
      message: 'Failed to send the announcement.',
    });
    consoleError.mockRestore();
  });
});

describe('getRecentBroadcasts', () => {
  it('returns the newest announcements first, with real dates', async () => {
    const sentAt = new Date('2026-11-08T10:00:00');
    getDocs.mockResolvedValue({
      docs: [
        { id: 'b-1', data: () => ({ title: 'Convention', status: 'sent', sentAt: { toDate: () => sentAt } }) },
        { id: 'b-2', data: () => ({ title: 'Pending', status: 'sending', sentAt: null }) },
      ],
    });

    const result = await getRecentBroadcasts(5);

    const constraints = query.mock.calls[0].slice(1);
    expect(query.mock.calls[0][0]).toEqual({ collection: 'broadcasts' });
    expect(constraints).toEqual([{ orderBy: 'sentAt', direction: 'desc' }, { limit: 5 }]);
    expect(result).toEqual([
      { id: 'b-1', title: 'Convention', status: 'sent', sentAt },
      { id: 'b-2', title: 'Pending', status: 'sending', sentAt: null },
    ]);
  });

  it('returns an empty list when the read fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    getDocs.mockRejectedValue(new Error('permission-denied'));

    expect(await getRecentBroadcasts()).toEqual([]);
    consoleError.mockRestore();
  });
});
