// Report tab: category breakdown + a category × month matrix for the year.

import { state, txnsForYear } from '../data/state.js';
import { categoryBreakdown, monthlyByCategory, monthlySpend } from '../analytics.js';
import { categoryById } from '../classify/categories.js';
import { formatINR, MONTH_NAMES, escapeHtml } from '../util.js';

export function render(el) {
  const year = state.year;
  const txns = txnsForYear(year);

  if (txns.length === 0) {
    el.innerHTML = `<div class="view-head"><h2>Report · ${year}</h2></div>
      <section class="card empty"><p>No transactions for ${year}.</p>
      <p class="muted">Import data or pick another year.</p></section>`;
    return;
  }

  const breakdown = categoryBreakdown(txns, state.categories);
  const grand = breakdown.reduce((a, b) => a + b.total, 0);
  const matrix = monthlyByCategory(txns, state.categories);
  const monthTotals = monthlySpend(txns, state.categories);

  const matrixRows = Object.entries(matrix)
    .map(([id, months]) => ({ id, cat: categoryById(state.categories, id), months, total: months.reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total);

  el.innerHTML = `
    <div class="view-head">
      <h2>Report · ${year}</h2>
      <p class="muted">Total spend ${formatINR(grand)} across ${breakdown.length} categories.</p>
    </div>

    <section class="card">
      <h3>Category breakdown</h3>
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr><th>Category</th><th class="num">Total</th><th class="num">Share</th><th class="num">Txns</th><th class="num">Avg</th></tr></thead>
          <tbody>
            ${breakdown.map((c) => `
              <tr>
                <td><span class="badge"><i class="dot" style="background:${c.color}"></i>${escapeHtml(c.name)}</span></td>
                <td class="num">${formatINR(c.total)}</td>
                <td class="num">
                  <div class="share"><span class="share-bar" style="width:${c.pct.toFixed(1)}%;background:${c.color}"></span></div>
                  <span class="share-pct">${c.pct.toFixed(1)}%</span>
                </td>
                <td class="num">${c.count}</td>
                <td class="num">${formatINR(c.avg)}</td>
              </tr>`).join('')}
          </tbody>
          <tfoot><tr><th>Total</th><th class="num">${formatINR(grand)}</th><th class="num">100%</th><th class="num">${txns.length}</th><th></th></tr></tfoot>
        </table>
      </div>
    </section>

    <section class="card">
      <h3>By month</h3>
      <div class="table-scroll">
        <table class="data-table matrix">
          <thead><tr><th>Category</th>${MONTH_NAMES.map((m) => `<th class="num">${m}</th>`).join('')}<th class="num">Total</th></tr></thead>
          <tbody>
            ${matrixRows.map((r) => `
              <tr>
                <td><span class="badge"><i class="dot" style="background:${r.cat.color}"></i>${escapeHtml(r.cat.name)}</span></td>
                ${r.months.map((v) => `<td class="num ${v ? '' : 'zero'}">${v ? formatINR(v) : '·'}</td>`).join('')}
                <td class="num strong">${formatINR(r.total)}</td>
              </tr>`).join('')}
          </tbody>
          <tfoot><tr><th>Total</th>${monthTotals.map((v) => `<th class="num">${v ? formatINR(v) : '·'}</th>`).join('')}<th class="num">${formatINR(grand)}</th></tr></tfoot>
        </table>
      </div>
    </section>
  `;
}
