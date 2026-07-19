// Firebase web configuration.
// -----------------------------------------------------------------------------
// The app runs in "local-first" mode until you paste your real config below.
// Local-first stores everything in this browser (localStorage) so you can use
// every feature immediately with no account. When you want Google sign-in and
// cloud sync across devices:
//
//   1. Create a project at https://console.firebase.google.com
//   2. Add a Web app (</> icon) and copy its config object.
//   3. Paste the values below.
//   4. Authentication → Sign-in method → enable "Google".
//   5. Firestore Database → Create database (start in production mode).
//   6. Add the authorized domains (localhost + your *.vercel.app domain) under
//      Authentication → Settings → Authorized domains.
//
// NOTE: these values are NOT secret. Firebase web config is designed to ship to
// the browser; access is controlled by Firestore Security Rules, not by hiding
// the keys. So it is fine to commit this file.

export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

// True only once the essential fields are filled in. The app reads this to
// decide whether to boot the Firebase backends or stay local-first.
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);
