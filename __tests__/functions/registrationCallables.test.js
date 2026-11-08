// registerEventAttendee and cancelEventAttendee as deployed: who may call them,
// and that what they are given reaches the registration logic untouched. What
// that logic does is covered in registrations.test.js.

const mockGetProfile = jest.fn();

jest.mock('../../functions/node_modules/firebase-admin', () => {
  const firestore = jest.fn(() => ({
    collection: () => ({ doc: () => ({ get: mockGetProfile }) }),
  }));
  firestore.FieldValue = { serverTimestamp: () => 'SERVER_TIMESTAMP', increment: (n) => ({ increment: n }) };
  return { initializeApp: jest.fn(), firestore };
});

jest.mock('../../functions/registrations', () => ({
  ...jest.requireActual('../../functions/registrations'),
  registerAttendee: jest.fn(),
  cancelAttendee: jest.fn(),
}));

const { registerAttendee, cancelAttendee } = require('../../functions/registrations');
const { registerEventAttendee, cancelEventAttendee } = require('../../functions/index');

const profile = (fields) => ({ data: () => fields });

beforeEach(() => {
  jest.clearAllMocks();
});

describe.each([
  ['registerEventAttendee', registerEventAttendee, registerAttendee, { eventId: 'event-1', attendeeName: 'Alice Adams' }],
  ['cancelEventAttendee', cancelEventAttendee, cancelAttendee, { registrationId: 'reg-1' }],
])('%s', (name, callable, logic, data) => {
  it('refuses a caller who is not signed in', async () => {
    await expect(callable.run({ data })).rejects.toMatchObject({ code: 'unauthenticated' });

    expect(logic).not.toHaveBeenCalled();
  });

  it.each([
    ['a member', { role: 'member', status: 'approved' }],
    ['a leader who is still pending', { role: 'leader', status: 'pending' }],
    ['someone with no profile', undefined],
  ])('refuses %s', async (label, fields) => {
    mockGetProfile.mockResolvedValue(profile(fields));

    await expect(callable.run({ auth: { uid: 'u1' }, data })).rejects.toMatchObject({
      code: 'permission-denied',
    });

    expect(logic).not.toHaveBeenCalled();
  });

  it.each(['leader', 'admin'])('hands an approved %s’s request to the registration logic', async (role) => {
    mockGetProfile.mockResolvedValue(
      profile({ role, status: 'approved', name: 'Lena', congregation: 'Ceres', district: 'Boland' })
    );
    logic.mockResolvedValue({ ok: true });

    const result = await callable.run({ auth: { uid: 'u1' }, data });

    expect(logic).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        registrar: { uid: 'u1', name: 'Lena', role, congregation: 'Ceres', district: 'Boland' },
        data,
        FieldValue: expect.anything(),
      })
    );
    expect(result).toEqual({ ok: true });
  });
});
