// Visualise tab: summary tiles + charts for the selected year.

import { state, txnsForYear } from '../data/state.js';
import { summary, monthlySpend, monthlyIncome, categoryBreakdown } from '../analytics.js';
import { barChart, doughnutChart, lineChart, chartsReady } from '../charts.js';
import { formatMoney, MONTH_NAMES, escapeHtml } from '../util.js';

export function render(el) {
  const year = state.year;
  const txns = txnsForYear(year);

  if (txns.length === 0) {
    el.innerHTML = emptyState(year);
    return;
  }

  const s = summary(txns, state.categories);
  const spend = monthlySpend(txns, state.categories);
  const income = monthlyIncome(txns, state.categories);
  const breakdown = categoryBreakdown(txns, state.categories);
  const prev = txnsForYear(year - 1);
  const prevSpend = monthlySpend(prev, state.categories);
  const hasPrev = prev.length > 0;

  el.innerHTML = `
    <div class="view-head">
      <h2>Visualise · ${year}</h2>
      <p class="muted">${txns.length} transactions${s.uncategorized ? ` · <a href="#classify">${s.uncategorized} need a category</a>` : ''}</p>
    </div>

    <div class="tiles">
      ${tile('Total spend', formatMoney(s.totalSpend), 'out')}
      ${tile('Total income', formatMoney(s.totalIncome), 'in')}
      ${tile('Net', (s.net >= 0 ? '+' : '−') + formatMoney(Math.abs(s.net)), s.net >= 0 ? 'in' : 'out')}
      ${tile('Top category', s.topCategory ? escapeHtml(s.topCategory.name) : '—', 'neutral', s.topCategory ? formatMoney(s.topCategory.total) : '')}
    </div>

    <div class="grid grid-2">
      <section class="card">
        <h3>Spend vs income by month</h3>
        <div class="chart-box"><canvas id="chart-monthly"></canvas></div>
      </section>
      <section class="card">
        <h3>Spend by category</h3>
        <div class="chart-box"><canvas id="chart-cat"></canvas></div>
      </section>
    </div>

    <section class="card">
      <h3>Monthly spend trend${hasPrev ? ` · ${year} vs ${year - 1}` : ''}</h3>
      <div class="chart-box wide"><canvas id="chart-trend"></canvas></div>
    </section>

    ${chartsReady() ? '' : '<p class="muted">Charts need an internet connection (Chart.js loads from CDN).</p>'}
  `;

  if (!chartsReady()) return;

  barChart('chart-monthly', {
    labels: MONTH_NAMES,
    datasets: [
      { label: 'Spend', data: spend, backgroundColor: '#6366f1' },
      { label: 'Income', data: income, backgroundColor: '#10b981' },
    ],
  });

  const top = breakdown.slice(0, 8);
  const otherTotal = breakdown.slice(8).reduce((a, b) => a + b.total, 0);
  doughnutChart('chart-cat', {
    labels: [...top.map((c) => c.name), ...(otherTotal ? ['Other'] : [])],
    data: [...top.map((c) => Math.round(c.total)), ...(otherTotal ? [Math.round(otherTotal)] : [])],
    colors: [...top.map((c) => c.color), ...(otherTotal ? ['#e2e8f0'] : [])],
  });

  lineChart('chart-trend', {
    labels: MONTH_NAMES,
    datasets: [
      { label: `${year} spend`, data: spend, borderColor: '#6366f1', backgroundColor: '#6366f1' },
      ...(hasPrev ? [{ label: `${year - 1} spend`, data: prevSpend, borderColor: '#94a3b8', backgroundColor: '#94a3b8', borderDash: [5, 4] }] : []),
    ],
  });
}

function tile(label, value, tone = 'neutral', sub = '') {
  return `<div class="tile">
    <span class="tile-label">${label}</span>
    <span class="tile-value ${tone}">${value}</span>
    ${sub ? `<span class="tile-sub">${sub}</span>` : ''}
  </div>`;
}

function emptyState(year) {
  return `
    <div class="view-head"><h2>Visualise · ${year}</h2></div>
    <section class="card empty">
      <p>No transactions for ${year} yet.</p>
      <p class="muted">Head to <a href="#import">Import</a> and load sample data or a statement, then pick the year up top.</p>
    </section>`;
}
