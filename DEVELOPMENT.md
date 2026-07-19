# Development log & roadmap

This is a living document that tracks how **Sirimalla Money Map** is built up
increment by increment. Update the **Change log** at the bottom each session.

---

## Status — Increment 1 (2026-07-19) ✅ Foundation + working vertical slice

The app runs end-to-end in **local-first** mode: import → auto-classify →
visualise → report → plan → track, with a year selector across all tabs.

**Repo:** `github.com/sirijallu/sirimalla-money-map` — `main` @ commit `91ca816`,
pushed 2026-07-19.
**Deploy:** Vercel not connected yet — dashboard import (framework **Other**, no
build) is the remaining step; pushes to `main` auto-deploy once connected.

### What works today

| Area | State | Notes |
| --- | --- | --- |
| SPA shell | ✅ | Header, year selector, 6 tabs, theme toggle (light/dark), sign-in gate, toasts |
| Storage | ✅ local | `data/store.js` abstraction; localStorage backend, Firestore-ready contract |
| Auth | ✅ local | `data/auth.js` abstraction; single on-device profile, Firebase-ready shape |
| Import — CSV/Excel/ODS/TSV | ✅ | SheetJS; column auto-detection; classified preview before commit; dedupe |
| Import — Google Sheets link | ✅ best-effort | Rewrites to CSV export URL + fetch; needs a public/published sheet (CORS) |
| Column normalization | ✅ | Debit/Credit or single signed amount; DD/MM + ISO + DD-MMM + Excel-serial dates; ₹/comma parsing |
| Auto-classify | ✅ | Mapping table → user rules → ~90 default keyword rules → flow heuristic |
| Trainable mapping | ✅ | Correcting a category learns `merchantKey → category` |
| Rules editor | ✅ | Add/delete custom rules in Classify tab; re-run classification |
| Visualise | ✅ | Tiles; spend-vs-income bar; category doughnut; YoY spend line |
| Report | ✅ | Category breakdown + category × month matrix |
| Plan | ✅ | Monthly budget per category, per year; "avg/mo actual" reference |
| Track | ✅ | Actual monthly pace vs budget, progress bars, over/under |
| Sample data | ✅ | ~285 txns across last year + this year, through the real pipeline |

### Stubbed / not yet wired (next increments)

- **PDF import** — `import/parsers.js#parsePdf` throws a clear message. Needs pdf.js.
- **Firebase Auth + Firestore** — config placeholder + abstractions exist; the
  actual backends aren't wired yet, so everything is local to the browser.
- **Google Drive private files** — only public/published links fetch client-side
  (CORS). A serverless proxy would unlock "anyone with the link" private files.

### Verified (Increment 1)

- Node pipeline test: 285 sample txns, 0 uncategorized; raw bank rows
  (Withdrawal/Deposit + DD/MM + comma amounts) parse to correct flow/category;
  trainable mapping classifies a new merchant variant.
- Headless-Chrome render of Visualise (charts + tiles) and a full `app.js` boot
  into the Report view (auth → data load → router → render).
- Correct MIME types for ES modules over the dev server.

---

## Roadmap (proposed order)

**Increment 2 — Firebase backend**
- `data/firebase.js` (init from config), `data/firebase-auth.js` (Google popup),
  `data/firestore.js` (implements the `store` read/write contract).
- Flip `store`/`auth` backends when `isFirebaseConfigured` + signed in.
- Firestore layout: `users/{uid}/transactions`, `/rules`, `/mappings`,
  `/budgets`, `/meta`. Security rules: a user can read/write only their own docs.
- One-time localStorage → Firestore migration on first cloud sign-in.

**Increment 3 — PDF import**
- pdf.js text extraction + line/column heuristics → rows → existing normalizer.
- Manual column-mapping fallback UI when auto-detection is unsure (also benefits CSV).

**Increment 4 — Classification quality**
- Bulk re-categorize (select many → one category); merchant grouping.
- Regex rules UI; rule priority drag-order; import/export rules + mappings as JSON.
- Split transactions; transfers/EMI detection improvements.

**Increment 5 — Planning & insights**
- Recurring-transaction detection (rent, EMI, subscriptions) + upcoming view.
- Budget vs actual per month (not just yearly pace); rollover budgets.
- Savings-rate, cash-flow, and "unusual spend" callouts.

**Increment 6 — Data management & polish**
- CSV/Excel export of transactions & reports; print-friendly report.
- Edit/delete individual transactions; manage categories (add/rename/recolor).
- Multi-currency awareness (currently ₹-formatted).

---

## Architecture notes (how to extend)

- **State flow.** `data/state.js` holds the working set + a pub/sub. Mutating
  code saves via `store`, then calls `emitChange()`. `app.js` subscribes and
  re-renders the active view. Keep views pure-ish: read `state`, render, wire
  events that mutate + save + `emitChange()`.
- **Add a view.** Create `js/views/<name>-view.js` exporting `render(el)`, add it
  to `VIEWS` + a `<a data-view>` tab in `index.html`. It automatically gets the
  year selector (read `state.year`) and re-render-on-change.
- **Add a category.** Append to `DEFAULT_CATEGORIES` in `classify/categories.js`
  (unique `id`, `kind`, `color`) and add keywords in `classify/rules.js`.
- **Swap storage to Firestore.** Implement the `{ read, write }` contract in a
  new module and point `backend` in `data/store.js` at it when cloud is active.
  Callers don't change (all async already).
- **Amount convention.** Transactions store `amount >= 0` + `flow: 'in'|'out'`.
  "Spend" = out & non-transfer; "income" = in & non-transfer.
- **Conventions.** No build step; native ES modules; CDN globals (`window.Chart`,
  `window.XLSX`) guarded before use; dynamic text escaped via `escapeHtml`.

---

## Change log

### 2026-07-19 — Localization tweak (post-Increment 1, per user request)
- Currency switched to **USD** (`en-US`), centralized in `util.js`
  (`formatINR` → `formatMoney`; compact units now `$K` / `$M` / `$B`). Brand mark
  `₹` → `$`.
- Sample data + default keyword rules re-based to **US merchants** with realistic
  USD amounts. Fixed a substring collision — `"macy"` lives inside `"pharmacy"`,
  so CVS Pharmacy was matching the Macy's rule (now `"macys"` / `"lowes"`).
- **Year selector** now always spans the current year back to **2020**
  (`availableYears` in `state.js`), independent of imported data.
- Verified via Node pipeline test + headless-Chrome render. Committed + pushed to `main`.

### 2026-07-19 — Increment 1: foundation + vertical slice
- Scaffolded project (build-free ES modules, zero-dep dev server, Vercel config).
- Storage + auth abstractions (local-first, Firebase-ready).
- Classification engine: keyword rules + trainable mapping table + heuristics.
- Import pipeline: SheetJS CSV/Excel, column auto-detection, Google Sheets fetch,
  PDF stub, classified preview + commit with dedupe.
- Six views (Import, Visualise, Report, Classify, Plan, Track) + charts.
- Verified via Node pipeline tests + headless-Chrome full-boot render.
- Committed to `main` (91ca816) and **pushed to github.com/sirijallu/sirimalla-money-map**.
  Remaining to go live: connect Vercel (dashboard import, framework Other).
