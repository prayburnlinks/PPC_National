import { db } from '../firebase-config';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

export const getDocuments = async () => {
  try {
    const q = query(collection(db, 'documents'), orderBy('name'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
};
