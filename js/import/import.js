// Import orchestration.
// -----------------------------------------------------------------------------
// file/link/records -> rows -> normalize -> classify -> preview -> commit.
// "Preview" means normalized + classified but not yet saved; the Import tab
// shows it for review, then commitTransactions() de-duplicates and persists.

import { state, emitChange } from '../data/state.js';
import { store } from '../data/store.js';
import { fileToRows } from './parsers.js';
import { fetchGoogleLink } from './gdrive.js';
import { rowsToTransactions, recordsToTransactions } from './normalize.js';
import { classifyAll } from '../classify/classify.js';

function classifyCtx() {
  return { rules: state.rules, mappings: state.mappings };
}

/** Parse an uploaded file into a classified preview (not saved). */
export async function previewFile(file, meta = {}) {
  const { rows } = await fileToRows(file);
  const txns = rowsToTransactions(rows, { source: file.name, ...meta });
  return classifyAll(txns, classifyCtx());
}

/** Parse a Google Drive/Sheets link into a classified preview (not saved). */
export async function previewGoogleLink(link, meta = {}) {
  const rows = await fetchGoogleLink(link);
  const txns = rowsToTransactions(rows, { source: 'google-sheet', ...meta });
  return classifyAll(txns, classifyCtx());
}

/** Turn structured records (e.g. sample data) into a classified preview. */
export function previewRecords(records, meta = {}) {
  const txns = recordsToTransactions(records, meta);
  return classifyAll(txns, classifyCtx());
}

/**
 * Commit previewed transactions into state + storage, skipping duplicates.
 * A duplicate = same date + amount + flow + description prefix.
 */
export async function commitTransactions(txns) {
  if (!state.user) throw new Error('Sign in before importing.');
  const seen = new Set(state.transactions.map(fingerprint));
  const fresh = txns.filter((t) => {
    const fp = fingerprint(t);
    if (seen.has(fp)) return false;
    seen.add(fp);
    return true;
  });
  const merged = [...state.transactions, ...fresh].sort((a, b) => (a.date < b.date ? 1 : -1));
  state.transactions = merged;
  await store.saveTransactions(state.user.uid, merged);
  emitChange();
  return { added: fresh.length, skipped: txns.length - fresh.length };
}

function fingerprint(t) {
  return [t.date, Math.round(t.amount * 100), t.flow, (t.description || '').slice(0, 40).toLowerCase()].join('|');
}
