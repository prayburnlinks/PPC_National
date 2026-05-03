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

  try {
    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update auth profile
    await updateProfile(user, { displayName: name });

    // Determine status based on role
    // Members auto-approve, Leaders/Admins require approval
    const status = role === ROLES.MEMBER ? USER_STATUS.APPROVED : USER_STATUS.PENDING;

    // Create user document in Firestore
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
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

    // Trigger notifications via Cloud Function
    // (Cloud Functions will handle email sending and admin notifications)
    await notifyAdminOfNewRegistration(user.uid, { email, name, role, status });

    return {
      success: true,
      uid: user.uid,
      status,
      message: status === USER_STATUS.APPROVED
        ? 'Registration successful! Welcome to PPC National Church.'
        : 'Registration submitted. Awaiting admin approval.',
    };
  } catch (error) {
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
    const userData = userDoc.data();

    // Check if user is approved
    if (userData && userData.status !== USER_STATUS.APPROVED) {
      // Logout if not approved
      await signOut(auth);
      throw new Error('USER_NOT_APPROVED');
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
    return [];
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

    // Fetch user data for notification
    const userDoc = await getDoc(doc(db, 'users', uid));
    const userData = userDoc.data();

    // Trigger approval email via Cloud Function
    // Cloud Function will send approval email to user
    console.log('User approved, notification will be sent via Cloud Function');

    return { success: true, message: 'User approved' };
  } catch (error) {
    console.error('Approve user error:', error);
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

    // Trigger rejection email via Cloud Function
    console.log('User rejected, notification will be sent via Cloud Function');

    return { success: true, message: 'User rejected' };
  } catch (error) {
    console.error('Reject user error:', error);
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
    console.log('Admin notification created for new registration');
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
    'USER_NOT_APPROVED': 'Your account is pending admin approval',
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
