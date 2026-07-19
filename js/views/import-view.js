// Import tab: upload a file, fetch a Google Sheets/Drive link, or load sample
// data. Everything produces a classified *preview* first; nothing is saved
// until you press "Import".

import { state } from '../data/state.js';
import { previewFile, previewGoogleLink, previewRecords, commitTransactions } from '../import/import.js';
import { generateSampleRecords } from '../data/sample-data.js';
import { categoryById } from '../classify/categories.js';
import { formatMoney, escapeHtml, toast } from '../util.js';

let pending = null;     // classified preview, not yet committed
let root = null;
let busy = false;

const ACCEPT = '.csv,.tsv,.txt,.xls,.xlsx,.xlsm,.ods,.pdf';

export function render(el) {
  root = el;
  const total = state.transactions.length;
  const accounts = [...new Set(state.transactions.map((t) => t.account))];

  el.innerHTML = `
    <div class="view-head">
      <h2>Import statements</h2>
      <p class="muted">Bank, credit-card, loan and EMI statements — CSV or Excel today, plus public Google Sheets links. Every row is auto-classified on the way in.</p>
    </div>

    <div class="grid grid-3">
      <section class="card">
        <h3>① Upload a file</h3>
        <label class="field"><span>Account / source label (optional)</span>
          <input id="imp-account" type="text" placeholder="e.g. HDFC Credit Card" />
        </label>
        <div id="dropzone" class="dropzone">
          <input id="imp-file" type="file" accept="${ACCEPT}" hidden />
          <p><strong>Drop a file</strong> or <button class="link" id="imp-browse">browse</button></p>
          <p class="muted small">CSV, Excel, ODS, TSV. PDF supported next increment.</p>
        </div>
      </section>

      <section class="card">
        <h3>② Google Sheets / Drive link</h3>
        <p class="muted small">Paste a Sheet shared "anyone with the link", or File → Share → Publish to web → CSV.</p>
        <label class="field"><span>Public link</span>
          <input id="imp-link" type="url" placeholder="https://docs.google.com/spreadsheets/d/…" />
        </label>
        <button class="btn" id="imp-fetch">Fetch &amp; preview</button>
      </section>

      <section class="card">
        <h3>③ Try it with sample data</h3>
        <p class="muted small">Loads ~2 years of realistic transactions so you can explore every tab and the year selector right away.</p>
        <button class="btn btn-secondary" id="imp-sample">Load sample data</button>
      </section>
    </div>

    <div id="imp-preview"></div>

    <section class="card subtle">
      <h3>Your data</h3>
      <p class="muted">${total} transaction${total === 1 ? '' : 's'} stored${accounts.length ? ` across ${accounts.length} account${accounts.length === 1 ? '' : 's'}: ${escapeHtml(accounts.join(', '))}` : ''}.</p>
    </section>
  `;

  wire();
  renderPreview();
}

function wire() {
  const fileInput = root.querySelector('#imp-file');
  const dz = root.querySelector('#dropzone');

  root.querySelector('#imp-browse').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  ['dragover', 'dragenter'].forEach((ev) =>
    dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('dropzone--over'); }));
  ['dragleave', 'drop'].forEach((ev) =>
    dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('dropzone--over'); }));
  dz.addEventListener('drop', (e) => {
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  });

  root.querySelector('#imp-fetch').addEventListener('click', handleLink);
  root.querySelector('#imp-sample').addEventListener('click', handleSample);
}

function account() {
  return root.querySelector('#imp-account')?.value.trim() || '';
}

async function handleFile(file) {
  if (busy) return;
  setBusy(true, `Parsing ${file.name}…`);
  try {
    pending = await previewFile(file, { account: account() });
    afterPreview(file.name);
  } catch (e) {
    toast(e.message || 'Could not read that file.', 'error');
  } finally {
    setBusy(false);
  }
}

async function handleLink() {
  if (busy) return;
  const link = root.querySelector('#imp-link').value.trim();
  if (!link) return toast('Paste a Google Sheets or Drive link first.', 'error');
  setBusy(true, 'Fetching link…');
  try {
    pending = await previewGoogleLink(link, { account: account() });
    afterPreview('Google Sheet');
  } catch (e) {
    toast(e.message || 'Could not fetch that link.', 'error');
  } finally {
    setBusy(false);
  }
}

function handleSample() {
  pending = previewRecords(generateSampleRecords(), { source: 'sample', account: 'Sample' });
  afterPreview('sample data');
}

function afterPreview(sourceName) {
  if (!pending || pending.length === 0) {
    toast(`No transactions found in ${sourceName}. Check the file has date + amount columns.`, 'error');
    pending = null;
  }
  renderPreview();
}

function setBusy(v, msg) {
  busy = v;
  const btns = root.querySelectorAll('button');
  btns.forEach((b) => (b.disabled = v));
  if (v && msg) toast(msg, 'info');
}

async function commit() {
  const txns = pending;
  pending = null;
  const res = await commitTransactions(txns); // fires state change -> re-render
  toast(`Imported ${res.added} transaction${res.added === 1 ? '' : 's'}` +
    (res.skipped ? `, skipped ${res.skipped} duplicate${res.skipped === 1 ? '' : 's'}.` : '.'), 'success');
}

function discard() {
  pending = null;
  renderPreview();
}

function renderPreview() {
  const host = root.querySelector('#imp-preview');
  if (!host) return;
  if (!pending || pending.length === 0) { host.innerHTML = ''; return; }

  const shown = pending.slice(0, 150);
  const inCount = pending.filter((t) => t.flow === 'in').length;
  const outSum = pending.filter((t) => t.flow === 'out').reduce((s, t) => s + t.amount, 0);
  const auto = pending.filter((t) => t.categorySource !== 'uncategorized').length;

  host.innerHTML = `
    <section class="card preview">
      <div class="preview-head">
        <div>
          <h3>Preview — ${pending.length} transaction${pending.length === 1 ? '' : 's'}</h3>
          <p class="muted small">${auto}/${pending.length} auto-classified · ${inCount} money-in · ${formatMoney(outSum)} total spend</p>
        </div>
        <div class="preview-actions">
          <button class="btn btn-secondary" id="pv-discard">Discard</button>
          <button class="btn" id="pv-import">Import ${pending.length}</button>
        </div>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr><th>Date</th><th>Description</th><th>Account</th><th class="num">Amount</th><th>Category</th></tr></thead>
          <tbody>
            ${shown.map(rowHtml).join('')}
          </tbody>
        </table>
      </div>
      ${pending.length > shown.length ? `<p class="muted small">Showing first ${shown.length} of ${pending.length}. All will be imported.</p>` : ''}
    </section>
  `;
  host.querySelector('#pv-import').addEventListener('click', commit);
  host.querySelector('#pv-discard').addEventListener('click', discard);
  host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function rowHtml(t) {
  const cat = categoryById(state.categories, t.category);
  const sign = t.flow === 'in' ? '+' : '−';
  return `<tr>
    <td class="nowrap">${escapeHtml(t.date)}</td>
    <td class="desc">${escapeHtml(t.description) || '<span class="muted">—</span>'}</td>
    <td class="nowrap muted">${escapeHtml(t.account)}</td>
    <td class="num ${t.flow}">${sign}${formatMoney(t.amount)}</td>
    <td><span class="badge"><i class="dot" style="background:${cat.color}"></i>${escapeHtml(cat.name)}</span></td>
  </tr>`;
}
