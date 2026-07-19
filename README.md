# Sirimalla Money Map

A personal-finance web app that **auto-classifies** your bank, credit-card, loan
and EMI transactions into budget categories, then helps you **report**, **plan**
and **track** spending across years.

- **Import** statements as CSV / Excel — or pull a public Google Sheets link (no copy-paste).
- **Auto-classify** every transaction with keyword rules **plus a user-trainable mapping table** — correct a category once and it sticks for next time.
- **Visualise** spend vs income, category breakdowns, and year-over-year trends.
- **Report** category totals and a category × month matrix.
- **Plan** monthly budgets per category and **Track** your actual pace against them.
- **Year selector** to move between the current and previous years.

Built build-free: **HTML5 + CSS3 + vanilla ES-module JavaScript** (no framework),
**Chart.js 4** for charts, **SheetJS** for spreadsheet parsing. Backend storage is
**local-first today** and drops into **Firebase Auth + Firestore** when configured.

> This is an incrementally-developed project. See **[DEVELOPMENT.md](DEVELOPMENT.md)**
> for status, roadmap, and the change log.

---

## Run it locally

No install, no build step. You just need Node (for the tiny dev server that
serves ES modules over http):

```bash
npm start
# → http://localhost:5173
```

Click **Continue** (local mode), then open **Import → Load sample data** to
populate ~2 years of realistic transactions and explore every tab.

## Tech stack

| Concern | Choice |
| --- | --- |
| App shell / views / rendering | HTML5, CSS3, vanilla JS ES modules (no framework) |
| Charts | Chart.js 4 (line, bar, doughnut) — via CDN |
| Spreadsheet parsing | SheetJS (xlsx) — reads Excel/CSV/TSV/ODS — via CDN |
| PDF statements | _stub_ — pdf.js planned (see DEVELOPMENT.md) |
| Auth | Firebase Auth (Google Sign-In) — _local fallback active until configured_ |
| Database | Firebase Firestore (per-user sub-collections) — _localStorage fallback active_ |
| External import | Google Drive / Sheets public-link fetch |
| Hosting | Vercel static hosting, CI/CD from Git |

## Project structure

```
index.html            SPA shell (header, year selector, tabs, sign-in)
css/styles.css        Theme-aware styles (light/dark)
server.js             Zero-dependency local dev server (dev only)
vercel.json           Static hosting config

js/
  app.js              Bootstrap: auth gate, data load, hash router, year selector
  util.js             Currency formatting, escaping, toast
  analytics.js        Aggregation (spend/income, breakdowns, monthly series)
  charts.js           Chart.js wrappers

  config/firebase-config.js   Firebase web config (empty = local-first mode)
  data/
    state.js          In-memory state + pub/sub + selectors
    store.js          Storage abstraction (localStorage now, Firestore-ready)
    auth.js           Auth abstraction (local now, Firebase-ready)
    sample-data.js    Deterministic demo statements
  import/
    parsers.js        SheetJS file → rows; PDF stub
    gdrive.js         Google Sheets/Drive link → rows
    normalize.js      Column detection + amount/date normalization
    import.js         Orchestration: parse → classify → preview → commit
  classify/
    categories.js     Default budget categories
    rules.js          Default keyword rules
    classify.js       Engine: mapping table → rules → heuristics
  views/
    import-view.js  visualize-view.js  report-view.js
    classify-view.js  plan-view.js  track-view.js
```

## How auto-classification works

For each transaction, in order:

1. **Manual override** — a category you set by hand is never overwritten.
2. **Trainable mapping table** — a learned `merchant → category` map. Every time
   you correct a category in the **Classify** tab, the merchant key is recorded,
   so future imports of that merchant are filed automatically.
3. **Keyword rules** — your custom rules (highest priority) then ~90 built-in
   defaults (Swiggy → Dining, BESCOM → Utilities, LIC → Insurance, …).
4. **Flow heuristic** — money-in with no match is treated as Income.
5. Otherwise **Uncategorized** (surfaced in the Classify tab for review).

## Importing statements

- **CSV / Excel / ODS / TSV** — drag-drop or browse. Columns (date, description,
  debit/credit or a single signed amount) are auto-detected; a **preview** shows
  the parsed + classified rows before anything is saved. Duplicates are skipped.
- **Google Sheets** — paste a link shared "anyone with the link", or use
  **File → Share → Publish to web → CSV** for the most reliable fetch.
- **PDF** — coming in a later increment; for now export CSV/Excel from your bank.

## Enabling Firebase (cloud sync + Google Sign-In)

The app is fully usable in **local mode** (data in this browser). To turn on
Google sign-in and cross-device sync:

1. Create a project at <https://console.firebase.google.com>.
2. Add a **Web app** and copy its config object.
3. Paste the values into [`js/config/firebase-config.js`](js/config/firebase-config.js).
4. **Authentication → Sign-in method →** enable **Google**.
5. **Firestore Database →** create (production mode).
6. **Authentication → Settings → Authorized domains →** add `localhost` and your
   `*.vercel.app` domain.

The Firebase _wiring_ (auth backend + Firestore store backend) lands in the next
increment; the storage/auth layers are already abstracted so it's a drop-in.
(Firebase web config is not secret — it's designed to ship to the browser.)

## Deploy to Vercel

This is a static site with CI/CD from Git:

1. Push to `github.com/sirijallu/sirimalla-money-map`.
2. In Vercel: **Add New → Project → Import** the repo. Framework preset **Other**
   (no build command, output = repo root). `vercel.json` already sets
   `framework: null`.
3. Every push to `main` auto-deploys.

## License

MIT
