// Lazy Firebase initialiser.
// -----------------------------------------------------------------------------
// The Firebase SDK is loaded ONLY when the app is configured, and only on first
// use, via dynamic import() of the official ESM CDN build. This keeps
// local-first mode fast and free of any Firebase network calls until you paste
// your config into config/firebase-config.js.
//
// getFirebase() resolves to { app, auth, db, authMod, fsMod } (the SDK modules
// are returned so the auth/firestore backends can use their functions without
// importing the SDK a second time), or null when not configured.

import { firebaseConfig, isFirebaseConfigured } from '../config/firebase-config.js';

export const FIREBASE_SDK = '10.12.5';
const CDN = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK}`;

let bootPromise = null;

export async function getFirebase() {
  if (!isFirebaseConfigured) return null;
  if (!bootPromise) {
    bootPromise = (async () => {
      const [appMod, authMod, fsMod] = await Promise.all([
        import(`${CDN}/firebase-app.js`),
        import(`${CDN}/firebase-auth.js`),
        import(`${CDN}/firebase-firestore.js`),
      ]);
      const app = appMod.initializeApp(firebaseConfig);
      const auth = authMod.getAuth(app);
      const db = fsMod.getFirestore(app);
      return { app, auth, db, authMod, fsMod };
    })().catch((err) => {
      bootPromise = null; // allow a retry on transient CDN/network failure
      throw err;
    });
  }
  return bootPromise;
}
