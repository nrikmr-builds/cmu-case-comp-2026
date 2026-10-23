// PLACEHOLDER DATA: synthetic checking activation, health, and drop-off figures.
// Openings tie to 'checking-new-accounts' and the latest health mix to 'checking-active-rate'
// in productMetrics.ts, so update them together.
import type { CustomerSegment } from '../types'

export type ChannelId = 'branch' | 'digital'

/** The one definition of a primary checking account, used by the funnel, health mix, and home page KPI. */
export const PRIMACY_DEFINITION = 'direct deposit + 2 bill payments'

/** New checking accounts opened this quarter, by how far they got. */
export interface ActivationFunnel {
  channel: ChannelId
  label: string
  opened: number
  /** First deposit made. */
  funded: number
  /** First debit card transaction within 30 days. */
  activated: number
  /** Primary (direct deposit + 2 bill payments) within 90 days. */
  primary: number
  /**
   * $500+ direct deposit within 60 days: the usual bonus requirement. Looser than primacy (no bill-payment
   * condition), so primary ≤ this ≤ funded.
   */
  metDirectDeposit: number
}

/** All open checking accounts at quarter end, by health tier. */
export interface HealthMix {
  quarter: string
  primary: number
  active: number
  slipping: number
  /** No customer-initiated transaction in 90+ days. */
  dormant: number
}

export interface DropOffSignal {
  id: string
  name: string
  measure: string
  flaggedAccounts: number
  /** Typical days between the signal firing and the account closing or going dormant: [earliest, latest]. */
  leadDays: [number, number]
  /** Churn rate of flagged accounts ÷ churn rate of unflagged accounts. */
  lift: number
}

/** Drop-off segments reuse the opportunity segment shape, minus the conversion assumption. */
export type RiskSegment = Omit<CustomerSegment, 'estimatedConversionRate'>

export interface FeeCohort {
  id: 'first-fee' | 'no-fee'
  label: string
  accounts: number
  closedWithin60Days: number
}

export interface SavingsLinkGroup {
  id: 'has-pnc-savings' | 'no-pnc-savings'
  label: string
  customers: number
  avgCheckingBalance: number
  avgPncSavingsBalance: number
  /** Customers with recurring transfers out to a savings account at another institution. */
  recurringExternalSavingsTransfers: number
}

/** PNC's own row in the competitor offer comparison. */
export interface PncComparisonRow {
  name: string
  bonusUsd?: number
  requirement: string
  monthlyFee: string
}

/** Illustrative product terms used by the signals, the fee view, and the offer comparison. */
export const checkingTerms = {
  monthlyMaintenanceFee: 12,
  minimumBalanceToWaive: 500,
}

export const pncComparisonRow: PncComparisonRow = {
  name: 'PNC (Illustrative)',
  bonusUsd: 200,
  requirement: '$500+ in qualifying direct deposits within 60 days',
  monthlyFee: `$${checkingTerms.monthlyMaintenanceFee}; waived with a $${checkingTerms.minimumBalanceToWaive} average balance or direct deposit`,
}

export const activationFunnel: ActivationFunnel[] = [
  { channel: 'branch', label: 'Branch', opened: 4400, funded: 3960, activated: 2820, primary: 1230, metDirectDeposit: 1650 },
  { channel: 'digital', label: 'Digital', opened: 3200, funded: 2690, activated: 2360, primary: 1150, metDirectDeposit: 1420 },
]

/**
 * Open accounts at the end of each quarter, oldest first (Q3 2026 = latest snapshot).
 * Q3 reconciles: Q2 end 427,200 + 7,600 opened − 9,800 closed = 425,000.
 */
export const healthMixHistory: HealthMix[] = [
  { quarter: 'Q4 2025', primary: 196000, active: 170000, slipping: 31000, dormant: 21000 },
  { quarter: 'Q1 2026', primary: 193000, active: 175000, slipping: 30500, dormant: 22500 },
  { quarter: 'Q2 2026', primary: 190500, active: 182700, slipping: 29000, dormant: 25000 },
  { quarter: 'Q3 2026', primary: 182750, active: 187000, slipping: 28050, dormant: 27200 },
]

export const currentQuarterHealth = {
  accountsWithDirectDeposit: 204000,
  closedThisQuarter: 9800,
  newlyDormantThisQuarter: 7400,
}

