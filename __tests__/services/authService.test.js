import {
  loginUser,
  registerUser,
  logoutUser,
  getCurrentUser,
  approveUser,
  rejectUser,
  getPendingRegistrations,
  sendResetEmail,
} from '../../services/authService';

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  updateProfile: jest.fn(),
  deleteUser: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn((db, ...segments) => ({ path: segments.join('/') })),
  setDoc: jest.fn(),
  addDoc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser,
} from 'firebase/auth';

import { getDoc, getDocs, setDoc, updateDoc, addDoc } from 'firebase/firestore';

const mockAuthUser = { uid: 'uid-123', email: 'test@test.com', displayName: 'Test User' };
const mockApprovedProfile = {
  uid: 'uid-123',
  email: 'test@test.com',
  name: 'Test User',
  role: 'member',
  status: 'approved',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('loginUser', () => {
  it('returns user data for an approved member', async () => {
    signInWithEmailAndPassword.mockResolvedValue({ user: mockAuthUser });
    getDoc.mockResolvedValue({ exists: () => true, data: () => mockApprovedProfile });
    updateDoc.mockResolvedValue();

    const result = await loginUser('test@test.com', 'password123');

    expect(result.success).toBe(true);
    expect(result.user.role).toBe('member');
  });

  it('signs out and throws for a pending user', async () => {
    signInWithEmailAndPassword.mockResolvedValue({ user: mockAuthUser });
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ ...mockApprovedProfile, status: 'pending' }),
    });
    signOut.mockResolvedValue();

    await expect(loginUser('test@test.com', 'password123')).rejects.toMatchObject({
      message: expect.stringContaining('pending admin approval'),
    });
    expect(signOut).toHaveBeenCalled();
  });

  it('signs out and throws for a rejected user', async () => {
    signInWithEmailAndPassword.mockResolvedValue({ user: mockAuthUser });
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ ...mockApprovedProfile, status: 'rejected' }),
    });
    signOut.mockResolvedValue();

    await expect(loginUser('test@test.com', 'password123')).rejects.toMatchObject({
      message: expect.stringContaining('not approved'),
    });
  });

  it('creates a Firestore profile if none exists', async () => {
    signInWithEmailAndPassword.mockResolvedValue({ user: mockAuthUser });
    getDoc
      .mockResolvedValueOnce({ exists: () => false })
      .mockResolvedValueOnce({ exists: () => true, data: () => mockApprovedProfile });
    setDoc.mockResolvedValue();
    updateDoc.mockResolvedValue();

    const result = await loginUser('test@test.com', 'password123');

    expect(setDoc).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('throws a friendly message for wrong-password error', async () => {
    signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/wrong-password' });

    await expect(loginUser('test@test.com', 'wrong')).rejects.toMatchObject({
      message: 'Incorrect password',
    });
  });

  it('throws a friendly message for user-not-found error', async () => {
    signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/user-not-found' });

    await expect(loginUser('test@test.com', 'password')).rejects.toMatchObject({
      message: 'Email not found',
    });
  });
});

