// The administrator check in the sendBroadcast callable. What it does once the
// caller is allowed is covered by broadcast.test.js; this is only the gate.

const mockGetProfile = jest.fn();

// Paths are spelled out so they resolve to the same files functions/index.js
// requires (it has its own node_modules).
jest.mock('../../functions/node_modules/firebase-admin', () => {
  const firestore = jest.fn(() => ({
    collection: () => ({ doc: () => ({ get: mockGetProfile }) }),
  }));
  firestore.FieldValue = { serverTimestamp: () => 'SERVER_TIMESTAMP' };
  return { initializeApp: jest.fn(), firestore };
});

jest.mock('../../functions/broadcast', () => ({ runBroadcast: jest.fn() }));

const { runBroadcast } = require('../../functions/broadcast');
const { sendBroadcast } = require('../../functions/index');

const data = { title: 'Convention', body: 'Open now', audience: { type: 'all' } };

const profile = (fields) => ({ data: () => fields });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('sendBroadcast', () => {
  it('refuses a caller who is not signed in', async () => {
    await expect(sendBroadcast.run({ data })).rejects.toMatchObject({ code: 'unauthenticated' });

    expect(runBroadcast).not.toHaveBeenCalled();
  });

  it.each([
    ['a member', { role: 'member', status: 'approved' }],
    ['a leader', { role: 'leader', status: 'approved' }],
    ['an administrator who is still pending', { role: 'admin', status: 'pending' }],
    ['a rejected administrator', { role: 'admin', status: 'rejected' }],
    ['someone with no profile', undefined],
  ])('refuses %s', async (label, fields) => {
    mockGetProfile.mockResolvedValue(profile(fields));

    await expect(sendBroadcast.run({ auth: { uid: 'u1' }, data })).rejects.toMatchObject({
      code: 'permission-denied',
    });

    expect(runBroadcast).not.toHaveBeenCalled();
  });

  it('sends for an approved administrator, and returns what the broadcast reports', async () => {
    mockGetProfile.mockResolvedValue(profile({ role: 'admin', status: 'approved', name: 'Nadia' }));
    runBroadcast.mockResolvedValue({ broadcastId: 'b-1', recipients: 12, devices: 9, failed: 0, pushFailed: false });

    const result = await sendBroadcast.run({ auth: { uid: 'admin-1' }, data });

    expect(runBroadcast).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        FieldValue: expect.anything(),
        sender: { uid: 'admin-1', name: 'Nadia' },
        data,
      })
    );
    expect(result).toEqual({ broadcastId: 'b-1', recipients: 12, devices: 9, failed: 0, pushFailed: false });
  });
});
