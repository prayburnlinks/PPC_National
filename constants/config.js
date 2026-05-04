/**
 * App Configuration
 * Firebase and application constants
 */

export const appConfig = {
  name: 'PPC National Church',
  version: '1.0.0',
  environment: 'development',
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
  { id: 1, name: 'Southern Cape', location: 'Cape Town', congregations: 10 },
  { id: 2, name: 'Northern Cape', location: 'Northern Cape', congregations: 1 },
  { id: 3, name: 'Free State', location: 'Free State', congregations: 1 },
  { id: 4, name: 'Gauteng', location: 'Gauteng', congregations: 1 },
  { id: 5, name: 'Central Cape', location: 'Cape Town', congregations: 3 },
  { id: 6, name: 'Garden Route', location: 'George', congregations: 3 },
  { id: 7, name: 'West Coast', location: 'West Coast', congregations: 1 },
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

// Congregations mapped to their district
export const CONGREGATIONS = [
  // Southern Cape
  { name: 'Ebenezer', district: 'Southern Cape' },
  { name: 'Ravensmead', district: 'Southern Cape' },
  { name: 'Kraaifontein', district: 'Southern Cape' },
  { name: 'Factreton', district: 'Southern Cape' },
  { name: 'Mount Carmel', district: 'Southern Cape' },
  { name: 'Mount Horeb', district: 'Southern Cape' },
  { name: 'Ocean View', district: 'Southern Cape' },
  { name: 'Emmanuel', district: 'Southern Cape' },
  { name: 'Belhar', district: 'Southern Cape' },
  { name: 'Atlantis', district: 'Southern Cape' },
  // Northern Cape
  { name: 'Congregation 01', district: 'Northern Cape' },
  // Free State
  { name: 'Congregation 02', district: 'Free State' },
  // Gauteng
  { name: 'Congregation 03', district: 'Gauteng' },
  // Central Cape
  { name: 'Mount Olive', district: 'Central Cape' },
  { name: 'Beacon Valley', district: 'Central Cape' },
  { name: 'Eden', district: 'Central Cape' },
  // Garden Route
  { name: 'Parkdene', district: 'Garden Route' },
  { name: 'Rosemoore', district: 'Garden Route' },
  { name: 'Pacaltsdorp', district: 'Garden Route' },
  // West Coast
  { name: 'Laaiplek', district: 'West Coast' },
];

// API/Firestore Limits
export const LIMITS = {
  MAX_EVENTS_HOME: 4,
  MAX_EVENTS_PER_PAGE: 20,
  MAX_SERMONS_PER_PAGE: 10,
  CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutes
};

export default {
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
