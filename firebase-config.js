import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCyHBnZ-TCInVW9w3sK2ir3eQgEl9tmpYs',
  authDomain: 'ppc-national-church.firebaseapp.com',
  projectId: 'ppc-national-church',
  storageBucket: 'ppc-national-church.firebasestorage.app',
  messagingSenderId: '651125416043',
  appId: '1:651125416043:web:2d2751c40929f269aa512e',
};

const app = initializeApp(firebaseConfig);
// getReactNativePersistence ensures the auth token is stored in AsyncStorage and
// synchronously available to Firestore immediately after signInWithEmailAndPassword.
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
