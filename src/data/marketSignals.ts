// EXTERNAL DATA: real, sourced facts gathered by web research. Static so the app stays offline.
// Every item must keep a working sourceUrl and the date it was read. Only record facts found on that page.

export type SignalCategory = 'competitor-promo' | 'feature-trend' | 'market-context'

export interface MarketSignal {
  id: string
  category: SignalCategory
  /** e.g. "Chase.com", "Bankrate", "FDIC". */
  source: string
  /** The exact page the fact came from. */
  sourceUrl: string
  /** ISO date the page was read. */
  retrievedOn: string
  headline: string
  /** 1–2 sentences in our own words. */
  detail: string
  competitor?: string
  offer?: { bonusUsd?: number; requirement?: string; monthlyFee?: string; expires?: string }
  /** The internal signal or segment this helps explain; matches a name in checkingHealth.ts. */
  relevance: string
}

export const marketSignals: MarketSignal[] = [
  {
    id: 'chase-total-checking-400',
    category: 'competitor-promo',
    source: 'Bankrate',
    sourceUrl: 'https://www.bankrate.com/banking/best-bank-account-bonuses',
    retrievedOn: '2026-10-22',
    headline: 'Chase pays $400 for opening Total Checking with $1,000 in direct deposits',
    detail: 'New Chase Total Checking customers earn $400 after routing at least $1,000 of direct deposits into the account in the first 90 days. A paycheck-sized requirement makes this an easy target for customers already splitting deposits.',
    competitor: 'Chase',
    offer: {
      bonusUsd: 400,
      requirement: 'Qualifying direct deposits totaling at least $1,000 within the first 90 days',
      monthlyFee: '$15, waivable if a requirement is met',
      expires: '2027-01-27',
    },
    relevance: 'Direct deposit leaving',
  },
  {
    id: 'wells-fargo-everyday-325',
    category: 'competitor-promo',
    source: 'Bankrate',
    sourceUrl: 'https://www.bankrate.com/banking/best-bank-account-bonuses',
    retrievedOn: '2026-10-22',
    headline: 'Wells Fargo offers $325 on Everyday Checking for $1,000 in direct deposits',
    detail: 'Wells Fargo pays $325 to new Everyday Checking customers who receive at least $1,000 in qualifying direct deposits within 90 days. The $15 monthly fee can be avoided with a $1,500 daily balance or $500 in qualifying electronic deposits.',
    competitor: 'Wells Fargo',
    offer: {
      bonusUsd: 325,
      requirement: 'At least $1,000 in qualifying direct deposits within 90 days',
      monthlyFee: '$15; waived with $1,500 minimum daily balance or $500 in qualifying electronic deposits',
      expires: '2027-01-13',
    },
    relevance: 'Direct deposit leaving',
  },
  {
    id: 'truist-one-500',
    category: 'competitor-promo',
    source: 'Bankrate',
    sourceUrl: 'https://www.bankrate.com/banking/best-bank-account-bonuses',
    retrievedOn: '2026-10-22',
    headline: 'Truist offers $500 for direct deposits plus 20 debit purchases',
    detail: 'Truist One or Marquee Checking customers earn $500 after $2,000 in qualifying direct deposits and 20 debit purchases of $5+ within 120 days. The debit-usage requirement targets primary-account behavior, not just a deposit.',
    competitor: 'Truist',
    offer: {
      bonusUsd: 500,
      requirement: 'At least $2,000 in qualifying direct deposits and 20 debit card purchases of $5+ within 120 days',
      expires: '2027-02-02',
    },
    relevance: 'Direct deposit leaving',
  },
  {
    id: 'bank-of-america-tiered-500',
    category: 'competitor-promo',
    source: 'Bankrate',
    sourceUrl: 'https://www.bankrate.com/banking/best-bank-account-bonuses',
    retrievedOn: '2026-10-22',
    headline: 'Bank of America pays $100–$500 tiered by direct deposit amount',
    detail: 'Bank of America\'s bonus scales with deposit size: $100, $300 or $500 for $2,000, $5,000 or $10,000 in qualifying direct deposits within 90 days. Monthly fees across its checking tiers range from $4.95 to $25 and can be waived.',
    competitor: 'Bank of America',
    offer: {
      bonusUsd: 500,
      requirement: '$2,000 / $5,000 / $10,000 in qualifying direct deposits within 90 days for $100 / $300 / $500',
      monthlyFee: '$4.95 to $25 depending on account, waivable',
      expires: '2027-01-31',
    },
    relevance: 'Direct deposit leaving',
  },
  {
    id: 'us-bank-smartly-450',
    category: 'competitor-promo',
    source: 'Bankrate',
    sourceUrl: 'https://www.bankrate.com/banking/best-bank-account-bonuses',
    retrievedOn: '2026-10-22',
    headline: 'U.S. Bank Smartly Checking pays up to $450, offer ends Nov. 10',
    detail: 'U.S. Bank pays $250, $350 or $450 for $2,000, $5,000 or $8,000 in direct deposits (at least two deposits) within 90 days, plus online banking enrollment. Its $12 monthly fee can be waived, for example with a $1,500 balance.',
    competitor: 'U.S. Bank',
    offer: {
      bonusUsd: 450,
      requirement: 'At least two direct deposits totaling $2,000 / $5,000 / $8,000 within 90 days, plus online banking enrollment',
      monthlyFee: '$12, waivable (e.g., $1,500 balance)',
      expires: '2026-11-10',
    },
    relevance: 'Direct deposit leaving',
  },
  {
    id: 'capital-one-360-250',
    category: 'competitor-promo',
    source: 'Bankrate',
    sourceUrl: 'https://www.bankrate.com/banking/best-bank-account-bonuses',
    retrievedOn: '2026-10-22',
    headline: 'Capital One 360 Checking: ongoing $250 for two $500 direct deposits',
    detail: 'Capital One pays $250 to new 360 Checking customers who receive two eligible direct deposits of at least $500 in the first 75 days. Bankrate lists the offer as ongoing, with no end date.',
    competitor: 'Capital One',
    offer: {
      bonusUsd: 250,
      requirement: 'Two eligible direct deposits of at least $500 each within the first 75 days',
      expires: 'Ongoing (no end date listed)',
    },
    relevance: 'Direct deposit leaving',
  },
  {
    id: 'citi-regular-checking-new-money',
    category: 'competitor-promo',
    source: 'Bankrate',
    sourceUrl: 'https://www.bankrate.com/banking/best-bank-account-bonuses',
    retrievedOn: '2026-10-22',
    headline: 'Citi pays $500–$1,500 for moving large balances in, offer ends Oct. 26',
    detail: 'Citi\'s Regular Checking bonus is not tied to paychecks: customers must bring $30,000 (for $500) or $200,000 (for $1,500) in new money within 45 days and keep it for another 45 days. It targets affluent balances rather than direct deposit.',
    competitor: 'Citi',
    offer: {
      bonusUsd: 1500,
      requirement: '$30,000 (for $500) or $200,000 (for $1,500) in new funds within 45 days, held for 45 more days; no direct deposit needed',
      monthlyFee: '$15, waivable',
      expires: '2026-10-26',
    },
    relevance: 'Outbound transfers to competitors',
  },
  {
    id: 'sofi-dd-bonus-and-apy',
    category: 'competitor-promo',
    source: 'SoFi.com',
    sourceUrl: 'https://www.sofi.com/banking/',
    retrievedOn: '2026-10-22',
    headline: 'SoFi pays up to $400 for direct deposit and up to 4.40% APY with no monthly fee',
    detail: 'SoFi pays $50 for $1,000–$4,999.99 or $400 for $5,000+ in eligible direct deposits counted over 25 days after the first one, with no account fees. Members with direct deposit earn 3.30% APY on savings, and new members can get up to 4.40% for six months.',
    competitor: 'SoFi',
    offer: {
      bonusUsd: 400,
      requirement: '$5,000+ in eligible direct deposits within 25 days of the first deposit ($50 for $1,000–$4,999.99)',
      monthlyFee: 'No monthly fee',
      expires: '2027-12-31',
    },
    relevance: 'Savings held elsewhere',
  },
  {
    id: 'chime-early-pay-mypay',
    category: 'feature-trend',
    source: 'Chime.com',
    sourceUrl: 'https://www.chime.com/mypay/',
    retrievedOn: '2026-10-22',
    headline: 'Chime pairs 2-day-early paychecks with up to $750 in pay advances',
    detail: 'Chime makes direct deposits available up to two days early and offers MyPay, a fee-free advance on pay arriving within 24 hours, or instantly for $2 to $5. Eligibility requires a $200+ qualifying direct deposit, so the feature pulls paychecks to Chime.',
    competitor: 'Chime',
    relevance: 'Direct deposit leaving',
  },
  {
    id: 'capital-one-no-fee-no-overdraft',
    category: 'feature-trend',
    source: 'CapitalOne.com',
    sourceUrl: 'https://www.capitalone.com/bank/checking-accounts/online-checking-account/',
    retrievedOn: '2026-10-22',
    headline: 'Capital One 360 Checking: no monthly fees, no overdraft fees, early paycheck',
    detail: 'Capital One markets 360 Checking as having no monthly fees, no minimums and no overdraft fees, with paychecks up to two days early. A big-bank competitor now offers fee-free checking as standard.',
    competitor: 'Capital One',
    relevance: 'Fee events',
  },
  {
    id: 'ally-no-overdraft-buckets',
    category: 'feature-trend',
    source: 'Ally.com',
    sourceUrl: 'https://www.ally.com/bank/interest-checking-account/',
    retrievedOn: '2026-10-22',
    headline: 'Ally pairs no-fee checking with early deposit and savings \'buckets\'',
    detail: 'Ally\'s Spending Account has no monthly or overdraft fees, turns on early direct deposit automatically, and connects to a savings account with buckets and round-ups. Linking checking to savings tools keeps both balances at Ally.',
    competitor: 'Ally',
    relevance: 'Savings held elsewhere',
  },
  {
    id: 'varo-hysa-cashback',
    category: 'feature-trend',
    source: 'Varo',
    sourceUrl: 'https://www.varomoney.com/',
    retrievedOn: '2026-10-22',
    headline: 'Varo ties 3.75% savings APY to direct deposit and offers debit cash back',
    detail: 'Varo pays up to 3.75% APY on savings up to $5,000 when customers receive $800+ in monthly direct deposits, and offers cash back on select debit purchases activated in its app. It charges no overdraft fees and makes paychecks available up to two days early.',
    competitor: 'Varo',
    relevance: 'Savings held elsewhere',
  },
  {
    id: 'pinwheel-varo-switch-kit',
    category: 'feature-trend',
    source: 'Pinwheel',
    sourceUrl: 'https://www.pinwheelapi.com/resources/news/varo-account-activation-solution',
    retrievedOn: '2026-10-22',
    headline: 'Varo lets new customers move paycheck and bills in one in-app flow',
    detail: 'Varo uses Pinwheel\'s Switch Kit to let new customers move their direct deposit and recurring bills during account opening. In a three-month pilot, 40% of users who linked outside accounts switched at least one bill, typically two or more.',
    competitor: 'Varo',
    relevance: 'Bill payments moved away',
  },
  {
    id: 'visa-ai-financial-assistant',
    category: 'feature-trend',
    source: 'Visa',
    sourceUrl: 'https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.22576.html',
    retrievedOn: '2026-10-22',
    headline: 'Visa offers banks a plug-in AI assistant for in-app spending insights',
    detail: 'Visa launched an AI assistant banks can add to their apps to give proactive spending insights, answer questions about a customer\'s own activity, and lock cards or set alerts. The service was offered to U.S. banks for pilots starting August 2026.',
    relevance: 'Digital disengagement',
  },
  {
    id: 'fdic-national-rates-oct-2026',
    category: 'market-context',
    source: 'FDIC',
    sourceUrl: 'https://www.fdic.gov/national-rates-and-rate-caps',
    retrievedOn: '2026-10-22',
    headline: 'National average: 0.07% on interest checking, 0.38% on savings',
    detail: 'The FDIC\'s October 2026 figures put the national average at 0.07% for interest checking and 0.38% for savings, against a 4.63% rate cap for both. Digital savings offers near 3.3–4.4% are many times the national average.',
    relevance: 'Savings held elsewhere',
  },
  {
    id: 'fed-h8-deposits-oct-2026',
    category: 'market-context',
    source: 'Federal Reserve H.8',
    sourceUrl: 'https://www.federalreserve.gov/releases/h8/current/default.htm',
    retrievedOn: '2026-10-22',
    headline: 'Bank deposits grew 6.0% annualized in Q3 2026 to about $19.8 trillion',
    detail: 'Seasonally adjusted deposits at U.S. commercial banks reached about $19.77 trillion in the week ending October 7, 2026. Growth slowed from 9.1% annualized in Q2 to 6.0% in Q3, so deposits are still growing industry-wide and competition for them remains strong.',
    relevance: 'Balance trending down',
  },
  {
    id: 'nclc-overdraft-fees-rising',
    category: 'market-context',
    source: 'National Consumer Law Center',
    sourceUrl: 'https://www.nclc.org/wp-content/uploads/2026/06/2026.07_Issue-Brief_Overdraft-Fees-Rising-In-Absence-of-CFPB-Rule.pdf',
    retrievedOn: '2026-10-22',
    headline: 'CFPB overdraft rule repealed; PNC ranked 3rd in overdraft revenue',
    detail: 'Congress overturned the CFPB\'s 2024 rule capping most overdraft fees at $5 in 2025, so it never took effect. NCLC estimates consumers paid about $12.4 billion in overdraft and NSF fees in 2025 and lists PNC third among large banks at $279 million, up 8% from 2023.',
    competitor: 'PNC (benchmark)',
    relevance: 'Fee events',
  },
  {
    id: 'cfpb-1033-stayed',
    category: 'market-context',
    source: 'CFPB',
    sourceUrl: 'https://www.consumerfinance.gov/compliance/compliance-resources/other-applicable-requirements/personal-financial-data-rights/',
    retrievedOn: '2026-10-22',
    headline: 'Open-banking rule (Section 1033) compliance dates are stayed by a court',
    detail: 'A federal court stayed the compliance dates of the CFPB\'s Personal Financial Data Rights rule on October 29, 2025, and the CFPB is reconsidering the rule after an August 2025 advance notice. The final form and timing of mandated data sharing are still unsettled.',
    relevance: 'Outbound transfers to competitors',
  },
  {
    id: 'jdpower-2026-soft-switching',
    category: 'market-context',
    source: 'J.D. Power via Retail Banker International',
    sourceUrl: 'https://www.retailbankerinternational.com/news/warning-signs-flash-us-retail-bank-customer-satisfaction/',
    retrievedOn: '2026-10-22',
    headline: '20% of customers moved money away from their primary bank in three months',
    detail: 'J.D. Power\'s 2026 retail banking study found 20% of customers moved money from their primary bank in the past three months, up from 17%, and the average customer now holds deposit accounts at three institutions. It calls this gradual drift \'soft switching\'.',
    relevance: 'Outbound transfers to competitors',
  },
]

/** External facts the checking AI summary cites inline, phrased as a sentence fragment. */
export const summaryCitations: { signalId: string; text: string }[] = [
  {
    signalId: 'jdpower-2026-soft-switching',
    text: "J.D. Power's 2026 study found 20% of customers moved money away from their primary bank in three months",
  },
  {
    signalId: 'chime-early-pay-mypay',
    text: 'digital banks such as Chime release paychecks up to two days early and only for customers who route their direct deposit there',
  },
]
