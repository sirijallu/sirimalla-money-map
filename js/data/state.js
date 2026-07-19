// Central in-memory application state + a tiny pub/sub.
// -----------------------------------------------------------------------------
// Views read from `state` and re-render when `emitChange()` fires. Persistence
// lives in data/store.js; this is only the live working set for the session.

const listeners = new Set();

export const state = {
  // session
  user: null,               // { uid, name, email, photoURL } | null
  ready: false,             // per-user data loaded?
  activeView: 'import',     // current tab id
  year: new Date().getFullYear(),

  // per-user data (loaded from store on sign-in)
  transactions: [],         // Transaction[]
  categories: [],           // Category[]
  rules: [],                // Rule[]  (user rules; defaults merged at classify time)
  mappings: {},             // { merchantKey: categoryId }  — the trainable table
  budgets: {},              // { [year]: { [categoryId]: monthlyLimit } }
};

/** Subscribe to state changes. Returns an unsubscribe function. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Notify all subscribers that state changed. */
export function emitChange() {
  for (const fn of listeners) fn(state);
}

/** Shallow-merge a patch into state and notify. */
export function setState(patch) {
  Object.assign(state, patch);
  emitChange();
}

// ---- Derived selectors ------------------------------------------------------

/** All transactions for a given year (defaults to the active year). */
export function txnsForYear(year = state.year) {
  return state.transactions.filter((t) => t.year === year);
}

/** Distinct years present in the data, always including the current year. */
export function availableYears() {
  const current = new Date().getFullYear();
  // Always offer the dropdown back to 2020 (or earlier if data predates it).
  const earliest = Math.min(2020, current, ...state.transactions.map((t) => t.year));
  const years = [];
  for (let y = current; y >= earliest; y--) years.push(y);
  return years;
}
