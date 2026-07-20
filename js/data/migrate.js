// One-time local → cloud migration.
// -----------------------------------------------------------------------------
// When you first sign in with Google (cloud mode) and your Firestore has no
// transactions yet, we copy any data created earlier in local mode up to the
// cloud. It is deliberately conservative:
//   • only runs when the cloud transactions collection is empty
//   • never deletes the local copy (stays as a backup)

import { store } from './store.js';

const LOCAL_UID = 'local-user';

function readLocal(name, fallback) {
  try {
    const raw = localStorage.getItem(`smm:${LOCAL_UID}:${name}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export async function maybeMigrateLocalToCloud(uid) {
  if (!uid || uid === LOCAL_UID) return false;

  const localTx = readLocal('transactions', []);
  if (!Array.isArray(localTx) || localTx.length === 0) return false;

  const cloudTx = await store.getTransactions(uid);
  if (Array.isArray(cloudTx) && cloudTx.length > 0) return false; // cloud already has data

  await store.saveTransactions(uid, localTx);
  const rules = readLocal('rules', null);
  const mappings = readLocal('mappings', null);
  const budgets = readLocal('budgets', null);
  const categories = readLocal('categories', null);
  if (rules) await store.saveRules(uid, rules);
  if (mappings) await store.saveMappings(uid, mappings);
  if (budgets) await store.saveBudgets(uid, budgets);
  if (categories) await store.saveCategories(uid, categories);

  return true;
}
