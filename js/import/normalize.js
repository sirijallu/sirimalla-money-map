// Statement normalization.
// -----------------------------------------------------------------------------
// Turns arbitrary spreadsheet rows (array-of-arrays, first meaningful row is the
// header) into a clean Transaction[]. Bank/credit-card exports vary wildly, so
// this does best-effort column detection and amount/date parsing, then the
// Import tab shows a preview so anything odd can be corrected.
//
// Transaction shape produced here:
//   { id, date:'YYYY-MM-DD', year, month, description, amount (>=0),
//     flow:'in'|'out', account, source, importedAt,
//     category:'uncategorized', categorySource:'uncategorized' }

function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---- header detection -------------------------------------------------------
const HINTS = {
  date:    /\b(date|txn date|value date|transaction date|posting date|tran date)\b/i,
  balance: /\b(balance|closing bal|available bal|running bal)\b/i,
  debit:   /\b(debit|withdrawal|withdrawals?|paid out|spent|outflow|dr amount|amount \(dr\))\b/i,
  credit:  /\b(credit|deposit|deposits?|paid in|received|inflow|cr amount|amount \(cr\))\b/i,
  type:    /\b(dr\/cr|drcr|debit\/credit|type|indicator)\b/i,
  amount:  /\b(amount|amt|value|txn amount|transaction amount)\b/i,
  desc:    /\b(desc|description|narration|particular|particulars|details|remarks?|transaction|merchant|payee|name)\b/i,
};

// Assign each header cell to at most one field (priority order matters:
// specific fields before the broad `desc`, balance before amount).
function classifyHeader(cell) {
  const order = ['date', 'balance', 'debit', 'credit', 'type', 'amount', 'desc'];
  for (const field of order) if (HINTS[field].test(cell)) return field;
  return null;
}

function countHeaderMatches(row) {
  if (!Array.isArray(row)) return 0;
  let n = 0;
  for (const cell of row) if (classifyHeader(String(cell ?? '').trim())) n++;
  return n;
}

export function detectSchema(rows) {
  let headerIdx = 0;
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    if (countHeaderMatches(rows[i]) >= 2) {
      headerIdx = i;
      break;
    }
  }
  const header = (rows[headerIdx] || []).map((c) => String(c ?? '').trim());
  const cols = { date: -1, desc: -1, debit: -1, credit: -1, amount: -1, balance: -1, type: -1 };
  header.forEach((h, idx) => {
    const field = classifyHeader(h);
    if (field && cols[field] === -1) cols[field] = idx;
  });
  return { headerIdx, header, cols };
}

// ---- amount parsing ---------------------------------------------------------
export function parseAmount(raw) {
  if (raw == null || raw === '') return 0;
  if (typeof raw === 'number') return raw;
  let s = String(raw).trim();
  if (!s) return 0;
  const negative = /^\(.*\)$/.test(s) || s.startsWith('-');
  s = s.replace(/[()]/g, '').replace(/[₹$]/g, '').replace(/rs\.?|inr/gi, '');
  s = s.replace(/,/g, '').replace(/[a-z]/gi, '').trim();
  const n = parseFloat(s);
  if (Number.isNaN(n)) return 0;
  return negative ? -Math.abs(n) : n;
}

// ---- date parsing -----------------------------------------------------------
const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function fullYear(y) {
  return y < 100 ? 2000 + y : y;
}
function safeDate(y, m, d) {
  const dt = new Date(y, m, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function parseDate(raw) {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  if (typeof raw === 'number') {
    // Excel serial date (days since 1899-12-30)
    if (raw > 20000 && raw < 80000) {
      return new Date(Math.round((raw - 25569) * 86400 * 1000));
    }
  }
  const s = String(raw).trim();
  // ISO: YYYY-MM-DD
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return safeDate(+m[1], +m[2] - 1, +m[3]);
  // DD-MMM-YY(YY): 05-Jan-2025, 5 Jan 25
  m = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[A-Za-z]*[-/ ](\d{2,4})/);
  if (m && MONTHS[m[2].toLowerCase()] != null) {
    return safeDate(fullYear(+m[3]), MONTHS[m[2].toLowerCase()], +m[1]);
  }
  // DD/MM/YYYY (day-first, common in India). Swap only if clearly MM/DD.
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    let d = +m[1];
    let mo = +m[2];
    if (mo > 12 && d <= 12) [d, mo] = [mo, d];
    return safeDate(fullYear(+m[3]), mo - 1, d);
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t);
}

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function guessAccount(desc) {
  const d = desc.toLowerCase();
  if (d.includes('credit card') || d.includes('cc ')) return 'Credit Card';
  return '';
}

// ---- rows -> transactions ---------------------------------------------------
export function rowsToTransactions(rows, meta = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const { headerIdx, cols } = detectSchema(rows);
  const dataRows = rows.slice(headerIdx + 1);

  // Single-amount-column mode: if the column has any negatives it's the
  // "signed" convention (negative = money out); otherwise every value is a
  // magnitude and we treat it as spend (this is a spend-tracking app).
  let signedMode = false;
  if (cols.amount >= 0 && cols.debit < 0 && cols.credit < 0) {
    signedMode = dataRows.some((r) => parseAmount(r?.[cols.amount]) < 0);
  }

  const out = [];
  for (const row of dataRows) {
    if (!Array.isArray(row) || row.every((c) => c === '' || c == null)) continue;

    const date = parseDate(cols.date >= 0 ? row[cols.date] : null);
    if (!date) continue; // rows without a real date are totals/footers/blanks

    const description = cols.desc >= 0 ? String(row[cols.desc] ?? '').trim() : '';

    let amount = 0;
    let flow = 'out';
    if (cols.debit >= 0 || cols.credit >= 0) {
      const dr = cols.debit >= 0 ? Math.abs(parseAmount(row[cols.debit])) : 0;
      const cr = cols.credit >= 0 ? Math.abs(parseAmount(row[cols.credit])) : 0;
      if (cr > 0 && dr === 0) { amount = cr; flow = 'in'; }
      else { amount = dr || cr; flow = 'out'; }
    } else if (cols.amount >= 0) {
      const val = parseAmount(row[cols.amount]);
      const typeHint = (cols.type >= 0 ? String(row[cols.type] ?? '') : '').toLowerCase();
      amount = Math.abs(val);
      if (/\bcr\b|credit|deposit/.test(typeHint)) flow = 'in';
      else if (/\bdr\b|debit|withdraw/.test(typeHint)) flow = 'out';
      else if (signedMode) flow = val < 0 ? 'out' : 'in';
      else flow = 'out';
    }

    if (amount === 0 && !description) continue;

    out.push({
      id: uuid(),
      date: toISO(date),
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      description,
      amount,
      flow,
      account: meta.account || guessAccount(description) || 'Imported',
      source: meta.source || 'import',
      importedAt: Date.now(),
      category: 'uncategorized',
      categorySource: 'uncategorized',
    });
  }
  return out;
}

// ---- structured records -> transactions (sample data / already-clean rows) --
export function recordsToTransactions(records, meta = {}) {
  const out = [];
  for (const r of records) {
    const date = parseDate(r.date);
    if (!date) continue;
    out.push({
      id: uuid(),
      date: toISO(date),
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      description: String(r.description || '').trim(),
      amount: Math.abs(Number(r.amount) || 0),
      flow: r.flow === 'in' ? 'in' : 'out',
      account: r.account || meta.account || 'Imported',
      source: meta.source || 'sample',
      importedAt: Date.now(),
      category: 'uncategorized',
      categorySource: 'uncategorized',
    });
  }
  return out;
}
