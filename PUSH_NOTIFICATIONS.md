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
4. **Count** — every push carries the member's unread total as the iPhone icon
   number (`badge`, worked out in `functions/push.js` from their unread
   notifications, which already include the one being pushed; an announcement
   gets one count per member with a device). Android ignores it. While the app
   is open it sets the number itself from the live feed (`setAppIconBadge`), and
   leaving the Notifications screen marks everything read, which clears it.

## In the app

`context/NotificationsContext.js` holds one live listener on the member's feed.
It drives the red count on the Home bell, the banner in the Home header, the
badge on the Home tab, the icon number and the toast. A notification that
arrives while the app is open slides in as a toast (only if it is under five
minutes old); the phone's own banner is switched off for the foreground
(`configureNotificationHandling`) so there aren't two.

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

## Approval requests (telling the approver)

Anything that now waits for someone to approve or reject sends the approvers a
push, through the same feed-then-push path as everything else. Three triggers in
`functions/index.js` (logic and wording in `functions/approvals.js`) watch for a
document *starting* to wait; editing it or deciding it notifies nobody:

| Waiting item | Notified | Left out |
|---|---|---|
| New leader or admin account (`users`, status `pending`) | every approved admin | — |
| Event proof of payment (`eventRegistrations`, `payment_submitted`, including a resubmission after a rejection) | every approved admin, and the approved leaders of the registrant's congregation | the registrant, and the leader who registered a guest (they can't approve their own) |
| Merchandise proof of payment (`merchOrders`, `payment_submitted`) | the same | the buyer |

Each reviewer gets a `type: 'approval_needed'` feed entry (with `reviewKind` and
`reviewId`), which `sendPushOnNotification` pushes; tapping it in the app opens
the Admin screen on the matching tab (`REVIEW_TABS`). The entry id is built from
the trigger's event id, so a redelivered event can't notify twice. Members sign
up as members already approved, so only leader and admin sign-ups create
"account" requests.

## One-time setup (before it works on a real phone)

- **Android** — in the Firebase console add an Android app for
  `com.ilovemychurch.app`, download `google-services.json` into the project root
  and commit it (`app.config.js` picks it up automatically). Then, in
  `eas credentials` → Android → *Google Service Account Key for Push
  Notifications (FCM V1)*, upload a service-account key for the Firebase project.
- **iOS** — `eas credentials` → iOS → *Push Notifications: Manage your Apple Push
  Notifications service key* (EAS can create the key for you).
- **Rules and functions** — `firebase deploy --only firestore:rules,functions:sendPushOnNotification,functions:sendBroadcast`, and for the approval requests `functions:notifyReviewersOfAccount,functions:notifyReviewersOfEventPayment,functions:notifyReviewersOfMerchOrder`.
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
- The old admin "new registration" feed (top-level `notifications` collection,
  written by the app at sign-up) is still not read by anything; new leader and
  admin accounts now reach admins through the approval notifications below
  instead.
- Reported prayer-wall content (the admin Reported tab) is not pushed: it is a
  moderation queue rather than an approve/reject, and nothing notifies admins
  about it yet.
- Announcements can't be recalled or scheduled, and can only target everyone, a
  district or a congregation (not a role).
