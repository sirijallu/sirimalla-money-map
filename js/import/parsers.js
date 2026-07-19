// File parsers.
// -----------------------------------------------------------------------------
// Turns an uploaded File into rows (array-of-arrays). Excel / CSV / TSV / ODS
// all go through SheetJS (window.XLSX, loaded from CDN in index.html). PDF is a
// clearly-signposted stub for the next increment.

/** Read a File and return { rows, sheetName, sheetNames }. */
export async function fileToRows(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return parsePdf(file);
  return parseSpreadsheet(file);
}

async function parseSpreadsheet(file) {
  if (!window.XLSX) throw new Error('Spreadsheet engine (SheetJS) not loaded — check your connection and reload.');
  const buf = await file.arrayBuffer();
  const wb = window.XLSX.read(buf, { type: 'array', cellDates: true, raw: false });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
  return { rows, sheetName, sheetNames: wb.SheetNames };
}

async function parsePdf() {
  // TODO(next increment): pdf.js text extraction + table/line heuristics to
  // recover columns. Kept as a clear, actionable error for now.
  throw new Error(
    'PDF import lands in the next increment. For now, export your statement as ' +
    'CSV or Excel (most banks offer "Download as Excel/CSV"), or paste a Google ' +
    'Sheets link — both import cleanly today.',
  );
}

/** Parse raw CSV text into rows (used by the Google Sheets link path). */
export function csvTextToRows(text) {
  if (!window.XLSX) throw new Error('Spreadsheet engine (SheetJS) not loaded.');
  const wb = window.XLSX.read(text, { type: 'string' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return window.XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
}
