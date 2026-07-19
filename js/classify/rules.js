// Default keyword rules (US merchants).
// -----------------------------------------------------------------------------
// Each rule maps a lowercase substring in a transaction description to a
// category. Users add / edit / delete their own rules in the Classify tab;
// user rules are merged AHEAD of these defaults (higher priority) at classify
// time. Group order below sets default priority — earlier = stronger — which
// resolves overlaps intentionally, e.g. "uber eats" → dining (listed before
// transport), "amazon prime" → subscriptions (before shopping's "amazon").
//
// Note: payment-rail tokens (zelle / venmo / ach) are NOT used as category
// signals except as low-priority transfers; and money-in with no match falls
// back to Income via a flow heuristic in classify.js.

const KEYWORDS = {
  rent:          ['rent', 'greystar', 'apartment', 'leasing', 'property mgmt', 'property management'],
  emi:           ['auto loan', 'car loan', 'student loan', 'mortgage', 'loan payment', 'loan', 'sofi', 'toyota financial'],
  insurance:     ['insurance', 'geico', 'progressive', 'state farm', 'allstate', 'premium', 'policy'],
  investments:   ['vanguard', 'fidelity', 'robinhood', 'schwab', 'coinbase', 'brokerage', 'betterment', '401k', 'wealthfront'],
  groceries:     ['whole foods', 'trader joe', 'safeway', 'kroger', 'costco', 'aldi', 'publix', 'sprouts', 'grocery', 'supermarket'],
  dining:        ['starbucks', 'chipotle', 'mcdonald', 'restaurant', 'cafe', 'doordash', 'uber eats', 'grubhub', 'dunkin', 'panera', 'chick-fil-a', 'taco bell', 'pizza', 'wendy'],
  transport:     ['uber', 'lyft', 'transit', 'parking', 'toll', 'bart', 'metro', 'caltrain'],
  fuel:          ['shell', 'chevron', 'exxon', 'arco', 'valero', 'gas station', 'gasoline', 'fuel'],
  subscriptions: ['netflix', 'spotify', 'hulu', 'disney+', 'hbo', 'youtube premium', 'apple.com/bill', 'icloud', 'amazon prime', 'audible', 'patreon', 'subscription'],
  utilities:     ['pg&e', 'electric', 'water bill', 'gas bill', 'comcast', 'xfinity', 'at&t', 'verizon', 't-mobile', 'internet', 'utility', 'waste management', 'sewer', 'duke energy'],
  // NB: substring matching — avoid keywords that hide inside other words, e.g.
  // 'macy' lives inside "pharmacy", so use "macys"; 'lowe' inside "flower", use "lowes".
  shopping:      ['amazon', 'target', 'walmart', 'best buy', 'home depot', 'lowes', 'ikea', 'apple store', 'macys', 'nike', 'etsy', 'ebay'],
  entertainment: ['amc', 'regal', 'cinemark', 'cinema', 'movie', 'steam games', 'playstation', 'xbox', 'ticketmaster'],
  health:        ['cvs pharmacy', 'walgreens', 'pharmacy', 'hospital', 'clinic', 'dental', 'urgent care', 'quest diagnostic', 'labcorp', 'rite aid', 'kaiser'],
  travel:        ['delta air', 'united airlines', 'american airlines', 'southwest air', 'marriott', 'hilton', 'airbnb', 'expedia', 'hotel', 'airlines', 'hertz'],
  education:     ['udemy', 'coursera', 'tuition', 'university', 'college', 'edx', 'chegg', 'pluralsight'],
  income:        ['payroll', 'direct deposit', 'salary', 'interest paid', 'dividend', 'tax refund', 'irs treas', 'cashback', 'reversal'],
  fees:          ['overdraft', 'service charge', 'atm fee', 'monthly fee', 'maintenance fee', 'late fee', 'finance charge', 'foreign transaction fee'],
  transfers:     ['zelle', 'venmo', 'cash app', 'wire transfer', 'transfer to', 'atm withdrawal', 'withdrawal'],
};

// Flattened into rule objects. Priority decreases with group order.
export const DEFAULT_RULES = Object.entries(KEYWORDS).flatMap(([category, patterns], gi) =>
  patterns.map((pattern, pi) => ({
    id: `default:${category}:${pi}`,
    pattern,
    match: 'contains',
    category,
    priority: 50 - gi,   // user rules use priority >= 100, so they always win
    source: 'default',
  })),
);
