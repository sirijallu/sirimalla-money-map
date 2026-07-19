// Authentication abstraction.
// -----------------------------------------------------------------------------
// Local-first mode (default): a single on-device profile, no password, so you
// can use the app right away. Data stays in this browser.
//
// Firebase mode (once js/config/firebase-config.js is filled and a Firebase
// auth backend is wired): real Google sign-in. The user shape below
// ({ uid, name, email, photoURL }) is identical in both modes, so no caller
// needs to change when we switch.

import { isFirebaseConfigured } from '../config/firebase-config.js';

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

// Firebase auth backend will replace this once wired.
const backend = localAuth;

export const auth = {
  // 'local' until a real Firebase auth backend is active.
  mode: 'local',
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
