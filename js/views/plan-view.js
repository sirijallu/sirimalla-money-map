// Plan tab: set a monthly budget per category for the selected year.

import { state, txnsForYear, emitChange } from '../data/state.js';
import { store } from '../data/store.js';
import { expenseCategories } from '../classify/categories.js';
import { totalsByCategory, monthsWithData } from '../analytics.js';
import { formatMoney, escapeHtml, toast } from '../util.js';

let root = null;

export function render(el) {
  root = el;
  const year = state.year;
  const cats = expenseCategories(state.categories);
  const budgets = state.budgets[year] || {};

  const txns = txnsForYear(year);
  const actualTotals = totalsByCategory(txns, state.categories);
  const months = monthsWithData(txns);

  const plannedTotal = cats.reduce((s, c) => s + (Number(budgets[c.id]) || 0), 0);

  el.innerHTML = `
    <div class="view-head">
      <h2>Plan · ${year}</h2>
      <p class="muted">Set a monthly budget per category. "Avg / mo" shows your actual ${year} pace as a reference.</p>
    </div>

    <section class="card">
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr><th>Category</th><th class="num">Avg / mo (actual)</th><th class="num">Monthly budget</th></tr></thead>
          <tbody>
            ${cats.map((c) => {
              const avg = (actualTotals[c.id] || 0) / months;
              return `<tr>
                <td><span class="badge"><i class="dot" style="background:${c.color}"></i>${escapeHtml(c.name)}</span></td>
                <td class="num muted">${avg ? formatMoney(avg) : '—'}</td>
                <td class="num">
                  <input class="budget-input" data-cat="${c.id}" type="number" min="0" step="500"
                         value="${budgets[c.id] != null ? budgets[c.id] : ''}" placeholder="0" />
                </td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot><tr><th>Total planned / month</th><th></th><th class="num" id="plan-total">${formatMoney(plannedTotal)}</th></tr></tfoot>
        </table>
      </div>
      <div class="row-between" style="margin-top:16px">
        <span class="muted small">Annual plan: <strong id="plan-annual">${formatMoney(plannedTotal * 12)}</strong></span>
        <button class="btn" id="plan-save">Save budgets</button>
      </div>
    </section>
  `;

  wire();
}

function wire() {
  const inputs = root.querySelectorAll('.budget-input');
  const recalc = () => {
    let total = 0;
    inputs.forEach((i) => (total += Number(i.value) || 0));
    root.querySelector('#plan-total').textContent = formatMoney(total);
    root.querySelector('#plan-annual').textContent = formatMoney(total * 12);
  };
  inputs.forEach((i) => i.addEventListener('input', recalc));
  root.querySelector('#plan-save').addEventListener('click', save);
}

async function save() {
  const year = state.year;
  const next = {};
  root.querySelectorAll('.budget-input').forEach((i) => {
    const v = Number(i.value) || 0;
    if (v > 0) next[i.dataset.cat] = v;
  });
  state.budgets = { ...state.budgets, [year]: next };
  await store.saveBudgets(state.user.uid, state.budgets);
  toast(`Saved budgets for ${year}.`, 'success');
  emitChange();
}
