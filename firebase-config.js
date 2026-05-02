/**
 * Firebase Configuration & Initialization
 * Sets up Firebase services for the app
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';
import { firebaseConfig } from './constants/config';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

// Initialize Messaging (if supported)
let messaging = null;
isSupported().then(supported => {
  if (supported) {
    messaging = getMessaging(app);
  }
}).catch(err => {
  console.log('Messaging not supported:', err);
});

// Set persistence for web
try {
  setPersistence(auth, browserLocalPersistence);
} catch (err) {
  console.log('Persistence setup error (expected on native):', err.code);
}

export { app, auth, db, storage, messaging };
export default { app, auth, db, storage, messaging };
