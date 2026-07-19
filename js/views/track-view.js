// Track tab: actual monthly pace vs the budget you set in Plan, for the year.

import { state, txnsForYear } from '../data/state.js';
import { categoryById } from '../classify/categories.js';
import { totalsByCategory, monthsWithData } from '../analytics.js';
import { formatINR, escapeHtml } from '../util.js';

export function render(el) {
  const year = state.year;
  const budgets = state.budgets[year] || {};
  const txns = txnsForYear(year);
  const totals = totalsByCategory(txns, state.categories);
  const months = monthsWithData(txns);

  const hasBudget = Object.keys(budgets).length > 0;
  if (!hasBudget) {
    el.innerHTML = `<div class="view-head"><h2>Track · ${year}</h2></div>
      <section class="card empty">
        <p>No budgets set for ${year} yet.</p>
        <p class="muted">Set monthly budgets in <a href="#plan">Plan</a>, then track your pace against them here.</p>
      </section>`;
    return;
  }

  // Union of budgeted categories and categories with actual spend.
  const ids = [...new Set([...Object.keys(budgets), ...Object.keys(totals)])];
  const rows = ids.map((id) => {
    const cat = categoryById(state.categories, id);
    const budget = Number(budgets[id]) || 0;
    const avgActual = (totals[id] || 0) / months;
    const pct = budget > 0 ? (avgActual / budget) * 100 : (avgActual > 0 ? Infinity : 0);
    return { cat, budget, avgActual, pct };
  }).sort((a, b) => b.pct - a.pct);

  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totalActual = rows.reduce((s, r) => s + r.avgActual, 0);

  el.innerHTML = `
    <div class="view-head">
      <h2>Track · ${year}</h2>
      <p class="muted">Average monthly pace (over ${months} month${months === 1 ? '' : 's'} with data) vs your monthly budget.</p>
    </div>

    <div class="tiles">
      ${tile('Budget / month', formatINR(totalBudget), 'neutral')}
      ${tile('Actual pace / month', formatINR(totalActual), totalActual > totalBudget ? 'out' : 'in')}
      ${tile('Headroom / month', (totalBudget - totalActual >= 0 ? '+' : '−') + formatINR(Math.abs(totalBudget - totalActual)), totalBudget - totalActual >= 0 ? 'in' : 'out')}
    </div>

    <section class="card">
      ${rows.map(barRow).join('')}
    </section>
  `;
}

function barRow(r) {
  const over = r.pct > 100;
  const width = Math.min(100, r.pct === Infinity ? 100 : r.pct);
  const status = r.budget === 0
    ? '<span class="pill pill--warn">no budget</span>'
    : over ? '<span class="pill pill--over">over</span>' : '<span class="pill pill--ok">on track</span>';
  return `<div class="track-row">
    <div class="track-top">
      <span class="badge"><i class="dot" style="background:${r.cat.color}"></i>${escapeHtml(r.cat.name)}</span>
      <span class="track-nums">${formatINR(r.avgActual)} <span class="muted">/ ${r.budget ? formatINR(r.budget) : '—'}</span> ${status}</span>
    </div>
    <div class="track-bar"><span class="track-fill ${over ? 'over' : ''}" style="width:${width}%;background:${over ? '' : r.cat.color}"></span></div>
  </div>`;
}

function tile(label, value, tone) {
  return `<div class="tile"><span class="tile-label">${label}</span><span class="tile-value ${tone}">${value}</span></div>`;
}
