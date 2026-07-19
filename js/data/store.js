// Storage abstraction.
// -----------------------------------------------------------------------------
// Exposes an async, Promise-based API so a Firestore backend can drop in later
// with zero changes to callers. Today it is backed by localStorage, namespaced
// per user id (`smm:<uid>:<collection>`).
//
// When Firebase is wired (next increment), data/firestore.js will implement the
// same { read, write } contract and `backend` below will point at it whenever
// the user is signed in with a real cloud account.

const NS = 'smm';

function key(uid, name) {
  return `${NS}:${uid}:${name}`;
}

// ---- localStorage backend ---------------------------------------------------
const localBackend = {
  async read(uid, name, fallback) {
    try {
      const raw = localStorage.getItem(key(uid, name));
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  async write(uid, name, value) {
    try {
      localStorage.setItem(key(uid, name), JSON.stringify(value));
    } catch (e) {
      // Most likely quota exceeded — surface it so the UI can warn.
      throw new Error('Could not save locally: ' + (e?.message || e));
    }
  },
};

// Firestore backend will be assigned here once implemented + configured.
const backend = localBackend;

export const store = {
  usingCloud: backend !== localBackend,

  getTransactions: (uid) => backend.read(uid, 'transactions', []),
  saveTransactions: (uid, txns) => backend.write(uid, 'transactions', txns),

  // null fallback => caller seeds defaults on first run
  getCategories: (uid) => backend.read(uid, 'categories', null),
  saveCategories: (uid, cats) => backend.write(uid, 'categories', cats),

  getRules: (uid) => backend.read(uid, 'rules', null),
  saveRules: (uid, rules) => backend.write(uid, 'rules', rules),

  getMappings: (uid) => backend.read(uid, 'mappings', {}),
  saveMappings: (uid, mappings) => backend.write(uid, 'mappings', mappings),

  getBudgets: (uid) => backend.read(uid, 'budgets', {}),
  saveBudgets: (uid, budgets) => backend.write(uid, 'budgets', budgets),
};
