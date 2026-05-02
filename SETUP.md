# PPC National Church App - Setup Guide

## 🚀 Getting Started

This guide walks you through setting up the PPC National Church mobile app for development.

---

## Step 1: Install Dependencies

```bash
cd /Users/macbookpro15/Documents/VScode/PPC_National
npm install
```

This installs all required packages from `package.json`:
- React Native & Expo
- Firebase SDK
- React Navigation
- And more...

**Time:** ~5-10 minutes

---

## Step 2: Create Firebase Project

### 2A. Create Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Create a project"**
3. Enter project name: `ppc-national-church`
4. Select region: **South Africa (asia-south1)** or **Europe (europe-west1)**
5. Click **"Create"**

### 2B. Enable Services

After project is created:

1. **Authentication**
   - Navigate to **Authentication** > **Sign-in method**
   - Enable: **Email/Password**
   - Enable: **Phone** (for SMS verification in phase 2)

2. **Firestore Database**
   - Navigate to **Firestore Database**
   - Click **"Create database"**
   - Start in **Production mode**
   - Select region (same as above)

3. **Cloud Storage**
   - Navigate to **Storage**
   - Click **"Create bucket"**
   - Use default settings

4. **Cloud Messaging**
   - Navigate to **Cloud Messaging**
   - Copy **Server API Key** (for phase 2 push notifications)

### 2C. Get Firebase Config

1. Go to **Project Settings** (gear icon)
2. Find **"Your apps"** section
3. Under **"Web"** app, click **"Config"**
4. Copy the configuration object

You'll see something like:
```javascript
{
  "apiKey": "AIzaSyDemoKey...",
  "authDomain": "ppc-national.firebaseapp.com",
  "projectId": "ppc-national-church",
  "storageBucket": "ppc-national-church.appspot.com",
  "messagingSenderId": "123456789",
  "appId": "1:123456789:web:abcdef123456"
}
```

---

## Step 3: Configure `.env` File

1. Copy `.env.example` → `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and update with your Firebase config:
   ```
   FIREBASE_API_KEY=your_api_key_here
   FIREBASE_AUTH_DOMAIN=ppc-national.firebaseapp.com
   FIREBASE_PROJECT_ID=ppc-national-church
   FIREBASE_STORAGE_BUCKET=ppc-national-church.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=123456789
   FIREBASE_APP_ID=1:123456789:web:abcdef123456
   ```

**⚠️ IMPORTANT:** Never commit `.env` file. It's in `.gitignore` for security.

---

## Step 4: Start Development Server

```bash
npm start
```

This starts the Expo development server. You'll see:
```
› Metro Bundler ready
› Using Expo Go
› Android · Scan QR code with Expo Go (Android app)
› iOS · Scan QR code with Expo Go (TestFlight)
› Web · Press 'w' to open web preview
```

---

## Step 5: Run on Device/Emulator

### Option A: iOS (macOS only)

```bash
npm run ios
```

This launches the iOS Simulator. App will open automatically.

### Option B: Android

```bash
npm run android
```

Requires Android Studio or Android emulator running.

### Option C: Expo Go App (Easiest for Testing)

1. Install **Expo Go** app on your phone (iOS App Store or Google Play)
2. Scan the QR code from the terminal
3. App opens in Expo Go

### Option D: Web Browser

```bash
npm run web
```

Opens app in your browser at `http://localhost:19006`

---

## Step 6: Test Registration & Login

### Auto-Approved Member (Test Flow)

1. **Register:**
   - Name: `Test Member`
   - Email: `test@church.local`
   - Phone: `+27 123 456 7890`
   - Password: `password123`
   - Role: **Member** (auto-approved)
   - Congregation: `Cape Town Central`

2. **Login:**
   - Email: `test@church.local`
   - Password: `password123`
   - ✅ Should log in successfully

### Leader (Pending Approval)

1. **Register as Leader:**
   - Role: **Leader** (requires admin approval)
   - Status in Firestore: `pending`

