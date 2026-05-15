# PPC I Love My Church Mobile App

🔥 A vibrant mobile application for the Pentecostal Protestant Church (PPC) National organization in South Africa.

## Overview

The PPC I Love My Church App enables church members to:
- **Register & Authenticate** — Join the church community with role-based access (Member, Leader, Admin)
- **Discover Events** — Browse upcoming church events and register to attend
- **Give & Tithe** — Make secure EFT contributions to various church funds
- **Access Media** — Watch live services and past sermons
- **Connect Locally** — View district information and congregations
- **Manage Profile** — View account details and ministry involvement

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React Native + Expo |
| **Backend** | Firebase (Auth, Firestore, Cloud Functions) |
| **Database** | Cloud Firestore |
| **Payments** | Manual EFT (Bank Transfer) |
| **Deployment** | iOS App Store + Google Play Store |

## Project Structure

```
PPC_National/
├── App.js                          # Main navigation & auth state
├── index.js                        # Expo entry point
├── app.json                        # Expo configuration
├── package.json                    # Dependencies
│
├── constants/
│   ├── theme.js                    # Design tokens (colors, typography, spacing)
│   └── config.js                   # Firebase & app configuration
│
├── services/
│   ├── authService.js              # Auth (register, login, role logic)
│   ├── firestoreService.js         # Firestore queries (events, giving, users)
│   └── notificationService.js      # Push notifications setup
│
├── screens/
│   ├── LoginScreen.js              # User login
│   ├── RegisterScreen.js           # User registration with role selection
│   ├── HomeScreen.js               # Main dashboard
│   ├── EventsScreen.js             # Event listing & registration
│   ├── GivingScreen.js             # Tithe/offering with EFT details
│   ├── DistrictsScreen.js          # PPC districts list
│   ├── ProfileScreen.js            # User profile & settings
│   └── MediaScreen.js              # Sermons & live streaming
│
├── components/                     # Reusable components (future)
├── navigation/                     # Navigation config (future)
├── assets/                         # Icons, images, fonts
│
├── firebase-config.js              # Firebase initialization
├── .env                            # Environment variables (NOT committed)
├── .env.example                    # Example environment variables
└── babel.config.js                 # Babel configuration
```

## Quick Start

### 1. Prerequisites

