// Classify tab (Auto-Classifying): review + correct categories (which trains
// the mapping table), manage keyword rules, and inspect learned mappings.

import { state, emitChange } from '../data/state.js';
import { store } from '../data/store.js';
import { classifyAll, learnMapping, merchantKey } from '../classify/classify.js';
import { DEFAULT_RULES } from '../classify/rules.js';
import { categoryById } from '../classify/categories.js';
import { formatINR, escapeHtml, toast } from '../util.js';

let root = null;
let filter = 'uncategorized'; // 'uncategorized' | 'all'

const SRC_LABEL = { rule: 'rule', mapping: 'learned', manual: 'you', heuristic: 'auto', uncategorized: '—' };

function ctx() {
  return { rules: state.rules, mappings: state.mappings };
}

export function render(el) {
  root = el;
  const total = state.transactions.length;
  const uncats = state.transactions.filter((t) => t.categorySource === 'uncategorized');
  const classified = total - uncats.length;

  const list = filter === 'uncategorized' ? uncats : state.transactions.slice();
  list.sort((a, b) => (a.date < b.date ? 1 : -1));
  const shown = list.slice(0, 200);

  el.innerHTML = `
    <div class="view-head">
      <h2>Auto-classification</h2>
      <p class="muted">${classified}/${total} classified · ${uncats.length} uncategorized. Correcting a category teaches the mapping table for next time.</p>
    </div>

    <section class="card">
      <div class="row-between">
        <h3>Transactions</h3>
        <div class="controls">
          <input id="cls-search" type="search" placeholder="Search description…" />
          <select id="cls-filter">
            <option value="uncategorized" ${filter === 'uncategorized' ? 'selected' : ''}>Uncategorized only</option>
            <option value="all" ${filter === 'all' ? 'selected' : ''}>All transactions</option>
          </select>
          <button class="btn btn-secondary" id="cls-rerun">Re-run auto-classify</button>
        </div>
      </div>
      ${shown.length === 0
        ? `<p class="empty">${total === 0 ? 'No transactions yet — import some first.' : 'Nothing uncategorized. 🎉'}</p>`
        : `<div class="table-scroll"><table class="data-table"><thead>
             <tr><th>Date</th><th>Description</th><th class="num">Amount</th><th>Category</th><th>Source</th></tr>
           </thead><tbody id="cls-rows">
             ${shown.map(rowHtml).join('')}
           </tbody></table></div>
           ${list.length > shown.length ? `<p class="muted small">Showing first 200 of ${list.length}.</p>` : ''}`}
    </section>

    <div class="grid grid-2">
      <section class="card">
        <h3>Keyword rules</h3>
        <p class="muted small">Your rules run before the ${DEFAULT_RULES.length} built-in defaults. First match wins.</p>
        <form id="rule-form" class="rule-form">
          <input id="rule-pattern" type="text" placeholder="keyword, e.g. amazon" required />
          <select id="rule-cat">${optionsHtml()}</select>
          <button class="btn" type="submit">Add</button>
        </form>
        ${state.rules.length === 0
          ? '<p class="muted small">No custom rules yet.</p>'
          : `<ul class="chip-list">${state.rules.map(ruleChip).join('')}</ul>`}
      </section>

      <section class="card">
        <h3>Learned mappings</h3>
        <p class="muted small">Grows automatically each time you correct a category.</p>
        ${Object.keys(state.mappings).length === 0
          ? '<p class="muted small">Nothing learned yet.</p>'
          : `<ul class="chip-list">${Object.entries(state.mappings).map(mapChip).join('')}</ul>`}
      </section>
    </div>
  `;

  wire();
}

function rowHtml(t) {
  const cat = categoryById(state.categories, t.category);
  const sign = t.flow === 'in' ? '+' : '−';
  return `<tr data-desc="${escapeHtml((t.description || '').toLowerCase())}">
    <td class="nowrap">${escapeHtml(t.date)}</td>
    <td class="desc">${escapeHtml(t.description) || '<span class="muted">—</span>'}</td>
    <td class="num ${t.flow}">${sign}${formatINR(t.amount)}</td>
    <td><select class="cat-select" data-id="${t.id}" style="border-left:3px solid ${cat.color}">${optionsHtml(t.category)}</select></td>
    <td><span class="src src--${t.categorySource}">${SRC_LABEL[t.categorySource] || t.categorySource}</span></td>
  </tr>`;
}