describe('registerUser', () => {
  const baseUserData = {
    email: 'new@church.com',
    password: 'pass123',
    name: 'New Member',
    phone: '0821234567',
    congregation: 'Ebenezer',
    district: 'Southern Cape',
    role: 'member',
  };

  it('auto-approves members', async () => {
    createUserWithEmailAndPassword.mockResolvedValue({ user: mockAuthUser });
    updateProfile.mockResolvedValue();
    setDoc.mockResolvedValue();
    addDoc.mockResolvedValue({ id: 'notif-1' });

    const result = await registerUser(baseUserData);

    expect(result.success).toBe(true);
    expect(result.status).toBe('approved');
  });

  it('sets status=pending for leaders', async () => {
    createUserWithEmailAndPassword.mockResolvedValue({ user: mockAuthUser });
    updateProfile.mockResolvedValue();
    setDoc.mockResolvedValue();
    addDoc.mockResolvedValue({ id: 'notif-1' });

    const result = await registerUser({ ...baseUserData, role: 'leader' });

    expect(result.status).toBe('pending');
  });

  it('rolls back auth user if Firestore write fails', async () => {
    createUserWithEmailAndPassword.mockResolvedValue({ user: mockAuthUser });
    updateProfile.mockResolvedValue();
    setDoc.mockRejectedValue(new Error('Firestore error'));
    deleteUser.mockResolvedValue();

    await expect(registerUser(baseUserData)).rejects.toBeDefined();
    expect(deleteUser).toHaveBeenCalledWith(mockAuthUser);
  });

  it('throws friendly message for duplicate email', async () => {
    createUserWithEmailAndPassword.mockRejectedValue({
      code: 'auth/email-already-in-use',
    });

    await expect(registerUser(baseUserData)).rejects.toMatchObject({
      message: 'Email already in use',
    });
  });
});

describe('approveUser', () => {
  it('calls updateDoc with approved status', async () => {
    updateDoc.mockResolvedValue();

    const result = await approveUser('uid-123');

    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'approved' })
    );
    expect(result.success).toBe(true);
  });

  it('throws friendly message on permission-denied', async () => {
    updateDoc.mockRejectedValue({ code: 'permission-denied' });

    await expect(approveUser('uid-123')).rejects.toMatchObject({
      message: expect.stringContaining('Admin access required'),
    });
  });
});

describe('rejectUser', () => {
  it('calls updateDoc with rejected status', async () => {
    updateDoc.mockResolvedValue();

    const result = await rejectUser('uid-123', 'Not a member');

    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'rejected', rejectionReason: 'Not a member' })
    );
    expect(result.success).toBe(true);
  });

  it('throws friendly message on permission-denied', async () => {
    updateDoc.mockRejectedValue({ code: 'permission-denied' });

    await expect(rejectUser('uid-123')).rejects.toMatchObject({
      message: expect.stringContaining('Admin access required'),
    });
  });
});

describe('getPendingRegistrations', () => {
  it('returns an array of pending users', async () => {
    getDocs.mockResolvedValue({
      docs: [
        { id: 'u1', data: () => ({ name: 'Alice', status: 'pending' }) },
        { id: 'u2', data: () => ({ name: 'Bob', status: 'pending' }) },
      ],
    });

    const result = await getPendingRegistrations();

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('uid', 'u1');
  });

  it('throws if the query fails', async () => {
    getDocs.mockRejectedValue(new Error('Network error'));

    await expect(getPendingRegistrations()).rejects.toMatchObject({
      message: 'Failed to load pending registrations',
    });
  });
});

describe('getCurrentUser', () => {
  it('returns null when no user is signed in', async () => {
    const { auth } = require('../../firebase-config');
    auth.currentUser = null;

    const result = await getCurrentUser();
    expect(result).toBeNull();
  });

  it('returns the user profile when signed in', async () => {
    const { auth } = require('../../firebase-config');
    auth.currentUser = { uid: 'uid-123' };
    getDoc.mockResolvedValue({ exists: () => true, data: () => mockApprovedProfile });

    const result = await getCurrentUser();

    expect(result).toMatchObject({ uid: 'uid-123' });
    auth.currentUser = null;
  });
});

describe('sendResetEmail', () => {
  it('resolves successfully', async () => {
    sendPasswordResetEmail.mockResolvedValue();

    const result = await sendResetEmail('test@test.com');
    expect(result.success).toBe(true);
  });

  it('throws a friendly message on error', async () => {
    sendPasswordResetEmail.mockRejectedValue({ code: 'auth/user-not-found' });

    await expect(sendResetEmail('nope@test.com')).rejects.toMatchObject({
      message: 'Email not found',
    });
  });
});

describe('logoutUser', () => {
  it('calls signOut and returns success', async () => {
    signOut.mockResolvedValue();

    const result = await logoutUser();
    expect(signOut).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});
