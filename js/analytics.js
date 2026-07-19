// Aggregation used by the Visualise, Report, Plan and Track views.
// -----------------------------------------------------------------------------
// "Spend" = money out, excluding transfer-kind categories. "Income" = money in,
// excluding transfers. Income-category and transfer-category rows never count as
// spend, so category totals line up with the summary tiles.

import { categoryById } from './classify/categories.js';

function isTransfer(cats, id) {
  return categoryById(cats, id).kind === 'transfer';
}

export function spendTxns(txns, cats) {
  return txns.filter((t) => t.flow === 'out' && !isTransfer(cats, t.category));
}

export function incomeTxns(txns, cats) {
  return txns.filter((t) => t.flow === 'in' && !isTransfer(cats, t.category));
}

export function totalsByCategory(txns, cats) {
  const out = {};
  for (const t of spendTxns(txns, cats)) out[t.category] = (out[t.category] || 0) + t.amount;
  return out;
}

export function categoryBreakdown(txns, cats) {
  const totals = totalsByCategory(txns, cats);
  const grand = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
  const counts = {};
  for (const t of spendTxns(txns, cats)) counts[t.category] = (counts[t.category] || 0) + 1;
  return Object.entries(totals)
    .map(([id, total]) => {
      const cat = categoryById(cats, id);
      return {
        id,
        name: cat.name,
        color: cat.color,
        total,
        pct: (total / grand) * 100,
        count: counts[id] || 0,
        avg: total / (counts[id] || 1),
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function summary(txns, cats) {
  const spend = spendTxns(txns, cats).reduce((s, t) => s + t.amount, 0);
  const income = incomeTxns(txns, cats).reduce((s, t) => s + t.amount, 0);
  const breakdown = categoryBreakdown(txns, cats);
  const top = breakdown[0] || null;
  const uncategorized = txns.filter((t) => t.categorySource === 'uncategorized').length;
  return {
    totalSpend: spend,
    totalIncome: income,
    net: income - spend,
    topCategory: top,
    count: txns.length,
    uncategorized,
  };
}

export function monthlySpend(txns, cats) {
  const arr = Array(12).fill(0);
  for (const t of spendTxns(txns, cats)) arr[t.month - 1] += t.amount;
  return arr;
}

export function monthlyIncome(txns, cats) {
  const arr = Array(12).fill(0);
  for (const t of incomeTxns(txns, cats)) arr[t.month - 1] += t.amount;
  return arr;
}

/** { categoryId: number[12] } for expense categories that have any spend. */
export function monthlyByCategory(txns, cats) {
  const rows = {};
  for (const t of spendTxns(txns, cats)) {
    (rows[t.category] ||= Array(12).fill(0))[t.month - 1] += t.amount;
  }
  return rows;
}

/** Count of distinct months (1-12) that contain any transaction. */
export function monthsWithData(txns) {
  return new Set(txns.map((t) => t.month)).size || 1;
}