export const dropOffSignals: DropOffSignal[] = [
  {
    id: 'direct-deposit-leaving',
    name: 'Direct deposit leaving',
    measure: 'Direct deposit stopped, fell more than 30%, or is now split with another bank',
    flaggedAccounts: 6200,
    leadDays: [60, 90],
    lift: 4.2,
  },
  {
    id: 'outbound-competitor-transfers',
    name: 'Outbound transfers to competitors',
    measure: 'New or growing ACH / P2P transfers to known fintech and competitor banks',
    flaggedAccounts: 9800,
    leadDays: [30, 60],
    lift: 2.6,
  },
  {
    id: 'bill-pay-moved',
    name: 'Bill payments moved away',
    measure: 'Recurring bill payments stopped here and not replaced',
    flaggedAccounts: 4100,
    leadDays: [30, 60],
    lift: 3.4,
  },
  {
    id: 'activity-ratio',
    name: 'Activity ratio below 0.5',
    measure: 'Transactions in the last 30 days ÷ 6-month monthly average',
    flaggedAccounts: 11500,
    leadDays: [30, 45],
    lift: 2.9,
  },
  {
    id: 'balance-trend',
    name: 'Balance trending down',
    measure: '30-day average balance ÷ 6-month average, incl. accounts nearing the $500 fee threshold',
    flaggedAccounts: 14200,
    leadDays: [45, 75],
    lift: 1.8,
  },
  {
    id: 'fee-events',
    name: 'Fee events',
    measure: 'First $12 maintenance fee, an overdraft, or a fee-reversal request',
    flaggedAccounts: 7900,
    leadDays: [15, 60],
    lift: 2.2,
  },
  {
    id: 'digital-disengagement',
    name: 'Digital disengagement',
    measure: 'Monthly logins down more than 50%',
    flaggedAccounts: 12600,
    leadDays: [60, 120],
    lift: 1.6,
  },
  {
    id: 'service-friction',
    name: 'Service friction',
    measure: 'Complaint, dispute, or address change',
    flaggedAccounts: 3300,
    leadDays: [15, 45],
    lift: 2.4,
  },
]

export const riskSegments: RiskSegment[] = [
  {
    id: 'never-activated',
    name: 'Never activated (30–60 days old)',
    whyRelevant: 'Opened and funded, but no debit card use since; the window to build a habit is closing.',
    consideration: 'Some opened for a one-time need (e.g. a branch promotion) and never meant to use it daily.',
    eligibleCustomers: 1350,
  },
  {
    id: 'direct-deposit-leaving',
    name: 'Direct deposit leaving',
    whyRelevant: 'Paycheck stopped, shrank, or is now split with another bank: the strongest drop-off signal.',
    consideration: 'A job change or retirement can look the same as a switch to a competitor.',
    eligibleCustomers: 6200,
  },
  {
    id: 'approaching-fee-threshold',
    name: 'Approaching fee threshold',
    whyRelevant: 'Average balance trending toward the $500 waiver line, so a first $12 fee is likely.',
    consideration: 'Waiving fees protects retention but gives up fee revenue.',
    eligibleCustomers: 3600,
  },
  {
    id: 'savings-held-elsewhere',
    name: 'Savings held elsewhere',
    whyRelevant: 'Steady income but no PNC savings, and recurring transfers to savings at another institution.',
    consideration: 'Likely rate-driven; matching outside savings rates has a deposit-cost trade-off.',
    eligibleCustomers: 21000,
  },
]

export const feeCohorts: FeeCohort[] = [
  { id: 'first-fee', label: 'Charged first maintenance fee', accounts: 18400, closedWithin60Days: 1470 },
  { id: 'no-fee', label: 'No fee charged', accounts: 152000, closedWithin60Days: 2890 },
]

export const savingsLink: SavingsLinkGroup[] = [
  {
    id: 'has-pnc-savings',
    label: 'Has PNC savings',
    customers: 168000,
    avgCheckingBalance: 4100,
    avgPncSavingsBalance: 9800,
    recurringExternalSavingsTransfers: 7600,
  },
  {
    id: 'no-pnc-savings',
    label: 'No PNC savings',
    customers: 247000,
    avgCheckingBalance: 3200,
    avgPncSavingsBalance: 0,
    recurringExternalSavingsTransfers: 21000,
  },
]
