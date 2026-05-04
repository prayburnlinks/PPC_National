/**
 * Run once to seed the National Sisters Conference event into Firestore.
 * Usage: node scripts/seedEvents.js
 * (requires FIREBASE_* env vars or hardcoded config)
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, Timestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyCyHBnZ-TCInVW9w3sK2ir3eQgEl9tmpYs',
  authDomain: 'ppc-national-church.firebaseapp.com',
  projectId: 'ppc-national-church',
  storageBucket: 'ppc-national-church.firebasestorage.app',
  messagingSenderId: '651125416043',
  appId: '1:651125416043:web:2d2751c40929f269aa512e',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  const event = {
    name: 'National Sisters Conference',
    description:
      'A spirit-filled gathering of women from all districts across the nation. Come and be refreshed, renewed and restored in His presence. Join us for worship, the Word and fellowship.',
    eventDate: Timestamp.fromDate(new Date('2026-07-12T08:00:00')),
    endDate: Timestamp.fromDate(new Date('2026-07-13T17:00:00')),
    venue: 'Cape Town City Hall, Cape Town',
    category: 'Women',
    registrationFee: 100,
    currency: 'ZAR',
    capacity: 500,
    attendeeCount: 0,
    requiresRegistration: true,
    requiresPayment: true,
    paymentReference: 'Sisters2026',
    bankDetails: {
      bank: 'First National Bank',
      accountName: 'PPC National Church',
      accountNumber: '62 8473 8291',
      branchCode: '250 655',
      accountType: 'Cheque / Current',
    },
    organizer: 'PPC Women\'s Ministry',
    contactEmail: 'women@ppcnational.org',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    published: true,
  };

  const ref = await addDoc(collection(db, 'events'), event);
  console.log('Event created with ID:', ref.id);
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
