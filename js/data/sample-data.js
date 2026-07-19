// Deterministic sample statement data.
// -----------------------------------------------------------------------------
// "Load sample data" on the Import tab feeds these through the exact same
// normalize + auto-classify + commit pipeline as a real statement, so you can
// explore every tab (and the year selector) before importing anything.
//
// Records are in the same shape the importer produces after column detection:
//   { date, description, amount, flow: 'in' | 'out', account }
// Amounts are in ₹. Descriptions mimic real Indian bank / credit-card narrations
// so the default keyword rules have something realistic to classify.

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Recurring items — emitted once per month for every generated month.
const RECURRING = [
  { day: 1,  description: 'HDFC BANK SALARY CREDIT CVS HEALTH',   amount: 185000, flow: 'in',  account: 'HDFC Bank' },
  { day: 3,  description: 'NOBROKER RENT PAYMENT LANDLORD',       amount: 32000,  flow: 'out', account: 'HDFC Bank' },
  { day: 5,  description: 'HDFC HOME LOAN EMI 0423XXXX',          amount: 41500,  flow: 'out', account: 'HDFC Bank' },
  { day: 7,  description: 'NETFLIX.COM SUBSCRIPTION',             amount: 649,    flow: 'out', account: 'HDFC Credit Card' },
  { day: 7,  description: 'SPOTIFY INDIA',                        amount: 119,    flow: 'out', account: 'HDFC Credit Card' },
  { day: 10, description: 'BESCOM ELECTRICITY BILL BBPS',         amount: 2400,   flow: 'out', account: 'HDFC Bank' },
  { day: 12, description: 'ACT FIBERNET BROADBAND',               amount: 1180,   flow: 'out', account: 'HDFC Bank' },
  { day: 15, description: 'LIC OF INDIA INSURANCE PREMIUM',       amount: 6200,   flow: 'out', account: 'HDFC Bank' },
  { day: 20, description: 'ZERODHA MUTUAL FUND SIP',              amount: 15000,  flow: 'out', account: 'HDFC Bank' },
];

// Variable spends — a rotating subset is emitted each month for variety.
const VARIABLE = [
  { day: 2,  description: 'SWIGGY ORDER BANGALORE',            amount: 540,  flow: 'out', account: 'HDFC Credit Card' },
  { day: 4,  description: 'BIGBASKET.COM GROCERY',            amount: 3260, flow: 'out', account: 'HDFC Credit Card' },
  { day: 6,  description: 'UBER INDIA TRIP',                  amount: 285,  flow: 'out', account: 'HDFC Credit Card' },
  { day: 8,  description: 'INDIAN OIL PETROL PUMP',           amount: 2000, flow: 'out', account: 'HDFC Credit Card' },
  { day: 9,  description: 'AMAZON.IN ORDER',                  amount: 1899, flow: 'out', account: 'HDFC Credit Card' },
  { day: 11, description: 'ZOMATO ONLINE ORDER',             amount: 720,  flow: 'out', account: 'HDFC Credit Card' },
  { day: 13, description: 'DMART SUPERMARKET',                amount: 2450, flow: 'out', account: 'HDFC Bank' },
  { day: 14, description: 'APOLLO PHARMACY',                  amount: 860,  flow: 'out', account: 'HDFC Credit Card' },
  { day: 16, description: 'FLIPKART INTERNET ORDER',          amount: 3499, flow: 'out', account: 'HDFC Credit Card' },
  { day: 18, description: 'PVR CINEMAS BOOKMYSHOW',           amount: 900,  flow: 'out', account: 'HDFC Credit Card' },
  { day: 19, description: 'STARBUCKS COFFEE',                 amount: 430,  flow: 'out', account: 'HDFC Credit Card' },
  { day: 21, description: 'OLA CABS RIDE',                    amount: 340,  flow: 'out', account: 'HDFC Credit Card' },
  { day: 22, description: 'MAKEMYTRIP FLIGHT BOOKING',        amount: 8600, flow: 'out', account: 'HDFC Credit Card' },
  { day: 24, description: 'CROMA ELECTRONICS STORE',          amount: 5400, flow: 'out', account: 'HDFC Credit Card' },
  { day: 25, description: 'AIRTEL MOBILE RECHARGE',           amount: 399,  flow: 'out', account: 'HDFC Bank' },
  { day: 26, description: 'MYNTRA FASHION ORDER',             amount: 2299, flow: 'out', account: 'HDFC Credit Card' },
  { day: 27, description: 'AMAZON.IN REFUND ORDER',           amount: 1899, flow: 'in',  account: 'HDFC Credit Card' },
  { day: 28, description: 'UDEMY ONLINE COURSE',             amount: 649,  flow: 'out', account: 'HDFC Credit Card' },
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
