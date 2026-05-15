/**
 * Authentication Service
 * Handles user registration, login, and role-based approval logic
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from '../firebase-config';
import { ROLES, USER_STATUS } from '../constants/config';

/**
 * Register a new user
 * Auto-approves members, keeps leaders/admins as pending
 */
export const registerUser = async (userData) => {
  const {
    email,
    password,
    name,
    phone,
    congregation,
    district,
    role = ROLES.MEMBER,
  } = userData;

  let createdAuthUser = null;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    createdAuthUser = userCredential.user;

    await updateProfile(createdAuthUser, { displayName: name });

    const status = role === ROLES.MEMBER ? USER_STATUS.APPROVED : USER_STATUS.PENDING;

    const userRef = doc(db, 'users', createdAuthUser.uid);
    await setDoc(userRef, {
      uid: createdAuthUser.uid,
      email,
      name,
      phone,
      congregation,
      district,
      role,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: false,
      approvedAt: status === USER_STATUS.APPROVED ? new Date() : null,
      metadata: {
        registrationIp: null,
        lastLogin: new Date(),
      },
    });

    // Fire-and-forget: a hang or failure here must not block the registration return.
    notifyAdminOfNewRegistration(createdAuthUser.uid, { email, name, role, status });

    return {
      success: true,
      uid: createdAuthUser.uid,
      status,
      message: status === USER_STATUS.APPROVED
        ? 'Registration successful! Welcome to PPC I Love My Church.'
        : 'Registration submitted. Awaiting admin approval.',
    };
  } catch (error) {
    // Rollback: delete the Auth user if Firestore write failed so the account
    // cannot silently re-register as an approved member on next login.
    if (createdAuthUser) {
      try { await deleteUser(createdAuthUser); } catch (deleteError) {
        console.error('Failed to delete orphaned auth user:', deleteError);
      }
    }
    console.error('Registration error:', error);
    throw {
      code: error.code,
      message: getErrorMessage(error.code),
    };
  }
};

/**
 * Login user
 */
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Fetch user data to check status
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    // Check if Firestore profile exists
    if (!userDoc.exists()) {
      // Create a basic profile for accounts created before Firestore was set up
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email,
        role: ROLES.MEMBER,
        status: USER_STATUS.APPROVED,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: { lastLogin: new Date() },
      });
      const newDoc = await getDoc(doc(db, 'users', user.uid));
      return { success: true, uid: user.uid, user: { ...newDoc.data(), uid: user.uid } };
    }

    const userData = userDoc.data();

    // Check if user is approved
    if (userData.status !== USER_STATUS.APPROVED) {
      await signOut(auth);
      const statusErrorCode = {
        [USER_STATUS.REJECTED]: 'USER_REJECTED',
        [USER_STATUS.INACTIVE]: 'USER_INACTIVE',
      }[userData.status] || 'USER_NOT_APPROVED';
      throw new Error(statusErrorCode);
    }

    // Update last login
    await updateDoc(doc(db, 'users', user.uid), {
      'metadata.lastLogin': new Date(),
    });

    return {
      success: true,
      uid: user.uid,
      user: { ...userData, uid: user.uid },
    };
  } catch (error) {
    console.error('Login error:', error);
    throw {
      code: error.code,
      message: getErrorMessage(error.code || error.message),
    };
  }
};

/**
 * Logout user
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    throw { message: 'Failed to logout' };
  }
};

/**
 * Get current user data
 */
export const getCurrentUser = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return null;

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    return userDoc.data() ? { ...userDoc.data(), uid: user.uid } : null;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

/**
 * Send password reset email
 */
export const sendResetEmail = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: 'Password reset email sent' };
  } catch (error) {
    console.error('Reset email error:', error);
    throw { message: getErrorMessage(error.code) };
  }
};

/**
 * Get pending registrations (admin only)
 */
export const getPendingRegistrations = async () => {
  try {
    const q = query(
      collection(db, 'users'),
      where('status', '==', USER_STATUS.PENDING)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id }));
  } catch (error) {
    console.error('Get pending registrations error:', error);
    throw { message: 'Failed to load pending registrations' };
  }
};

/**
 * Approve a pending user (admin only)
 */
export const approveUser = async (uid) => {
  try {
    await updateDoc(doc(db, 'users', uid), {
      status: USER_STATUS.APPROVED,
      approvedAt: new Date(),
      updatedAt: new Date(),
    });

    return { success: true, message: 'User approved' };
  } catch (error) {
    console.error('Approve user error:', error);
    if (error.code === 'permission-denied') {
      throw { message: 'Unauthorized: Admin access required to approve users' };
    }
    throw { message: 'Failed to approve user' };
  }
};

/**
 * Reject a pending user (admin only)
 */
export const rejectUser = async (uid, reason = '') => {
  try {
    await updateDoc(doc(db, 'users', uid), {
      status: USER_STATUS.REJECTED,
      rejectionReason: reason,
      updatedAt: new Date(),
    });

    return { success: true, message: 'User rejected' };
  } catch (error) {
    console.error('Reject user error:', error);
    if (error.code === 'permission-denied') {
      throw { message: 'Unauthorized: Admin access required to reject users' };
    }
    throw { message: 'Failed to reject user' };
  }
};

/**
 * Notify admin of new registration
 * (In production, this would be a Cloud Function call)
 */
const notifyAdminOfNewRegistration = async (uid, userData) => {
  try {
    // Create notification record
    const notificationRef = collection(db, 'notifications');
    await addDoc(notificationRef, {
      type: 'new_registration',
      userId: uid,
      userData,
      read: false,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Notification error:', error);
    // Don't throw - notification failure shouldn't break registration
  }
};

/**
 * Map Firebase error codes to user-friendly messages
 */
const getErrorMessage = (code) => {
  const errorMessages = {
    'auth/invalid-email': 'Invalid email address',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'Email not found',
    'auth/wrong-password': 'Incorrect password',
    'auth/email-already-in-use': 'Email already in use',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/operation-not-allowed': 'Operation not allowed',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'USER_NOT_APPROVED': 'Your account is pending admin approval.',
    'USER_REJECTED': 'Your registration was not approved. Please contact the church office.',
    'USER_INACTIVE': 'Your account has been deactivated. Please contact an admin.',
    default: 'An error occurred. Please try again.',
  };

  return errorMessages[code] || errorMessages.default;
};

export default {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  sendResetEmail,
  getPendingRegistrations,
  approveUser,
  rejectUser,
};
