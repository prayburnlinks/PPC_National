/**
 * App Configuration
 * Firebase and application constants
 */

export const appConfig = {
  name: 'PPC I Love My Church',
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

// Districts (alphabetical by name)
export const DISTRICTS = [
  {
    id: 1, name: 'Boland', location: 'Boland', congregations: 12,
    board: { chairperson: 'TBA', deputy: 'TBA', secretary: 'TBA', treasurer: 'TBA' },
  },
  {
    id: 2, name: 'Central Cape', location: 'Cape Town', congregations: 10,
    board: { chairperson: 'TBA', deputy: 'TBA', secretary: 'TBA', treasurer: 'TBA' },
  },
  {
    id: 3, name: 'Eastern Cape', location: 'Eastern Cape', congregations: 9,
    board: { chairperson: 'B. Magielies', deputy: 'J. Voorslag', secretary: 'D. Fortein', treasurer: 'N. Kerspuy' },
  },
  {
    id: 4, name: 'Eden', location: 'Oudtshoorn', congregations: 9,
    board: { chairperson: 'JD Thorne', deputy: 'D. De Villiers', secretary: 'D. Botha', treasurer: 'G. Kemp' },
  },
  {
    id: 5, name: 'Free State', location: 'Free State', congregations: 7,
    board: { chairperson: 'TBA', deputy: 'TBA', secretary: 'TBA', treasurer: 'TBA' },
  },
  {
    id: 6, name: 'Garden Route', location: 'George', congregations: 9,
    board: { chairperson: 'F. Muller', deputy: 'L. Jonas', secretary: 'J. Oosthuizen', treasurer: 'J. Bredenkamp' },
  },
  {
    id: 7, name: 'Gauteng', location: 'Gauteng', congregations: 8,
    board: { chairperson: 'A. Leeuw', deputy: 'TBA', secretary: 'TBA', treasurer: 'TBA' },
  },
  {
    id: 8, name: 'Northern Cape', location: 'Northern Cape', congregations: 6,
    board: { chairperson: 'TBA', deputy: 'TBA', secretary: 'TBA', treasurer: 'TBA' },
  },
  {
    id: 9, name: 'Southern Cape', location: 'Cape Town', congregations: 11,
    board: { chairperson: 'G. Links', deputy: 'J. Louw', secretary: 'J. Vlotman', treasurer: 'Blok' },
  },
];

// Bank Details for EFT
export const BANK_DETAILS = {
  bank: 'Absa',
  accountName: 'PPK ABC Fonds',
  accountNumber: '4056725472',
  branchCode: '632005',
  accountType: 'Cheque / Current',
  referenceFormat: 'Name + Congregation',
};

// Congregations (assemblies) mapped to their district
// Grouped by district (alphabetical, matching DISTRICTS order); each group sorted alphabetically
export const CONGREGATIONS = [
  // Boland
  { name: 'Botrivier', district: 'Boland' },
  { name: 'Ceres', district: 'Boland' },
  { name: 'De Doorns', district: 'Boland' },
  { name: 'Grabouw', district: 'Boland' },
  { name: 'Groenland', district: 'Boland' },
  { name: 'Macassar', district: 'Boland' },
  { name: 'Paarl', district: 'Boland' },
  { name: 'Rawsonville', district: 'Boland' },
  { name: 'Riviersonderend', district: 'Boland' },
  { name: 'Swellendam', district: 'Boland' },
  { name: 'Villiersdorp', district: 'Boland' },
  { name: 'Worcester (Ebed)', district: 'Boland' },
  // Central Cape
  { name: 'Beaconvalley', district: 'Central Cape' },
  { name: 'Crawford', district: 'Central Cape' },
  { name: 'Eden', district: 'Central Cape' },
  { name: 'Hannover Park', district: 'Central Cape' },
  { name: 'Heideveldt', district: 'Central Cape' },
  { name: 'Lotusriver', district: 'Central Cape' },
  { name: 'Mt Olive', district: 'Central Cape' },
  { name: 'Ottery', district: 'Central Cape' },
  { name: 'Searidge Park', district: 'Central Cape' },
  { name: 'Seawinds', district: 'Central Cape' },
  // Eastern Cape
  { name: 'Despatch', district: 'Eastern Cape' },
  { name: 'Gelvandale', district: 'Eastern Cape' },
  { name: 'Hephzibah', district: 'Eastern Cape' },
  { name: 'Humansdorp', district: 'Eastern Cape' },
  { name: 'Jeffreys Baai', district: 'Eastern Cape' },
  { name: 'Oos-London', district: 'Eastern Cape' },
  { name: 'Steytlerville', district: 'Eastern Cape' },
  { name: 'Uitenhage', district: 'Eastern Cape' },
  { name: 'Woodlands', district: 'Eastern Cape' },
  // Eden
  { name: 'Beaufort Wes', district: 'Eden' },
  { name: 'De Rust', district: 'Eden' },
  { name: 'Dysselsdorp', district: 'Eden' },
  { name: 'Graaff-Reinet', district: 'Eden' },
  { name: 'Ladysmith', district: 'Eden' },
  { name: 'Langkloof', district: 'Eden' },
  { name: 'Oudtshoorn', district: 'Eden' },
  { name: 'Prins Albert', district: 'Eden' },
  { name: 'Willowmore', district: 'Eden' },
  // Free State
  { name: 'Bloemspruit', district: 'Free State' },
  { name: 'Colesberg', district: 'Free State' },
  { name: 'Gariepdam', district: 'Free State' },
  { name: 'HVG/Bloemfontein', district: 'Free State' },
  { name: 'Kroonstad', district: 'Free State' },
  { name: 'Oppermans', district: 'Free State' },
  { name: 'Word of Healing', district: 'Free State' },
  // Garden Route
  { name: 'Coldstream', district: 'Garden Route' },
  { name: 'Keurhoek Rheenendal', district: 'Garden Route' },
  { name: 'Knysna/Hornlee', district: 'Garden Route' },
  { name: 'Mosselbaai/Mispa', district: 'Garden Route' },
  { name: 'New Horizon/Plettenberg Baai', district: 'Garden Route' },
  { name: 'Pacaltsdorp', district: 'Garden Route' },
  { name: 'Parkdene/Mt Calvary', district: 'Garden Route' },
  { name: 'Rosemoor (Calvary)', district: 'Garden Route' },
  { name: 'Sedgefield', district: 'Garden Route' },
  // Gauteng
  { name: 'EdenPark', district: 'Gauteng' },
  { name: 'Eerste Rus', district: 'Gauteng' },
  { name: 'Eldorado Park', district: 'Gauteng' },
  { name: 'Fochville', district: 'Gauteng' },
  { name: 'Kilpspruit-Wes', district: 'Gauteng' },
  { name: 'Potchefstroom', district: 'Gauteng' },
  { name: 'Riverlea', district: 'Gauteng' },
  { name: 'Rustervaal', district: 'Gauteng' },
  // Northern Cape
  { name: 'Britstown/De Aar', district: 'Northern Cape' },
  { name: 'Kathu', district: 'Northern Cape' },
  { name: 'Kimberley/Colville', district: 'Northern Cape' },
  { name: 'Olifantshoek', district: 'Northern Cape' },
  { name: 'Pescodia', district: 'Northern Cape' },
  { name: 'Upington', district: 'Northern Cape' },
  // Southern Cape
  { name: 'Atlantis', district: 'Southern Cape' },
  { name: 'Belhar', district: 'Southern Cape' },
  { name: 'Concordia', district: 'Southern Cape' },
  { name: 'Ebenhaeser', district: 'Southern Cape' },
  { name: 'Emmanuel', district: 'Southern Cape' },
  { name: 'Factreton', district: 'Southern Cape' },
  { name: 'Kraaifontein', district: 'Southern Cape' },
  { name: 'Mt Carmel', district: 'Southern Cape' },
  { name: 'Mt Horeb', district: 'Southern Cape' },
  { name: 'Ocean View', district: 'Southern Cape' },
  { name: 'Ravensmead', district: 'Southern Cape' },
];

// National Board Members
export const NATIONAL_BOARD = [
  {
    id: 1,
    name: 'Barend Magielies',
    portfolio: 'President',
    photo: require('../assets/board/barend-magielies.jpg'),
    photoFull: require('../assets/board/barend-magielies-full.jpg'),
  },
  {
    id: 2,
    name: 'Nicklaas Koen',
    portfolio: 'Vice President',
    photo: require('../assets/board/nicklaas-koen.jpg'),
    photoFull: require('../assets/board/nicklaas-koen-full.jpg'),
  },
  {
    id: 3,
    name: 'Isaac Jacobs',
    portfolio: 'Secretary General',
    photo: require('../assets/board/isaac-jacobs.jpg'),
    photoFull: require('../assets/board/isaac-jacobs-full.jpg'),
  },
  {
    id: 4,
    name: 'Dino Colbert',
    portfolio: 'Treasurer General',
    photo: require('../assets/board/dino-colbert.jpg'),
    photoFull: require('../assets/board/dino-colbert-full.jpg'),
  },
  {
    id: 5,
    name: 'Johannes Voorslag',
    portfolio: "Youth & Children's Ministry",
    photo: require('../assets/board/johannes-voorslag.jpg'),
    photoFull: require('../assets/board/johannes-voorslag-full.jpg'),
  },
  {
    id: 6,
    name: 'Andrew Leeuw',
    portfolio: 'Education Department',
    photo: require('../assets/board/andrew-leeuw.jpg'),
    photoFull: require('../assets/board/andrew-leeuw-full.jpg'),
  },
  {
    id: 7,
    name: 'George Links',
    portfolio: 'Evangelism & Missions',
    photo: require('../assets/board/george-links.jpg'),
    photoFull: require('../assets/board/george-links-full.jpg'),
  },
  {
    id: 8,
    name: 'Joey Denvor Thorne',
    portfolio: 'Infrastructure Development',
    photo: require('../assets/board/joey-thorne.jpg'),
    photoFull: require('../assets/board/joey-thorne-full.jpg'),
  },
];

export const NATIONAL_WOMENS_BOARD = [
  {
    id: 1,
    name: 'Veronica Magielies',
    portfolio: 'President',
    photo: require('../assets/womensboard/veronica-magielies.jpg'),
    photoFull: require('../assets/womensboard/veronica-magielies-full.jpg'),
  },
  {
    id: 2,
    name: 'Rolene Koen',
    portfolio: 'Vice President',
    photo: require('../assets/womensboard/rolene-koen.jpg'),
    photoFull: require('../assets/womensboard/rolene-koen-full.jpg'),
  },
  {
    id: 3,
    name: 'Herculene Thorne',
    portfolio: 'Secretary',
    photo: require('../assets/womensboard/herculene-thorne.jpg'),
    photoFull: require('../assets/womensboard/herculene-thorne-full.jpg'),
  },
  {
    id: 4,
    name: 'Cornelia Links',
    portfolio: 'Treasurer',
    photo: require('../assets/womensboard/cornelia-links.jpg'),
    photoFull: require('../assets/womensboard/cornelia-links-full.jpg'),
  },
];

export const NATIONAL_YOUTH_BOARD = [
  {
    id: 1,
    name: 'Christopher Spies',
    portfolio: 'Chairperson',
    photo: require('../assets/youthboard/christopher-spies.jpg'),
    photoFull: require('../assets/youthboard/christopher-spies-full.jpg'),
  },
  {
    id: 2,
    name: 'Clinton Anthony',
    portfolio: 'Vice Chairperson',
    photo: require('../assets/youthboard/clinton-anthony.jpg'),
    photoFull: require('../assets/youthboard/clinton-anthony-full.jpg'),
  },
  {
    id: 3,
    name: 'Danny Wildskud',
    portfolio: 'Secretary',
    photo: require('../assets/youthboard/danny-wildskud.jpg'),
    photoFull: require('../assets/youthboard/danny-wildskud-full.jpg'),
  },
  {
    id: 4,
    name: 'Albie Botha',
    portfolio: 'Treasurer',
    photo: require('../assets/youthboard/albie-botha.jpg'),
    photoFull: require('../assets/youthboard/albie-botha-full.jpg'),
  },
];

export const NATIONAL_SUNDAY_SCHOOL_BOARD = [
  {
    id: 1,
    name: 'Noel Bredenkamp',
    portfolio: 'Chairperson',
    photo: require('../assets/sundayschoolboard/noel-bredenkamp.jpg'),
    photoFull: require('../assets/sundayschoolboard/noel-bredenkamp-full.jpg'),
  },
  {
    id: 2,
    name: 'Danie Van Wyk',
    portfolio: 'Vice Chairperson',
    photo: require('../assets/sundayschoolboard/danie-van-wyk.jpg'),
    photoFull: require('../assets/sundayschoolboard/danie-van-wyk-full.jpg'),
  },
  {
    id: 3,
    name: 'Chantel Lewis',
    portfolio: 'Secretary',
    photo: require('../assets/sundayschoolboard/chantel-lewis.jpg'),
    photoFull: require('../assets/sundayschoolboard/chantel-lewis-full.jpg'),
  },
  {
    id: 4,
    name: 'Dawid Bothman',
    portfolio: 'Treasurer',
    photo: require('../assets/sundayschoolboard/dawid-bothman.jpg'),
    photoFull: require('../assets/sundayschoolboard/dawid-bothman-full.jpg'),
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
