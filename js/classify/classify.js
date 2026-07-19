// The classification engine.
// -----------------------------------------------------------------------------
// Order of precedence for each transaction:
//   1. Manual override        (categorySource === 'manual')  — never touched
//   2. Trainable mapping table (learned merchantKey -> category)
//   3. Keyword rules           (user rules first, then defaults; priority desc)
//   4. Flow heuristic          (money in with no match => income)
//   5. Uncategorized
//
// The mapping table is what makes classification "trainable": whenever the user
// re-categorizes a transaction, learnMapping() records merchantKey -> category
// so future imports of the same merchant are auto-filed.

import { DEFAULT_RULES } from './rules.js';
import { UNCATEGORIZED, INCOME } from './categories.js';

/** Lowercased, whitespace-collapsed description — used for keyword matching. */
export function normalizeDescription(desc) {
  return String(desc || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * A compact "merchant key" for the mapping table, so variants like
 * "UPI/SWIGGY/1234/ORDER" and "SWIGGY ORDER BANGALORE" collapse toward the same
 * learnable key. Strips digits, punctuation and payment-rail tokens.
 */
export function merchantKey(desc) {
  return normalizeDescription(desc)
    .replace(/\b(upi|imps|neft|rtgs|pos|ach|ref|txn|no|id|ord|order|payment|pmt)\b/g, ' ')
    .replace(/[0-9]+/g, ' ')
    .replace(/[^a-z ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesRule(desc, rule) {
  if (!rule || !rule.pattern) return false;
  if (rule.match === 'regex') {
    try {
      return new RegExp(rule.pattern, 'i').test(desc);
    } catch {
      return false;
    }
  }
  return desc.includes(String(rule.pattern).toLowerCase());
}

/**
 * Classify one transaction. `ctx` = { rules, mappings }.
 * `rules` are the user's rules; defaults are appended automatically.
 */
export function classifyTransaction(txn, ctx = {}) {
  const rules = [...(ctx.rules || []), ...DEFAULT_RULES];
  const mappings = ctx.mappings || {};
  const desc = normalizeDescription(txn.description);
  const mkey = merchantKey(txn.description);

  // 2. Trainable mapping table (exact merchant key)
  if (mkey && mappings[mkey]) {
    return { category: mappings[mkey], categorySource: 'mapping' };
  }

  // 3. Keyword rules, strongest priority first
  const sorted = rules.slice().sort((a, b) => (b.priority || 0) - (a.priority || 0));
  for (const rule of sorted) {
    if (matchesRule(desc, rule)) {
      return { category: rule.category, categorySource: 'rule' };
    }
  }

  // 4. Money in with no rule match is almost always income
  if (txn.flow === 'in') {
    return { category: INCOME, categorySource: 'heuristic' };
  }

  // 5. Give up
  return { category: UNCATEGORIZED, categorySource: 'uncategorized' };
}

/**
 * Classify an array of transactions (pure — returns new objects).
 * Manual overrides are preserved.
 */
export function classifyAll(transactions, ctx = {}) {
  return transactions.map((t) => {
    if (t.categorySource === 'manual') return t;
    const { category, categorySource } = classifyTransaction(t, ctx);
    return { ...t, category, categorySource };
  });
}

/** Record a learned merchantKey -> category from a manual re-categorization. */
export function learnMapping(mappings, description, category) {
  const mkey = merchantKey(description);
  if (!mkey) return mappings;
  return { ...mappings, [mkey]: category };
}
