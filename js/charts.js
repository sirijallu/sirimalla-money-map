// Chart.js 4 helpers.
// -----------------------------------------------------------------------------
// Chart.js is loaded as a global (window.Chart) from CDN in index.html. Each
// helper destroys any prior chart on the same canvas before drawing, so views
// can re-render freely without leaking chart instances.

import { formatCompact, formatMoney } from './util.js';

const instances = new Map(); // canvasId -> Chart

export function chartsReady() {
  return Boolean(window.Chart);
}

function themeColors() {
  const dark = document.documentElement.dataset.theme === 'dark'
    || (matchMedia('(prefers-color-scheme: dark)').matches
        && document.documentElement.dataset.theme !== 'light');
  return {
    text: dark ? '#cbd5e1' : '#475569',
    grid: dark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.15)',
  };
}

function draw(canvasId, config) {
  if (!window.Chart) return null;
  const el = document.getElementById(canvasId);
  if (!el) return null;
  if (instances.has(canvasId)) {
    instances.get(canvasId).destroy();
    instances.delete(canvasId);
  }
  const chart = new window.Chart(el, config);
  instances.set(canvasId, chart);
  return chart;
}

export function destroyChart(canvasId) {
  if (instances.has(canvasId)) {
    instances.get(canvasId).destroy();
    instances.delete(canvasId);
  }
}

const baseScales = () => {
  const c = themeColors();
  return {
    x: { ticks: { color: c.text }, grid: { display: false } },
    y: {
      ticks: { color: c.text, callback: (v) => formatCompact(v) },
      grid: { color: c.grid },
      beginAtZero: true,
    },
  };
};

const legend = (display = true) => {
  const c = themeColors();
  return { display, labels: { color: c.text, boxWidth: 12, usePointStyle: true } };
};

const moneyTooltip = {
  callbacks: {
    label: (ctx) => `${ctx.dataset.label ? ctx.dataset.label + ': ' : ''}${formatMoney(ctx.parsed.y ?? ctx.parsed)}`,
  },
};

/** Grouped bar chart (e.g. spend vs income by month). */
export function barChart(canvasId, { labels, datasets }) {
  return draw(canvasId, {
    type: 'bar',
    data: {
      labels,
      datasets: datasets.map((d) => ({ borderRadius: 4, maxBarThickness: 34, ...d })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: legend(datasets.length > 1), tooltip: moneyTooltip },
      scales: baseScales(),
    },
  });
}

/** Multi-line chart (e.g. year-over-year monthly spend). */
export function lineChart(canvasId, { labels, datasets }) {
  return draw(canvasId, {
    type: 'line',
    data: {
      labels,
      datasets: datasets.map((d) => ({ tension: 0.35, borderWidth: 2, pointRadius: 2, fill: false, ...d })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: legend(datasets.length > 1), tooltip: moneyTooltip },
      scales: baseScales(),
      interaction: { mode: 'index', intersect: false },
    },
  });
}

/** Doughnut (e.g. spend by category). */
export function doughnutChart(canvasId, { labels, data, colors }) {
  const c = themeColors();
  return draw(canvasId, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { position: 'right', labels: { color: c.text, boxWidth: 12, usePointStyle: true, padding: 12 } },
        tooltip: {
          callbacks: { label: (ctx) => `${ctx.label}: ${formatMoney(ctx.parsed)}` },
        },
      },
    },
  });
}
