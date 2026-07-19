// Application bootstrap: auth gate, per-user data load, hash router, year
// selector, and the single re-render path that keeps every view in sync.

import { auth } from './data/auth.js';
import { state, subscribe, emitChange, availableYears } from './data/state.js';
import { store } from './data/store.js';
import { DEFAULT_CATEGORIES } from './classify/categories.js';
import { qs, toast } from './util.js';

import * as importView from './views/import-view.js';
import * as visualizeView from './views/visualize-view.js';
import * as reportView from './views/report-view.js';
import * as classifyView from './views/classify-view.js';
import * as planView from './views/plan-view.js';
import * as trackView from './views/track-view.js';

const VIEWS = {
  import: importView,
  visualize: visualizeView,
  report: reportView,
  classify: classifyView,
  plan: planView,
  track: trackView,
};

// ---- boot -------------------------------------------------------------------
function boot() {
  applyStoredTheme();
  wireChrome();
  subscribe(onStateChange);
  auth.onChange(onUser);
  auth.init();
  window.addEventListener('hashchange', onHashChange);
}

// ---- auth / data ------------------------------------------------------------
async function onUser(user) {
  state.user = user;
  if (!user) {
    showSignedOut();
    return;
  }
  await loadUserData(user);
  showApp();
  onHashChange();
}

async function loadUserData(user) {
  const [txns, cats, rules, mappings, budgets] = await Promise.all([
    store.getTransactions(user.uid),
    store.getCategories(user.uid),
    store.getRules(user.uid),
    store.getMappings(user.uid),
    store.getBudgets(user.uid),
  ]);
  state.transactions = txns || [];
  state.categories = cats || DEFAULT_CATEGORIES;
  state.rules = rules || [];
  state.mappings = mappings || {};
  state.budgets = budgets || {};
  if (!cats) await store.saveCategories(user.uid, state.categories); // seed on first run

  const years = availableYears();
  if (!years.includes(state.year)) state.year = years[0];
  state.ready = true;
  emitChange();
}

// ---- chrome (header, tabs, year, theme) ------------------------------------
function wireChrome() {
  qs('#btn-signin')?.addEventListener('click', () => auth.signIn());
  qs('#btn-signout')?.addEventListener('click', () => auth.signOut());
  qs('#theme-toggle')?.addEventListener('click', toggleTheme);

  qs('#year-select')?.addEventListener('change', (e) => {
    state.year = Number(e.target.value);
    emitChange();
  });
}

function showApp() {
  document.body.dataset.auth = 'in';
  qs('#signin').hidden = true;
  qs('#app').hidden = false;
  const u = state.user;
  qs('#user-name').textContent = u.name || 'You';
  const badge = qs('#storage-mode');
  if (badge) badge.textContent = auth.mode === 'firebase' ? 'Synced' : 'Local';
}

function showSignedOut() {
  document.body.dataset.auth = 'out';
  qs('#app').hidden = true;
  qs('#signin').hidden = false;
}

function onStateChange() {
  if (!state.user) return;
  refreshYearSelect();
  refreshMeta();
  renderActive();
}

function refreshYearSelect() {
  const sel = qs('#year-select');
  if (!sel) return;
  const years = availableYears();
  sel.innerHTML = years.map((y) => `<option value="${y}">${y}</option>`).join('');
  sel.value = String(state.year);
}

function refreshMeta() {
  const meta = qs('#hdr-meta');
  if (meta) {
    const n = state.transactions.length;
    const unc = state.transactions.filter((t) => t.categorySource === 'uncategorized').length;
    meta.textContent = `${n} txns${unc ? ` · ${unc} to classify` : ''}`;
  }
}

// ---- router -----------------------------------------------------------------
function onHashChange() {
  const view = location.hash.replace('#', '') || 'import';
  state.activeView = VIEWS[view] ? view : 'import';
  updateTabs();
  renderActive();
}

function updateTabs() {
  document.body.dataset.view = state.activeView; // per-view accent theming (CSS)
  document.querySelectorAll('#tabs a').forEach((a) => {
    a.classList.toggle('active', a.dataset.view === state.activeView);
  });
}

function renderActive() {
  if (!state.user) return;
  const container = qs('#view');
  const view = VIEWS[state.activeView] || VIEWS.import;
  try {
    view.render(container);
  } catch (e) {
    console.error(e);
    container.innerHTML = `<section class="card empty"><p>Something went wrong rendering this tab.</p><p class="muted small">${e.message}</p></section>`;
  }
}

// ---- theme ------------------------------------------------------------------
function applyStoredTheme() {
  const saved = localStorage.getItem('smm:theme');
  if (saved) document.documentElement.dataset.theme = saved;
}
function toggleTheme() {
  const cur = document.documentElement.dataset.theme;
  const next = cur === 'dark' ? 'light' : cur === 'light' ? 'dark'
    : (matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark');
  document.documentElement.dataset.theme = next;
  localStorage.setItem('smm:theme', next);
  emitChange(); // redraw charts for new theme
}

boot();
