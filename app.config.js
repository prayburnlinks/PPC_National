// When EXPO_GO=1, publish updates under the SDK runtime ("exposdk:54.0.0") so
// Expo Go can load them. Every other build keeps the appVersion policy, which
// is what the Play Store build (runtime "1.0.0") expects — do not change that
// default or shipped installs stop receiving updates.
const expoGo = process.env.EXPO_GO === '1';

export default ({ config }) => ({
  ...config,
  ...(expoGo ? { runtimeVersion: { policy: 'sdkVersion' } } : {}),
  extra: {
    ...config.extra,
    firebaseApiKey: process.env.FIREBASE_API_KEY,
    firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    firebaseAppId: process.env.FIREBASE_APP_ID,
  },
});
