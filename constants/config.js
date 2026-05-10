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
  VISITOR: 'visitor', // unauthenticated/unverified — public content only
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
  {
    id: 1, name: 'Southern Cape', location: 'Cape Town', congregations: 10,
    board: { chairperson: 'G. Links', deputy: 'J. Louw', secretary: 'J. Vlotman', treasurer: 'Blok' },
  },
  {
    id: 2, name: 'Northern Cape', location: 'Northern Cape', congregations: 1,
    board: { chairperson: 'TBA', deputy: 'TBA', secretary: 'TBA', treasurer: 'TBA' },
  },
  {
    id: 3, name: 'Free State', location: 'Free State', congregations: 1,
    board: { chairperson: 'TBA', deputy: 'TBA', secretary: 'TBA', treasurer: 'TBA' },
  },
  {
    id: 4, name: 'Gauteng', location: 'Gauteng', congregations: 1,
    board: { chairperson: 'A. Leeuw', deputy: 'TBA', secretary: 'TBA', treasurer: 'TBA' },
  },
  {
    id: 5, name: 'Central Cape', location: 'Cape Town', congregations: 3,
    board: { chairperson: 'TBA', deputy: 'TBA', secretary: 'TBA', treasurer: 'TBA' },
  },
  {
    id: 6, name: 'Garden Route', location: 'George', congregations: 10,
    board: { chairperson: 'F. Muller', deputy: 'L. Jonas', secretary: 'J. Oosthuizen', treasurer: 'J. Bredenkamp' },
  },
  {
    id: 7, name: 'West Coast', location: 'West Coast', congregations: 1,
    board: { chairperson: 'TBA', deputy: 'TBA', secretary: 'TBA', treasurer: 'TBA' },
  },
  {
    id: 8, name: 'Eden District', location: 'Oudtshoorn', congregations: 9,
    board: { chairperson: 'JD Thorne', deputy: 'D. De Villiers', secretary: 'D. Botha', treasurer: 'G. Kemp' },
  },
  {
    id: 9, name: 'Eastern Cape', location: 'Eastern Cape', congregations: 0,
    board: { chairperson: 'B. Magielies', deputy: 'J. Voorslag', secretary: 'D. Fortein', treasurer: 'N. Kerspuy' },
  },
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
  { name: 'Knysna', assemblyName: 'Galilee Assembly', pastor: 'Ps. Francious & Sally Muller', district: 'Garden Route' },
  { name: 'Plettenberg Bay', assemblyName: null, pastor: 'Ps. Lenhard & Esmerelda Jonas', district: 'Garden Route' },
  { name: 'Coldstream', assemblyName: null, pastor: 'Ps. Welcome Grootboom', district: 'Garden Route' },
  { name: 'Keurhoek', assemblyName: null, pastor: 'Applikant', district: 'Garden Route' },
  { name: 'Sedgefield', assemblyName: null, pastor: 'Ps. Eldrigde & Hillary Carolus', district: 'Garden Route' },
  { name: 'Parkdene', assemblyName: 'Mount Calvary', pastor: 'Ps. Jeremy & Christene Bredenkamp', district: 'Garden Route' },
  { name: 'Rosemoore', assemblyName: 'Calvary', pastor: 'Ps. Josef & Caroline Oosthuizen', district: 'Garden Route' },
  { name: 'Pacaltsdorp', assemblyName: null, pastor: 'Distrik toesig', district: 'Garden Route' },
  { name: 'Mosselbay', assemblyName: null, pastor: 'Elder Petrus & Ananda', district: 'Garden Route' },
  { name: 'Albertinia', assemblyName: null, pastor: 'Applikant', district: 'Garden Route' },
  // West Coast
  { name: 'Laaiplek', district: 'West Coast' },
  // Eden District
  { name: 'Ladismith', assemblyName: 'Lofdal Gemeente', pastor: 'Ps. Dawid & Annelize De Villiers', district: 'Eden District' },
  { name: 'Oudtshoorn', assemblyName: 'Emmanuel Gemeente', pastor: 'Ps. Dawid & Anette Botha', district: 'Eden District' },
  { name: 'Dysselsdorp', assemblyName: 'Tikvah Embassy', pastor: 'Ps. Joey & Herculene Thorne', district: 'Eden District' },
  { name: 'De Rust', assemblyName: 'Bethel Gemeente', pastor: 'Distrik Toesig', district: 'Eden District' },
  { name: 'Prins Albert', assemblyName: 'Maranatha Gemeente', pastor: 'Ps. Adrian & Surayda May', district: 'Eden District' },
  { name: 'Beaufort Wes', assemblyName: null, pastor: 'Ps. Klein', district: 'Eden District' },
  { name: 'Graaff Reinet', assemblyName: 'House', pastor: 'Ps. Gavin & Vivian Kemp', district: 'Eden District' },
  { name: 'Willowmore', assemblyName: 'Elim Gemeente', pastor: 'Applikant Ricardo & Caroline Human', district: 'Eden District' },
  { name: 'Langkloof', assemblyName: 'Spirit Word', pastor: 'Ps. Patrick & Chantal Kemoeti', district: 'Eden District' },
];

// National Board Members
export const NATIONAL_BOARD = [
  {
    id: 1,
    name: 'Barend Magielies',
    portfolio: 'President',
    photo: null,
  },
  {
    id: 2,
    name: 'Nicklaas Koen',
    portfolio: 'Vice President',
    photo: null,
  },
  {
    id: 3,
    name: 'Isaac Jacobs',
    portfolio: 'Secretary General',
    photo: null,
  },
  {
    id: 4,
    name: 'Dino Colbert',
    portfolio: 'Treasurer General',
    photo: null,
  },
  {
    id: 5,
    name: 'Johannes Voorslag',
    portfolio: "Youth & Children's Ministry",
    photo: null,
  },
  {
    id: 6,
    name: 'Andrew Leeuw',
    portfolio: 'Education Department',
    photo: null,
  },
  {
    id: 7,
    name: 'George Links',
    portfolio: 'Evangelism & Missions',
    photo: null,
  },
  {
    id: 8,
    name: 'Joey Denvor Thorne',
    portfolio: 'Infrastructure Development',
    photo: null,
  },
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
