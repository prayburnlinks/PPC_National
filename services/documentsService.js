import { db, storage } from '../firebase-config';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// storage.rules only allows these for documents/ — must always send one,
// since an undefined contentType fails the rule's regex match outright.
const MIME_BY_EXT = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

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

export const uploadDocument = async (adminUser, { name, description, category, file }) => {
  try {
    const ext = file.name?.split('.').pop()?.toLowerCase() || 'pdf';
    const contentType = file.mimeType || MIME_BY_EXT[ext] || 'application/octet-stream';
    const safeName = file.name?.replace(/[^a-zA-Z0-9.\-]/g, '_') || `${Date.now()}.${ext}`;
    const storagePath = `documents/${Date.now()}-${safeName}`;

    const response = await fetch(file.uri);
    const blob = await response.blob();
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, blob, { contentType });
    const downloadUrl = await getDownloadURL(storageRef);

    const docRef = await addDoc(collection(db, 'documents'), {
      name,
      description,
      category,
      fileType: ext.toUpperCase(),
      fileSize: formatFileSize(file.size),
      downloadUrl,
      storagePath,
      uploadedBy: adminUser.uid,
      uploadedAt: serverTimestamp(),
    });
    return { success: true, documentId: docRef.id };
  } catch (error) {
    console.error('Upload document error:', error);
    throw { message: error.message || 'Failed to upload document.' };
  }
};
