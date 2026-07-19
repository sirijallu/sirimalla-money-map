// Small shared utilities: currency formatting, escaping, DOM + toast helpers.

// Currency is centralized here — change LOCALE + CURRENCY to switch currency
// app-wide, and update formatCompact's symbol/units below to match.
const LOCALE = 'en-US';
const CURRENCY = 'USD';
const money = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  maximumFractionDigits: 0,
});

export function formatMoney(n) {
  return money.format(Math.round(Number(n) || 0));
}

/** Compact $ for tight spaces: $1.2K, $3.4M, $1.1B. */
export function formatCompact(n) {
  const v = Number(n) || 0;
  const a = Math.abs(v);
  if (a >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${Math.round(v)}`;
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function qs(sel, root = document) {
  return root.querySelector(sel);
}
export function qsa(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

/** Transient toast notification. Needs a #toast element in the page. */
export function toast(message, type = 'info') {
  const host = document.getElementById('toast');
  if (!host) return;
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = message;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('toast--show'));
  setTimeout(() => {
    el.classList.remove('toast--show');
    setTimeout(() => el.remove(), 250);
  }, 3200);
}
