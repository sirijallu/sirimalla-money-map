// Authentication abstraction.
// -----------------------------------------------------------------------------
// Two backends, selected automatically by whether Firebase is configured:
//   • local    — a single on-device profile, no password (default, offline)
//   • firebase — real Google sign-in (popup), session persisted by Firebase
// Both expose the same user shape { uid, name, email, photoURL }, so nothing
// downstream changes when you switch.

import { isFirebaseConfigured } from '../config/firebase-config.js';
import { getFirebase } from './firebase.js';

const LS_KEY = 'smm:auth:localUser';
const listeners = new Set();
let current = null;
let inited = false;

function notify() {
  for (const fn of listeners) fn(current);
}

// ---- local backend ----------------------------------------------------------
const localAuth = {
  init() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      current = raw ? JSON.parse(raw) : null;
    } catch {
      current = null;
    }
    inited = true;
    notify();
  },
  async signIn() {
    current = { uid: 'local-user', name: 'You', email: '', photoURL: '', local: true };
    localStorage.setItem(LS_KEY, JSON.stringify(current));
    notify();
    return current;
  },
  async signOut() {
    current = null;
    localStorage.removeItem(LS_KEY);
    notify();
  },
};

// ---- firebase backend -------------------------------------------------------
const firebaseAuth = {
  async init() {
    try {
      const fb = await getFirebase();
      fb.authMod.onAuthStateChanged(fb.auth, (u) => {
        current = u
          ? { uid: u.uid, name: u.displayName || u.email || 'You', email: u.email || '', photoURL: u.photoURL || '', local: false }
          : null;
        inited = true;
        notify();
      });
    } catch (err) {
      console.error('Firebase init failed; check config + network:', err);
      inited = true;
      current = null;
      notify();
    }
  },
  async signIn() {
    const fb = await getFirebase();
    const provider = new fb.authMod.GoogleAuthProvider();
    await fb.authMod.signInWithPopup(fb.auth, provider); // onAuthStateChanged then fires
  },
  async signOut() {
    const fb = await getFirebase();
    await fb.authMod.signOut(fb.auth);
  },
};

const backend = isFirebaseConfigured ? firebaseAuth : localAuth;

export const auth = {
  mode: isFirebaseConfigured ? 'firebase' : 'local',
  cloudConfigured: isFirebaseConfigured,

  get currentUser() {
    return current;
  },
  onChange(fn) {
    listeners.add(fn);
    if (inited) fn(current);
    return () => listeners.delete(fn);
  },
  init: () => backend.init(),
  signIn: () => backend.signIn(),
  signOut: () => backend.signOut(),
};