2. **Try to login:**
   - ❌ Should fail with "Your account is pending admin approval"

3. **Admin Approves:**
   - Go to Firebase Console > Firestore
   - Find user document
   - Change `status` from `pending` → `approved`

4. **Try to login again:**
   - ✅ Should work now

---

## Step 7: Test Features

### Home Screen
- ✅ Greets you by name
- ✅ Shows district badge
- ✅ Displays upcoming events
- ✅ Shows quick action cards

### Giving Screen
- ✅ Select a giving fund
- ✅ Choose an amount (or enter custom)
- ✅ Tap "Proceed to Give"
- ✅ View bank details modal

### Events Screen
- ✅ Browse upcoming events (placeholder)

### Profile Screen
- ✅ View your profile info
- ✅ See congregation & district
- ✅ Sign out button

---

## Troubleshooting

### Issue: "Firebase not initialized"

**Solution:**
- Verify `.env` file exists in project root
- Check Firebase credentials are correct
- Restart dev server: `npm start`
- Clear cache: `npm start -- -c`

### Issue: "Can't find events"

**Solution:**
- Add sample events to Firestore:
  1. Go to Firebase Console > Firestore
  2. Create `events` collection
  3. Add documents with fields:
     - `name`: "Test Event"
     - `eventDate`: Tomorrow's date (Timestamp type)
     - `venue`: "Test Venue"
     - `category`: "Test"

### Issue: App crashes on startup

**Solution:**
- Check console for errors: Look at terminal output
- Verify `.env` file has all required fields
- Try: `npm start -- -c` (clear cache)
- Try: `rm -rf node_modules && npm install`

### Issue: "Firebase permission denied" in Firestore

**Solution:**
- Go to Firestore > Rules
- Replace with test rules:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if true;
      }
    }
  }
  ```
  ⚠️ This allows all reads/writes. Use proper rules before production.

---

## Development Commands

| Command | Purpose |
|---------|---------|
| `npm start` | Start Expo dev server |
| `npm run ios` | Run on iOS Simulator |
| `npm run android` | Run on Android Emulator |
| `npm run web` | Run in web browser |
| `npm run build:ios` | Build for iOS App Store |
| `npm run build:android` | Build for Google Play Store |

---

## Project Layout

```
src/
├── App.js                    # Main entry, navigation setup
├── constants/
│   ├── theme.js              # Colors, fonts, spacing
│   └── config.js             # Firebase & app config
├── services/
│   ├── authService.js        # Register, login, auth logic
│   ├── firestoreService.js   # Database queries
│   └── notificationService.js # Push notifications
├── screens/
│   ├── LoginScreen.js
│   ├── RegisterScreen.js
│   ├── HomeScreen.js
│   ├── GivingScreen.js
│   ├── EventsScreen.js
│   ├── DistrictsScreen.js
│   ├── ProfileScreen.js
│   └── MediaScreen.js
└── firebase-config.js        # Firebase initialization
```

---

## Next: Customize & Extend

Once you have the app running:

1. **Update Bank Details** (in `GivingScreen.js`):
   - Replace FNB account number with real PPC account
   - Update sort code, branch code

2. **Add Sample Data** to Firestore:
   - Events for testing
   - Districts & congregations
   - Test users

3. **Update Branding**:
   - Colors already match (blue, red, white, gold)
   - Add church logo/images to `/assets`

4. **Test Giving Flow**:
   - Register user
   - Go to Giving screen
   - Verify EFT details display correctly

---

## Next Phase: Deployment

Once development is complete:

1. **iOS App Store:**
   ```bash
   npm run build:ios
   # Upload to TestFlight, then App Store
   ```

2. **Google Play Store:**
   ```bash
   npm run build:android
   # Upload to Play Store internal testing, then production
   ```

See `README_IMPLEMENTATION.md` for detailed deployment steps.

---

## Support

For issues:
1. Check `.env` file configuration
2. Verify Firebase services are enabled
3. Review console logs in terminal
4. Check Firebase Console for data consistency

Good luck! 🔥
