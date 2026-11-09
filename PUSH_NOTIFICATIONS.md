# Push notifications

Everything written to `users/{uid}/notifications` (approvals, payment and event
reminders, role changes, order/POP reviews) is also pushed to that member's
phone.

## How it works

1. **Register** — after sign-in, `services/pushNotificationService.js` asks for
   permission, gets the Expo push token and writes `pushTokens/{token}`
   (`userId`, `platform`, `updatedAt`). Sign-out deletes it again, and signing in
   on a handset someone else used simply overwrites the owner.
2. **Deliver** — the `sendPushOnNotification` Cloud Function (`functions/index.js`,
   logic in `functions/push.js`) fires when a notification document is created,
   looks up the owner's tokens and sends through Expo's push service. Tokens Expo
   reports as `DeviceNotRegistered` are deleted.
3. **Open** — tapping a push opens the Notifications screen (`App.js`).

`deleteMyAccount` also deletes the member's tokens.

## Announcements (admin broadcast)

Admin → Actions → **Send Announcement** composes a title and message and sends
it to everyone, one district or one congregation (the audience shows how many
members it reaches before you send). The `sendBroadcast` Cloud Function
(`functions/broadcast.js`):

1. checks the caller is an approved admin (server-side, not just in the app);
2. adds the announcement to every matching approved member's notifications
   (`type: 'announcement'`, tagged with a `broadcastId`), so it is in the app
   even for members with push switched off;
3. pushes it to their devices in bulk — the per-notification trigger skips
   anything carrying a `broadcastId`, so nobody is notified twice.

Each send is recorded in `broadcasts/{id}` (admin-readable, function-written)
*before* anything goes out, and the screen lists the last ten with their status.
If a send errors or your connection drops, check **Recent announcements** before
sending again — it may already have gone out. Admins only; leaders can't send.

## One-time setup (before it works on a real phone)

- **Android** — in the Firebase console add an Android app for
  `com.ilovemychurch.app`, download `google-services.json` into the project root
  and commit it (`app.config.js` picks it up automatically). Then, in
  `eas credentials` → Android → *Google Service Account Key for Push
  Notifications (FCM V1)*, upload a service-account key for the Firebase project.
- **iOS** — `eas credentials` → iOS → *Push Notifications: Manage your Apple Push
  Notifications service key* (EAS can create the key for you).
- **Rules and functions** — `firebase deploy --only firestore:rules,functions:sendPushOnNotification,functions:sendBroadcast`.
- **New native build** — the notification icon/colour and push entitlements are
  native, so this needs a new EAS build (with `versionCode` / `buildNumber`
  bumped), then store review. Don't publish this branch as an OTA update to the
  current production builds first: iOS members would be asked for permission
  but nothing would be delivered yet.
- *Optional* — if "Enhanced Security for Push Notifications" is enabled for the
  Expo project, put `EXPO_ACCESS_TOKEN=<token>` in `functions/.env`.

## Testing

Push doesn't work in simulators, and Android Expo Go no longer supports remote
push — use a development or preview build on a real device. To check delivery
without the app, add a document to `users/{uid}/notifications` in the Firebase
console (`title`, `body`, `type`, `read: false`) and the device should buzz.
Function logs: `firebase functions:log --only sendPushOnNotification`.

## Known gaps

- Expo reports some failures only in *receipts* (fetched ~15 minutes after
  sending), which aren't processed yet, so a token for an uninstalled app can
  linger until a later send is rejected outright. Harmless, but untidy.
- No per-type mute switch; members control it from the phone's notification
  settings.
- The admin "new registration" feed (top-level `notifications` collection) is
  not pushed — only members' own notifications and announcements are.
- Announcements can't be recalled or scheduled, and can only target everyone, a
  district or a congregation (not a role).