- Node.js 16+ and npm/yarn installed
- Expo CLI (`npm install -g expo-cli`)
- iOS: Xcode or TestFlight for testing
- Android: Android Studio or Play Store internal testing
- Firebase project created at [console.firebase.google.com](https://console.firebase.google.com)

### 2. Clone & Setup

```bash
cd /Users/macbookpro15/Documents/VScode/PPC_National
npm install
```

### 3. Configure Firebase

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable:
   - ✅ Authentication (Email/Password + SMS)
   - ✅ Cloud Firestore
   - ✅ Cloud Storage
   - ✅ Cloud Messaging (FCM)
3. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
4. Update `.env` with your Firebase credentials:
   ```
   FIREBASE_API_KEY=your_api_key
   FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   FIREBASE_APP_ID=your_app_id
   ```

### 4. Run Development Server

```bash
# Start Expo development server
npm start

# Run on iOS (if on macOS)
npm run ios

# Run on Android
npm run android

# Run on web
npm run web
```

### 5. Test the App

**Test Account (Auto-Approved Member):**
- Email: `test@church.local`
- Password: `password123`
- Role: Member (auto-approved)

**Test Registration:**
1. Tap "Sign Up"
2. Enter: Name, Email, Phone, Password
3. Select Role: "Member" (auto-approved) or "Leader" (pending approval)
4. Select Congregation & District
5. Tap "Create Account"
6. Check inbox for verification email

---

## Key Features (Phase 1 MVP)

### ✅ Authentication
- [x] Email/Password registration
- [x] Role-based user creation (Member, Leader, Admin)
- [x] Auto-approval for Members
- [x] Pending approval for Leaders/Admins
- [x] Cloud Function notifications for admin approval
- [x] Email verification & welcome emails

### ✅ Home Screen
- [x] User greeting with district badge
- [x] Live service status
- [x] Upcoming events list (4 items)
- [x] Quick action grid (Give, Districts, Sermons, Prayer Wall)
- [x] Notification ticker banner

### ✅ Events System
- [x] Fetch upcoming events from Firestore
- [x] Event registration flow
- [x] Registered events badge
- [x] Event date, venue, category display

### ✅ Giving / Tithe
- [x] 6 giving funds (Tithes, Building, Missions, Convention, Youth, Welfare)
- [x] Preset amount buttons + custom input
- [x] EFT bank details modal
- [x] Copy-to-clipboard for account number & sort code
- [x] Giving history saved to Firestore
- [x] Reference format: "Name · Congregation"

### ✅ Profile & Account
- [x] User profile display
- [x] Role & approval status badge
- [x] Congregation & district info
- [x] Giving history link
- [x] Ministries display
- [x] Sign out button

### ✅ Navigation
- [x] Bottom tab navigation (Home, Media, Give, Districts, Profile)
- [x] Auth stack (Login, Register)
- [x] Smooth transitions

---

## Firestore Data Structure

### Collections

```
/users
  /{userId}
    - uid, email, name, phone, congregation, district
    - role (member|leader|admin), status (approved|pending)
    - createdAt, approvedAt, metadata
    /registeredEvents
      /{eventId}: registeredAt, attended, feePaid
    /givingHistory
      /{transactionId}: fund, amount, date, status, reference

/events
  /{eventId}
    - name, description, date, time, venue, category
    - fee, capacity, attendeeCount

/districts
  /{districtId}
    - name, location, congregations (count)

/givingTransactions
  /{transactionId}
    - userId, fund, amount, date, status

/notifications
  /{notificationId}
    - type, userId, data, read, createdAt
```

---

## Environment Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `FIREBASE_API_KEY` | `AIzaSy...` | Firebase API key |
| `FIREBASE_PROJECT_ID` | `ppc-national-church` | Firebase project ID |
| `FIREBASE_AUTH_DOMAIN` | `ppc-national.firebaseapp.com` | Firebase auth domain |
| `FIREBASE_STORAGE_BUCKET` | `ppc-national-church.appspot.com` | Storage bucket URL |
| `FIREBASE_MESSAGING_SENDER_ID` | `123456789` | FCM sender ID |
| `FIREBASE_APP_ID` | `1:123456789:web:abc...` | Firebase app ID |

**⚠️ Never commit `.env`** — It contains sensitive credentials.

---

## Building & Deployment

### iOS (App Store)

```bash
# Build iOS app
npm run build:ios

# Upload to TestFlight for testing
# Follow Expo's guided steps

# Submit to App Store
# Use App Store Connect
```

### Android (Play Store)

```bash
# Build Android app
npm run build:android

# Upload to Play Store internal testing
# Follow Expo's guided steps

# Submit to Play Store
```

---

## Next Steps (Phase 2+)

### Phase 2: Enhanced Features
- [ ] Live streaming integration (YouTube/Facebook embeds)
- [ ] Direct payment integration (SnapScan, Zapper, PayFast)
- [ ] In-app receipt generation & email
- [ ] Prayer wall & prayer requests
- [ ] Attendance tracking
- [ ] Email receipt automation via Cloud Functions

### Phase 3: Admin Features
- [ ] Full admin dashboard (analytics, user management)
- [ ] Event management CRUD
- [ ] Approval workflow enhancements
- [ ] Reporting & giving statistics

### Phase 4: Community Features
- [ ] Prayer request system
- [ ] Ministry volunteer management
- [ ] Internal messaging
- [ ] Community feed/announcements

---

## Development Notes

### Adding New Screens

1. Create screen component in `/screens/NewScreen.js`
2. Import in `App.js`
3. Add to navigation stack or tab navigator
4. Update tab icon if needed

### Adding Firebase Functions

1. Create service in `/services/` (e.g., `newService.js`)
2. Use Firestore queries/mutations
3. Export functions for use in screens

### Styling

- Use design tokens from `constants/theme.js`
- Consistent colors: `colors.purple`, `colors.orangeRed`, `colors.gold`
- Spacing: `spacing.sm`, `spacing.md`, `spacing.lg`, `spacing.xl`
- Border radius: `borderRadius.md`, `borderRadius.lg`

### Error Handling

- Use try/catch in services
- Display user-friendly messages via `Alert.alert()`
- Log errors to console for debugging

---

## Troubleshooting

### "Firebase not initialized"
- Ensure `.env` file is in root directory with valid Firebase credentials
- Restart Expo dev server: `npm start`

### "User not approved"
- Check Firestore: user `status` should be `'approved'` after admin approval
- For members, status is auto-set to `'approved'` on registration

### "Event not loading"
- Check Firestore: events collection must exist with documents
- Verify event `eventDate` field is `Timestamp` type

### Build errors
- Clear cache: `npm start -- -c`
- Delete `node_modules`: `rm -rf node_modules && npm install`
- Update dependencies: `npm update`

---

## Support & Contribution

For issues or questions:
1. Check Firestore console for data
2. Review console logs in Expo
3. Verify Firebase credentials in `.env`
4. Contact development team

---

## License

Proprietary — Pentecostal Protestant Church National

**Date Created:** May 2, 2026  
**Version:** 1.0.0 (MVP)  
**Status:** In Development
