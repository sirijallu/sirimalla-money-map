// Google Drive / Google Sheets public-link import.
// -----------------------------------------------------------------------------
// Best results with a Google Sheet shared "Anyone with the link" or, most
// reliably, File → Share → Publish to web → CSV. We rewrite the link to a CSV
// export URL and fetch it client-side. Some links are blocked by the browser's
// CORS policy; when that happens we return a clear, actionable message rather
// than failing silently. (A tiny serverless proxy is on the roadmap to make
// every private-but-shared link work — see DEVELOPMENT.md.)

import { csvTextToRows } from './parsers.js';

/** Rewrite a Sheets/Drive share link into a direct CSV export URL. */
export function toCsvExportUrl(link) {
  const s = String(link || '').trim();

  // Already a published CSV
  if (/output=csv/.test(s)) return s;

  // Google Sheet: .../spreadsheets/d/<ID>/edit#gid=<GID>
  let m = s.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) {
    const id = m[1];
    const gid = (s.match(/[#&?]gid=(\d+)/) || [])[1] || '0';
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
  }

  // Drive file: .../file/d/<ID>/view  or  ...open?id=<ID>  or  ...uc?id=<ID>
  m = s.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9-_]+)/) ||
      (/drive\.google\.com/.test(s) ? s.match(/[?&]id=([a-zA-Z0-9-_]+)/) : null);
  if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;

  return s; // fall through — try it as-is
}

/** Fetch a public Google link and return parsed rows. */
export async function fetchGoogleLink(link) {
  const url = toCsvExportUrl(link);
  let res;
  try {
    res = await fetch(url, { credentials: 'omit', redirect: 'follow' });
  } catch {
    throw new Error(
      'The browser blocked that fetch (usually CORS). Open the Sheet, then ' +
      'File → Share → Publish to web → CSV, and paste that published link.',
    );
  }
  if (!res.ok) {
    throw new Error(`Fetch failed (HTTP ${res.status}). Confirm the link is public and points to a Sheet.`);
  }
  const text = await res.text();
  if (/^\s*<(!doctype|html)/i.test(text)) {
    throw new Error(
      'That link returned a web page, not data. Use File → Share → Publish to ' +
      'web → CSV on the Sheet and paste the published link.',
    );
  }
  return csvTextToRows(text);
}
