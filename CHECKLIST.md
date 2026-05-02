# 📋 PPC National Church App - Getting Started Checklist

## Pre-Requisites (✓ if you have)

- [ ] Node.js 16+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Text editor/IDE (VS Code recommended)
- [ ] Firebase account (free tier is fine: [firebase.google.com](https://firebase.google.com))
- [ ] iOS: Xcode (for iOS simulator) OR Expo Go app on iPhone
- [ ] Android: Android Studio/Emulator OR Expo Go app on Android phone

---

## Week 1: Development Setup (Days 1-3)

### Day 1: Install & Configure Firebase

**Checklist:**
- [ ] Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
- [ ] Copy project name and ID
- [ ] Enable Authentication (Email/Password)
- [ ] Create Firestore Database (production mode, South Africa region)
- [ ] Enable Cloud Storage
- [ ] Get Firebase credentials (API key, project ID, etc.)
- [ ] Copy credentials to `.env` file
- [ ] Verify `.env` is in `.gitignore` (don't commit!)

**Time:** ~30 minutes

### Day 2: Install Dependencies & Start Dev Server

**Checklist:**
- [ ] Run `npm install` (installs all packages)
- [ ] Run `npm start` (starts Expo dev server)
- [ ] Choose platform: iOS, Android, or Web
- [ ] Verify app boots without errors
- [ ] See home screen with "Good morning, beloved" greeting

**Time:** ~20 minutes

### Day 3: Test Registration & Login

**Checklist:**
- [ ] Test Register (Member - auto-approved):
  - [ ] Fill out form
  - [ ] Select "Member" role
  - [ ] Choose congregation
  - [ ] Register
  - [ ] Check browser console for success
  
- [ ] Test Login:
  - [ ] Login with credentials from registration
  - [ ] Should see Home screen
  - [ ] Check all tabs work (Home, Media, Give, Districts, Profile)
  
- [ ] Test Logout:
  - [ ] Go to Profile
  - [ ] Tap "Sign Out"
  - [ ] Should return to Login screen

**Time:** ~30 minutes

---

## Week 1-2: Feature Testing (Days 4-7)

### Home Screen Testing
- [ ] Greeting displays user name
- [ ] District badge shows
- [ ] Upcoming events list loads (if you add sample events)
- [ ] Quick action cards are clickable
- [ ] Notification bell is visible

### Giving Screen Testing
- [ ] Can select different funds
- [ ] Can select preset amounts
- [ ] Can enter custom amount
- [ ] Bank details modal displays correctly
- [ ] Can copy account number to clipboard

### Profile Screen Testing
- [ ] Name, role, congregation display
- [ ] Congregation and district correct
- [ ] Sign out works
- [ ] Giving history link visible

### Districts Screen Testing
- [ ] All 9 districts display
- [ ] Statistics show (9 districts, 90 congregations, 48k members)
- [ ] Each district clickable

---

## Sample Data Setup

### Add Test Events to Firestore

1. Open [Firebase Console](https://console.firebase.google.com)
2. Go to **Firestore Database**
3. Click **Create collection** → name it `events`
4. Add documents:

```
Document 1: {
  name: "National Convention 2025"
  eventDate: May 15, 2026 (Timestamp)
  venue: "Orlando Stadium, Soweto"
  category: "All Districts"
  description: "Annual national convention"
  attendeeCount: 0
}

Document 2: {
  name: "Youth Fire Night"
  eventDate: May 3, 2026 (Timestamp)
  venue: "District 3 HQ"
  category: "Youth"
  description: "Youth ministry event"
  attendeeCount: 0
}
```

Once added, events will show on Home screen!

---

## Deployment Roadmap

### Phase 1 (Current): MVP ✅ COMPLETE
- [x] Auth system
- [x] Core screens
- [x] Firestore integration
- [x] Theme/design system

### Phase 2 (Next 2 weeks)
- [ ] Add sample events
- [ ] Update bank details (use real PPC account)
- [ ] Test full giving flow
- [ ] Add company logo/images
- [ ] Beta test with 5-10 church members

### Phase 3 (Weeks 3-4)
- [ ] iOS build & TestFlight submission
- [ ] Android build & Play Store submission
- [ ] Fix any feedback from beta testing
- [ ] Update documentation

### Phase 4 (Week 5+)
- [ ] App Store review (2-3 days)
- [ ] Play Store review (1-2 days)
- [ ] Live on app stores!

---

## Common Tasks

### Update Bank Details

File: `screens/GivingScreen.js` or `constants/config.js`

```javascript
// Find BANK_DETAILS and update:
export const BANK_DETAILS = {
  bank: 'YOUR_BANK_NAME',
  accountName: 'PPC National Church',
  accountNumber: 'YOUR_ACCOUNT_NUMBER',
  branchCode: 'YOUR_BRANCH_CODE',
  // ... rest remains same
};
```

### Add New Event

Go to Firebase Console → Firestore → events collection → Add document with fields:
- name, eventDate (Timestamp), venue, category, description, attendeeCount

### Register Test Leader (for approval testing)

1. In app, register with Role = "Leader"
2. Go to Firebase → users collection
3. Find user document
4. Change `status` from "pending" to "approved"
5. Try login again (should work now)

### Clear App Data

```bash
npm start -- -c    # Clear Expo cache
```

---

## File Locations Reference

| Task | File |
|------|------|
| Change colors | `constants/theme.js` → `colors` object |
| Change fonts/sizes | `constants/theme.js` → `typography` object |
| Change spacing | `constants/theme.js` → `spacing` object |
| Update app config | `constants/config.js` |
| Modify login screen | `screens/LoginScreen.js` |
| Modify giving screen | `screens/GivingScreen.js` |
| Add services | `services/` folder |
| Add new screen | Create in `screens/` and import in `App.js` |

---

## Troubleshooting Quick Guide

| Error | Solution |
|-------|----------|
| "Firebase not initialized" | Check `.env` file, restart with `npm start` |
| "User not approved" | Change status in Firestore to "approved" |
| "Events not loading" | Add events to `/events` collection in Firestore |
| "App won't start" | Run `npm install` and `npm start -- -c` |
| "Navigation not working" | Check `App.js` navigation setup |
| "Styles look wrong" | Verify theme tokens in `constants/theme.js` |

---

## Resource Links

- 📚 [React Native Docs](https://reactnative.dev/)
- 📚 [Expo Docs](https://docs.expo.dev/)
- 🔥 [Firebase Docs](https://firebase.google.com/docs)
- 🗺️ [React Navigation](https://reactnavigation.org/)
- 💻 [VS Code](https://code.visualstudio.com/)

---

## Getting Help

1. **Check console logs** → Look at terminal output
2. **Check Firebase console** → Verify data is there
3. **Read inline comments** → Code has explanations
4. **Check SETUP.md** → Detailed setup guide
5. **Check README_IMPLEMENTATION.md** → Implementation details

---

## Success Criteria

✅ You'll know everything is working when:

1. App starts without errors
2. Can register as Member (auto-approved)
3. Can login with registered account
4. Home screen shows greeting + events
5. Can navigate all 5 tabs
6. Can enter Giving screen and see bank details
7. Can view Profile with user info
8. Can logout and return to login

**Time to reach success:** ~2 hours

---

## Next Steps After Setup

1. ✅ Install dependencies
2. ✅ Configure Firebase
3. ✅ Start dev server
4. ✅ Test registration & login
5. ✅ Add sample events
6. ✅ Test all screens
7. 🔄 Customize (bank details, logo, etc.)
8. 🔄 Beta test with church members
9. 📱 Build for app stores
10. 🚀 Launch!

---

**Let's build something amazing for the church! 🔥**

Questions? Check the documentation files or review the inline code comments.

Good luck! 🙏
