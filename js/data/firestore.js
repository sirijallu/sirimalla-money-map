// Firestore storage backend.
// -----------------------------------------------------------------------------
// Implements the same async { read, write } contract as the localStorage
// backend in store.js, so callers are identical in both modes.
//
// Layout — one document per collection inside a per-user subcollection:
//   users/{uid}/state/{transactions | categories | rules | mappings | budgets}
// Each doc holds { value: <the collection>, updatedAt }. This keeps the simple
// "read whole / write whole" model the app already uses. (A future increment
// can split transactions into their own per-doc subcollection to scale past the
// ~1 MiB per-document limit — see DEVELOPMENT.md.)

import { getFirebase } from './firebase.js';

function ref(fb, uid, name) {
  return fb.fsMod.doc(fb.db, 'users', uid, 'state', name);
}

export const firestoreBackend = {
  async read(uid, name, fallback) {
    const fb = await getFirebase();
    const snap = await fb.fsMod.getDoc(ref(fb, uid, name));
    if (!snap.exists()) return fallback;
    const value = snap.data().value;
    return value === undefined ? fallback : value;
  },

  async write(uid, name, value) {
    const fb = await getFirebase();
    await fb.fsMod.setDoc(ref(fb, uid, name), { value, updatedAt: Date.now() });
  },
};
