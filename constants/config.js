/**
 * App Configuration
 * Firebase and application constants
 */

export const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyDemoKey123456789',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'ppc-national.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'ppc-national-church',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'ppc-national-church.appspot.com',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.FIREBASE_APP_ID || '1:123456789:web:abcdef123456',
};

export const appConfig = {
  name: process.env.APP_NAME || 'PPC National Church',
  version: process.env.APP_VERSION || '1.0.0',
  environment: process.env.APP_ENV || 'development',
};

// Role Constants
export const ROLES = {
  MEMBER: 'member',
  LEADER: 'leader',
  ADMIN: 'admin',
};

// User Status Constants
export const USER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  INACTIVE: 'inactive',
};

// Event Categories
export const EVENT_CATEGORIES = {
  ALL_DISTRICTS: 'All Districts',
  YOUTH: 'Youth',
  WOMEN: 'Women',
  LEADERS: 'Leaders',
  WORSHIP: 'Worship',
  MISSIONS: 'Missions',
};

// Giving Funds
export const GIVING_FUNDS = [
  { id: 'tithes', name: 'Tithes & Offerings', icon: '📖', description: 'Regular tithes and offerings' },
  { id: 'building', name: 'Building Fund', icon: '🏛', description: 'Church building projects' },
  { id: 'missions', name: 'Missions & Outreach', icon: '🌍', description: 'Local and international missions' },
  { id: 'convention', name: 'National Convention', icon: '🎟', description: 'National Convention fund' },
  { id: 'youth', name: 'Youth Ministry', icon: '⚡', description: 'Youth programs and events' },
  { id: 'welfare', name: 'Church Welfare', icon: '🤝', description: 'Support for church members' },
];

// Districts
export const DISTRICTS = [
  { id: 1, name: 'Gauteng North', location: 'Pretoria', congregations: 10 },
  { id: 2, name: 'Gauteng South', location: 'Soweto', congregations: 10 },
  { id: 3, name: 'Western Cape', location: 'Cape Town', congregations: 10 },
  { id: 4, name: 'KwaZulu-Natal', location: 'Durban', congregations: 10 },
  { id: 5, name: 'Eastern Cape', location: 'East London', congregations: 10 },
  { id: 6, name: 'Limpopo', location: 'Polokwane', congregations: 10 },
  { id: 7, name: 'Mpumalanga', location: 'Nelspruit', congregations: 10 },
  { id: 8, name: 'Free State', location: 'Bloemfontein', congregations: 10 },
  { id: 9, name: 'North West', location: 'Mahikeng', congregations: 10 },
];

// Bank Details for EFT
export const BANK_DETAILS = {
  bank: 'First National Bank',
  accountName: 'PPC National Church',
  accountNumber: '62 8473 8291',
  branchCode: '250 655',
  accountType: 'Cheque / Current',
  referenceFormat: 'Name + Congregation',
};

// Sample Congregations
export const CONGREGATIONS = [
  'Cape Town Central',
  'District 1 HQ',
  'District 2 HQ',
  'District 3 HQ',
  'District 4 HQ',
  'District 5 HQ',
  'District 6 HQ',
  'District 7 HQ',
  'District 8 HQ',
  'District 9 HQ',
];

// API/Firestore Limits
export const LIMITS = {
  MAX_EVENTS_HOME: 4,
  MAX_EVENTS_PER_PAGE: 20,
  MAX_SERMONS_PER_PAGE: 10,
  CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutes
};

export default {
  firebaseConfig,
  appConfig,
  ROLES,
  USER_STATUS,
  EVENT_CATEGORIES,
  GIVING_FUNDS,
  DISTRICTS,
  BANK_DETAILS,
  CONGREGATIONS,
  LIMITS,
};
