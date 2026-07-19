// Default budget categories.
// -----------------------------------------------------------------------------
// `kind` drives reporting: 'income' vs 'expense' vs 'transfer' (transfers are
// excluded from spend totals). `color` is used consistently across all charts.

export const UNCATEGORIZED = 'uncategorized';
export const INCOME = 'income';

export const DEFAULT_CATEGORIES = [
  { id: 'income',        name: 'Income',           kind: 'income',   color: '#16a34a' },
  { id: 'rent',          name: 'Rent',             kind: 'expense',  color: '#7c3aed' },
  { id: 'emi',           name: 'EMI & Loans',      kind: 'expense',  color: '#b91c1c' },
  { id: 'groceries',     name: 'Groceries',        kind: 'expense',  color: '#059669' },
  { id: 'dining',        name: 'Dining & Takeout', kind: 'expense',  color: '#ea580c' },
  { id: 'transport',     name: 'Transport',        kind: 'expense',  color: '#0891b2' },
  { id: 'fuel',          name: 'Fuel',             kind: 'expense',  color: '#a16207' },
  { id: 'utilities',     name: 'Utilities & Bills',kind: 'expense',  color: '#2563eb' },
  { id: 'shopping',      name: 'Shopping',         kind: 'expense',  color: '#db2777' },
  { id: 'entertainment', name: 'Entertainment',    kind: 'expense',  color: '#c026d3' },
  { id: 'subscriptions', name: 'Subscriptions',    kind: 'expense',  color: '#9333ea' },
  { id: 'health',        name: 'Health',           kind: 'expense',  color: '#e11d48' },
  { id: 'insurance',     name: 'Insurance',        kind: 'expense',  color: '#0d9488' },
  { id: 'travel',        name: 'Travel',           kind: 'expense',  color: '#f59e0b' },
  { id: 'education',     name: 'Education',        kind: 'expense',  color: '#4f46e5' },
  { id: 'investments',   name: 'Investments',      kind: 'expense',  color: '#15803d' },
  { id: 'fees',          name: 'Fees & Charges',   kind: 'expense',  color: '#64748b' },
  { id: 'transfers',     name: 'Transfers',        kind: 'transfer', color: '#94a3b8' },
  { id: 'uncategorized', name: 'Uncategorized',    kind: 'expense',  color: '#cbd5e1' },
];

export function categoryById(categories, id) {
  return (
    categories.find((c) => c.id === id) ||
    categories.find((c) => c.id === UNCATEGORIZED) || {
      id: UNCATEGORIZED,
      name: 'Uncategorized',
      kind: 'expense',
      color: '#cbd5e1',
    }
  );
}

/** Categories eligible as spend buckets (excludes income + transfers). */
export function expenseCategories(categories) {
  return categories.filter((c) => c.kind === 'expense');
}
