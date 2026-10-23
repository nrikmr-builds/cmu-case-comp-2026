// ILLUSTRATIVE · SYNTHETIC: one row per "Direct deposit leaving" checking customer, for the next-best-action table.
// Generated from a fixed seed, so every reload shows the same 6,200 rows. IDs only (CHK-00001…): no names and no
// real data. Only behavioural and product fields exist here; there are no age, gender, race or ethnicity, ZIP code
// or geography, or marital-status fields, so no rule can use them.
import type { OutreachChannel } from './campaignPresets'
import { dropOffSignals, riskSegments, savingsLink } from './checkingHealth'
import { reportingPeriod } from './productMetrics'

export type DdChange = 'stopped' | 'fell' | 'split'
export type TenureBand = 'Under 1 yr' | '1–3 yrs' | '3–10 yrs' | '10+ yrs'
export type BalanceBand = 'Under $500' | '$500–$999' | '$1,000–$4,999' | '$5,000+'

export const DD_CHANGE_LABEL: Record<DdChange, string> = { stopped: 'Stopped', fell: 'Fell >30%', split: 'Split with another bank' }
export const TENURE_BANDS: TenureBand[] = ['Under 1 yr', '1–3 yrs', '3–10 yrs', '10+ yrs']
export const BALANCE_BANDS: BalanceBand[] = ['Under $500', '$500–$999', '$1,000–$4,999', '$5,000+']
/** Balance bands at or within $500 of the $500 fee-waiver line. */
export const NEAR_FEE_THRESHOLD: BalanceBand[] = ['Under $500', '$500–$999']

export interface NbaCustomer {
  id: string
  /** How the direct deposit changed (every row has the Direct deposit leaving signal). */
  ddChange: DdChange
  /** Other early-warning signals on this customer (ids from the Early-Warning table). */
  coSignals: string[]
  /** Where outbound transfers go, when that signal is present. */
  outboundTo?: 'fintech' | 'competitor bank'
  tenure: TenureBand
  balance: BalanceBand
  channel: OutreachChannel
  hasPncSavings: boolean
  /** Recurring transfers to a savings account at another institution (only possible without PNC savings). */
  sendsToOutsideSavings: boolean
  /** Last marketing contact (ISO date), or null if never contacted. */
  lastContacted: string | null
  /** Financial-hardship flag: service outreach only, never an offer. */
  hardship: boolean
  /** Open complaint: service outreach only, never an offer. */
  complaint: boolean
}

/** The suppression test row: hardship = true, but it would otherwise match R2 (bundle). */
export const SUPPRESSION_TEST_ID = 'CHK-00421'

const SEED = 20260912
const segment = riskSegments.find((s) => s.id === 'direct-deposit-leaving')
export const NBA_ROW_COUNT = segment?.eligibleCustomers ?? 0

/** Share of checking customers with no PNC savings, from the Cross-Product table: 247,000 ÷ 415,000. */
const noSavings = savingsLink.find((g) => g.id === 'no-pnc-savings')
const hasSavings = savingsLink.find((g) => g.id === 'has-pnc-savings')
export const NO_SAVINGS_BASE = {
  noSavings: noSavings?.customers ?? 0,
  allCustomers: (noSavings?.customers ?? 0) + (hasSavings?.customers ?? 0),
  /** Recurring outside-savings transfers among no-savings customers: 21,000 ÷ 247,000. */
  outsideSavings: noSavings?.recurringExternalSavingsTransfers ?? 0,
}

/** Probability of each co-signal on a direct-deposit-leaving customer (illustrative; counts stay under the table's). */
const CO_SIGNAL_P: Record<string, number> = {
  'outbound-competitor-transfers': 0.4,
  'bill-pay-moved': 0.3,
  'activity-ratio': 0.35,
  'balance-trend': 0.45,
  'fee-events': 0.2,
  'digital-disengagement': 0.25,
  'service-friction': 0.08,
}

/** Small seeded PRNG (mulberry32): same seed, same sequence, every time. */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(r: number, items: T[], weights: number[]): T {
  let acc = 0
  for (let i = 0; i < items.length; i++) {
    acc += weights[i]
    if (r < acc) return items[i]
  }
  return items[items.length - 1]
}

const isoDaysBefore = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

function generate(): NbaCustomer[] {
  const rand = rng(SEED)
  const n = NBA_ROW_COUNT
  const testIndex = Number(SUPPRESSION_TEST_ID.slice(4)) - 1

  // Exactly round(n × 247,000 ÷ 415,000) customers without PNC savings, chosen by a seeded shuffle.
  const noSavingsCount = Math.round((n * NO_SAVINGS_BASE.noSavings) / NO_SAVINGS_BASE.allCustomers)
  const order = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  const withoutSavings = new Set(order.slice(0, noSavingsCount))
  if (!withoutSavings.has(testIndex)) {
    // Keep the count exact: swap the test row in for the last one chosen.
    withoutSavings.delete(order[noSavingsCount - 1])
    withoutSavings.add(testIndex)
  }

  const signalIds = dropOffSignals.map((s) => s.id).filter((id) => id !== 'direct-deposit-leaving')
  return Array.from({ length: n }, (_, i) => {
    const coSignals = signalIds.filter((id) => rand() < (CO_SIGNAL_P[id] ?? 0))
    const outbound = coSignals.includes('outbound-competitor-transfers')
    const hasPncSavings = !withoutSavings.has(i)
    const contactRoll = rand()
    const row: NbaCustomer = {
      id: `CHK-${String(i + 1).padStart(5, '0')}`,
      ddChange: pick(rand(), ['stopped', 'fell', 'split'] as DdChange[], [0.25, 0.45, 0.3]),
      coSignals,
      outboundTo: outbound ? (rand() < 0.55 ? 'fintech' : 'competitor bank') : undefined,
      tenure: pick(rand(), TENURE_BANDS, [0.2, 0.35, 0.3, 0.15]),
      balance: pick(rand(), BALANCE_BANDS, [0.18, 0.17, 0.35, 0.3]),
      channel: pick(rand(), ['app', 'email', 'sms', 'branch'] as OutreachChannel[], [0.45, 0.3, 0.1, 0.15]),
      hasPncSavings,
      // Flagged customers move savings out more often than the 8.5% base rate.
      sendsToOutsideSavings: !hasPncSavings && rand() < 0.2,
      lastContacted:
        contactRoll < 0.12
          ? isoDaysBefore(reportingPeriod.internalAsOf, 1 + Math.floor(rand() * 29))
          : contactRoll < 0.7
            ? isoDaysBefore(reportingPeriod.internalAsOf, 31 + Math.floor(rand() * 150))
            : null,
      hardship: rand() < 0.015,
      complaint: coSignals.includes('service-friction') && rand() < 0.3,
    }
    if (i === testIndex) {
      // Suppression test: hardship, no complaint, outbound transfers to a fintech, no PNC savings (would match R2).
      row.hardship = true
      row.complaint = false
      row.lastContacted = isoDaysBefore(reportingPeriod.internalAsOf, 60)
      if (!row.coSignals.includes('outbound-competitor-transfers')) row.coSignals = ['outbound-competitor-transfers', ...row.coSignals]
      row.outboundTo = 'fintech'
    }
    return row
  })
}

export const nbaCustomers: NbaCustomer[] = generate()
