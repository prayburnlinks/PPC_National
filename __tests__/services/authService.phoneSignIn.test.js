/**
 * Sign-in accepts either an email address or an SA mobile number. The phone
 * path goes through the resolvePhoneSignIn callable; the email path must not
 * touch it at all.
 */

import { loginUser } from '../../services/authService';

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  updateProfile: jest.fn(),
  deleteUser: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db, ...segments) => ({ path: segments.join('/') })),
  doc: jest.fn((db, ...segments) => ({ path: segments.join('/') })),
  setDoc: jest.fn(),
  addDoc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));

const mockCallable = jest.fn();
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockCallable),
}));

import { signInWithEmailAndPassword } from 'firebase/auth';
import { getDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

const authUser = { uid: 'uid-1', email: 'member@church.org', displayName: 'Member' };
const approvedProfile = {
  uid: 'uid-1',
  email: 'member@church.org',
  name: 'Member',
  role: 'member',
  status: 'approved',
};

beforeEach(() => {
  jest.clearAllMocks();
  signInWithEmailAndPassword.mockResolvedValue({ user: authUser });
  getDoc.mockResolvedValue({ exists: () => true, data: () => approvedProfile });
  updateDoc.mockResolvedValue();
});

describe('signing in with an email address', () => {
  it('goes straight to Firebase without calling the phone function', async () => {
    const result = await loginUser('member@church.org', 'pw123456');

    expect(result.success).toBe(true);
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(), 'member@church.org', 'pw123456'
    );
    expect(httpsCallable).not.toHaveBeenCalled();
  });

  it('trims stray whitespace around the address', async () => {
    await loginUser('  member@church.org  ', 'pw123456');
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(), 'member@church.org', 'pw123456'
    );
  });
});

describe('signing in with a mobile number', () => {
  it('resolves the number to an email, then signs in with it', async () => {
    mockCallable.mockResolvedValue({ data: { email: 'member@church.org' } });

    const result = await loginUser('082 123 4567', 'pw123456');

    expect(mockCallable).toHaveBeenCalledWith({ phone: '0821234567', password: 'pw123456' });
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(), 'member@church.org', 'pw123456'
    );
    expect(result.success).toBe(true);
  });

  it('normalizes international format before sending it', async () => {
    mockCallable.mockResolvedValue({ data: { email: 'member@church.org' } });

    await loginUser('+27 82 123 4567', 'pw123456');

    expect(mockCallable).toHaveBeenCalledWith({ phone: '0821234567', password: 'pw123456' });
  });

  it('surfaces the function’s own wording when the number is shared', async () => {
    mockCallable.mockRejectedValue({
      code: 'functions/failed-precondition',
      message: 'More than one account uses this number. Please sign in with your email address.',
    });

    await expect(loginUser('0821234567', 'pw123456')).rejects.toMatchObject({
      message: 'More than one account uses this number. Please sign in with your email address.',
    });
    expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('surfaces the rate-limit message rather than a generic error', async () => {
    mockCallable.mockRejectedValue({
      code: 'functions/resource-exhausted',
      message: 'Too many attempts. Please try again later.',
    });

    await expect(loginUser('0821234567', 'pw123456')).rejects.toMatchObject({
      message: 'Too many attempts. Please try again later.',
    });
  });

  it('keeps wrong details generic so nothing leaks about the number', async () => {
    mockCallable.mockRejectedValue({
      code: 'functions/unauthenticated',
      message: 'Incorrect details. Please check and try again.',
    });

    await expect(loginUser('0821234567', 'wrongpw')).rejects.toMatchObject({
      message: 'Incorrect details. Please check and try again.',
    });
  });
});

describe('input that is neither', () => {
  it('passes unrecognisable input to Firebase for its usual verdict', async () => {
    signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/invalid-email' });

    await expect(loginUser('12345', 'pw123456')).rejects.toMatchObject({
      message: 'Invalid email address',
    });
    expect(httpsCallable).not.toHaveBeenCalled();
  });
});