function optionsHtml(selected) {
  return state.categories
    .map((c) => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${escapeHtml(c.name)}</option>`)
    .join('');
}

function ruleChip(r) {
  const cat = categoryById(state.categories, r.category);
  return `<li class="chip">
    <span><code>${escapeHtml(r.pattern)}</code> → <i class="dot" style="background:${cat.color}"></i>${escapeHtml(cat.name)}</span>
    <button class="chip-x" data-rule="${r.id}" title="Delete rule">×</button>
  </li>`;
}

function mapChip([key, catId]) {
  const cat = categoryById(state.categories, catId);
  return `<li class="chip">
    <span><code>${escapeHtml(key)}</code> → <i class="dot" style="background:${cat.color}"></i>${escapeHtml(cat.name)}</span>
    <button class="chip-x" data-map="${escapeHtml(key)}" title="Forget mapping">×</button>
  </li>`;
}

function wire() {
  root.querySelector('#cls-filter').addEventListener('change', (e) => {
    filter = e.target.value;
    render(root);
  });

  const search = root.querySelector('#cls-search');
  search?.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    root.querySelectorAll('#cls-rows tr').forEach((tr) => {
      tr.style.display = !q || tr.dataset.desc.includes(q) ? '' : 'none';
    });
  });

  root.querySelectorAll('.cat-select').forEach((sel) =>
    sel.addEventListener('change', (e) => reclassifyOne(e.target.dataset.id, e.target.value)));

  root.querySelector('#cls-rerun').addEventListener('click', rerun);
  root.querySelector('#rule-form').addEventListener('submit', addRule);

  root.querySelectorAll('.chip-x[data-rule]').forEach((b) =>
    b.addEventListener('click', () => deleteRule(b.dataset.rule)));
  root.querySelectorAll('.chip-x[data-map]').forEach((b) =>
    b.addEventListener('click', () => deleteMapping(b.dataset.map)));
}

async function reclassifyOne(id, category) {
  const t = state.transactions.find((x) => x.id === id);
  if (!t) return;
  t.category = category;
  t.categorySource = 'manual';
  state.mappings = learnMapping(state.mappings, t.description, category);
  await store.saveTransactions(state.user.uid, state.transactions);
  await store.saveMappings(state.user.uid, state.mappings);
  const key = merchantKey(t.description);
  toast(key ? `Learned “${key}” → ${categoryById(state.categories, category).name}` : 'Category updated', 'success');
  emitChange();
}

function reclassifyNonManual() {
  const before = new Map(state.transactions.map((t) => [t.id, t.category]));
  state.transactions = classifyAll(state.transactions, ctx());
  let changed = 0;
  for (const t of state.transactions) if (before.get(t.id) !== t.category) changed++;
  return changed;
}

async function rerun() {
  const changed = reclassifyNonManual();
  await store.saveTransactions(state.user.uid, state.transactions);
  toast(changed ? `Re-classified ${changed} transaction${changed === 1 ? '' : 's'}.` : 'No changes — everything already matches your rules.', 'success');
  emitChange();
}

async function addRule(e) {
  e.preventDefault();
  const pattern = root.querySelector('#rule-pattern').value.trim();
  const category = root.querySelector('#rule-cat').value;
  if (!pattern) return;
  state.rules = [
    ...state.rules,
    { id: `user:${Date.now()}`, pattern: pattern.toLowerCase(), match: 'contains', category, priority: 100, source: 'user' },
  ];
  await store.saveRules(state.user.uid, state.rules);
  reclassifyNonManual();
  await store.saveTransactions(state.user.uid, state.transactions);
  toast(`Rule added: “${pattern}” → ${categoryById(state.categories, category).name}`, 'success');
  emitChange();
}

async function deleteRule(id) {
  state.rules = state.rules.filter((r) => r.id !== id);
  await store.saveRules(state.user.uid, state.rules);
  reclassifyNonManual();
  await store.saveTransactions(state.user.uid, state.transactions);
  emitChange();
}

async function deleteMapping(key) {
  const next = { ...state.mappings };
  delete next[key];
  state.mappings = next;
  await store.saveMappings(state.user.uid, state.mappings);
  reclassifyNonManual();
  await store.saveTransactions(state.user.uid, state.transactions);
  emitChange();
}
