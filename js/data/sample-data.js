// Deterministic sample statement data.
// -----------------------------------------------------------------------------
// "Load sample data" on the Import tab feeds these through the exact same
// normalize + auto-classify + commit pipeline as a real statement, so you can
// explore every tab (and the year selector) before importing anything.
//
// Records are in the same shape the importer produces after column detection:
//   { date, description, amount, flow: 'in' | 'out', account }
// Amounts are in USD. Descriptions mimic real US bank / credit-card narrations
// so the default keyword rules have something realistic to classify.

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Recurring items — emitted once per month for every generated month.
const RECURRING = [
  { day: 1,  description: 'DIRECT DEPOSIT PAYROLL',            amount: 6500,   flow: 'in',  account: 'Chase Checking' },
  { day: 3,  description: 'GREYSTAR APARTMENTS RENT',          amount: 1850,   flow: 'out', account: 'Chase Checking' },
  { day: 5,  description: 'TOYOTA FINANCIAL SVCS AUTO LOAN',   amount: 465,    flow: 'out', account: 'Chase Checking' },
  { day: 6,  description: 'SOFI STUDENT LOAN PAYMENT',         amount: 320,    flow: 'out', account: 'Chase Checking' },
  { day: 7,  description: 'NETFLIX.COM',                       amount: 15.49,  flow: 'out', account: 'Chase Credit Card' },
  { day: 7,  description: 'SPOTIFY USA',                       amount: 11.99,  flow: 'out', account: 'Chase Credit Card' },
  { day: 8,  description: 'T-MOBILE WIRELESS',                 amount: 85,     flow: 'out', account: 'Chase Checking' },
  { day: 10, description: 'PG&E ELECTRIC UTILITY',            amount: 120,    flow: 'out', account: 'Chase Checking' },
  { day: 12, description: 'COMCAST XFINITY INTERNET',          amount: 79.99,  flow: 'out', account: 'Chase Checking' },
  { day: 15, description: 'GEICO AUTO INSURANCE',             amount: 142,    flow: 'out', account: 'Chase Checking' },
  { day: 20, description: 'VANGUARD BROKERAGE INVESTMENT',     amount: 800,    flow: 'out', account: 'Chase Checking' },
];

// Variable spends — a rotating subset is emitted each month for variety.
const VARIABLE = [
  { day: 2,  description: 'STARBUCKS STORE 1123',          amount: 6.75,   flow: 'out', account: 'Chase Credit Card' },
  { day: 4,  description: 'WHOLE FOODS MARKET',            amount: 96.30,  flow: 'out', account: 'Chase Credit Card' },
  { day: 6,  description: 'UBER TRIP HELP.UBER.COM',       amount: 18.50,  flow: 'out', account: 'Chase Credit Card' },
  { day: 8,  description: 'SHELL OIL 574823',              amount: 48.00,  flow: 'out', account: 'Chase Credit Card' },
  { day: 9,  description: 'AMAZON.COM ORDER',              amount: 34.99,  flow: 'out', account: 'Chase Credit Card' },
  { day: 11, description: 'CHIPOTLE MEXICAN GRILL',        amount: 12.40,  flow: 'out', account: 'Chase Credit Card' },
  { day: 13, description: 'TRADER JOES 445',               amount: 62.15,  flow: 'out', account: 'Chase Checking' },
  { day: 14, description: 'CVS PHARMACY 08123',            amount: 24.60,  flow: 'out', account: 'Chase Credit Card' },
  { day: 16, description: 'TARGET T-1857',                 amount: 64.20,  flow: 'out', account: 'Chase Credit Card' },
  { day: 17, description: 'COSTCO WHOLESALE',              amount: 210.00, flow: 'out', account: 'Chase Credit Card' },
  { day: 18, description: 'AMC THEATRES ONLINE',           amount: 33.00,  flow: 'out', account: 'Chase Credit Card' },
  { day: 19, description: 'CHEVRON GAS STATION',           amount: 52.30,  flow: 'out', account: 'Chase Credit Card' },
  { day: 21, description: 'LYFT RIDE',                     amount: 22.10,  flow: 'out', account: 'Chase Credit Card' },
  { day: 22, description: 'DELTA AIR LINES',               amount: 340.00, flow: 'out', account: 'Chase Credit Card' },
  { day: 24, description: 'BEST BUY 00014',                amount: 129.99, flow: 'out', account: 'Chase Credit Card' },
  { day: 25, description: 'HOME DEPOT 6172',               amount: 88.75,  flow: 'out', account: 'Chase Credit Card' },
  { day: 26, description: 'WALGREENS STORE 4471',          amount: 18.40,  flow: 'out', account: 'Chase Credit Card' },
  { day: 27, description: 'AMAZON.COM REFUND',             amount: 34.99,  flow: 'in',  account: 'Chase Credit Card' },
  { day: 28, description: 'UDEMY ONLINE COURSE',           amount: 19.99,  flow: 'out', account: 'Chase Credit Card' },
];

/**
 * Build sample records for the given months.
 * Defaults to all of last year plus this year up to the current month.
 */
export function generateSampleRecords() {
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  const plan = [
    { year: thisYear - 1, months: 12 },
    { year: thisYear, months: thisMonth },
  ];

  const out = [];
  for (const { year, months } of plan) {
    for (let m = 1; m <= months; m++) {
      for (const r of RECURRING) {
        out.push({ ...r, date: iso(year, m, r.day) });
      }
      // Rotate which variable spends appear so months differ.
      VARIABLE.forEach((v, i) => {
        if ((i + m) % 3 === 0) {
          const day = Math.min(28, v.day);
          out.push({ ...v, date: iso(year, m, day) });
        }
      });
    }
  }
  return out;
}
