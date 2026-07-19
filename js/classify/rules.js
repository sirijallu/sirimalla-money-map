// Default keyword rules.
// -----------------------------------------------------------------------------
// Each rule maps a lowercase substring in a transaction description to a
// category. Users add / edit / delete their own rules in the Classify tab;
// user rules are merged AHEAD of these defaults (higher priority) at classify
// time. Order of the groups below sets default priority — earlier = stronger.
//
// Note: payment-rail tokens (upi / imps / neft) are deliberately NOT used as
// category signals, because they appear in almost every description. Only
// unambiguous transfer phrases live under `transfers`, at the lowest priority.

const KEYWORDS = {
  rent:          ['nobroker', 'landlord', 'house rent', 'rent payment'],
  emi:           ['home loan', 'car loan', 'personal loan', 'loan emi', ' emi ', 'emi '],
  insurance:     ['insurance', 'lic of india', 'lic ', 'premium', 'policy', 'star health', 'hdfc life'],
  investments:   ['zerodha', 'groww', 'mutual fund', 'sip', 'nps ', 'kuvera', 'coin ', 'smallcase'],
  groceries:     ['bigbasket', 'dmart', 'd-mart', 'grocery', 'grofers', 'blinkit', 'zepto', 'reliance fresh', 'more supermarket', 'supermarket'],
  dining:        ['swiggy', 'zomato', 'starbucks', 'restaurant', 'cafe', 'dominos', 'mcdonald', 'kfc', 'eatfit', 'barbeque'],
  transport:     ['uber', 'ola ', 'ola cabs', 'rapido', 'metro', 'irctc', 'redbus', 'namma'],
  fuel:          ['petrol', 'fuel', 'indian oil', 'iocl', 'bharat petroleum', 'hp petrol', 'shell', 'diesel'],
  subscriptions: ['netflix', 'spotify', 'prime video', 'hotstar', 'youtube premium', 'icloud', 'google one', 'subscription'],
  utilities:     ['electricity', 'bescom', 'water bill', 'gas bill', 'broadband', 'fibernet', 'airtel', 'jio ', 'vodafone', 'recharge', 'bbps', 'bill payment', 'dth'],
  shopping:      ['amazon', 'flipkart', 'myntra', 'croma', 'ajio', 'nykaa', 'reliance digital', 'lifestyle', 'ikea', 'decathlon'],
  entertainment: ['pvr', 'inox', 'cinema', 'bookmyshow', 'playstation', 'steam games'],
  health:        ['pharmacy', 'apollo', 'hospital', 'clinic', 'medplus', 'practo', 'diagnostic', 'pharmeasy'],
  travel:        ['makemytrip', 'goibibo', 'indigo', 'air india', 'vistara', 'flight', 'hotel', 'oyo', 'airbnb', 'cleartrip'],
  education:     ['udemy', 'coursera', 'tuition', 'school fee', 'college', 'byju', 'upgrad'],
  income:        ['salary', 'interest credit', 'cashback', 'reversal', 'dividend'],
  fees:          ['annual fee', 'late fee', 'penalty', 'service charge', 'gst', 'finance charge', 'convenience fee'],
  transfers:     ['atm withdrawal', 'self transfer', 'to savings', 'fund transfer to'],
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
