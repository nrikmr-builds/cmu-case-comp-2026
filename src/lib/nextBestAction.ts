// Personalised next best action for the Direct deposit leaving customers. Transparent, ordered rules (first match
// wins), reason codes for every rule that applies, and per-customer economics taken from the builder templates, so
// the rows of an action group add up to the economics of the Draft that "Send to campaign" creates.
import { campaignAssumptions, campaignPresets, type OutreachChannel } from '../data/campaignPresets'
import { checkingTerms, dropOffSignals } from '../data/checkingHealth'
import { NEAR_FEE_THRESHOLD, nbaCustomers, type NbaCustomer } from '../data/nbaCustomers'
import { reportingPeriod } from '../data/productMetrics'
import { computeEconomics, inputsFromPreset, type CampaignEconomics, type CampaignInputs } from './campaignEconomics'

export type NbaAction = 'service' | 'wait' | 'bundle' | 'fee' | 'dd' | 'none'
export type OfferAction = Extract<NbaAction, 'bundle' | 'fee' | 'dd'>
export type RuleCode = 'R0' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5'

export const OFFER_ACTIONS: OfferAction[] = ['bundle', 'fee', 'dd']
export const ACTION_ORDER: NbaAction[] = ['service', 'wait', 'bundle', 'fee', 'dd', 'none']

export const ACTION_META: Record<NbaAction, { label: string; short: string; presetId?: string }> = {
  service: { label: 'Service outreach (no offer)', short: 'Service outreach' },
  wait: { label: 'Wait (contact cap)', short: 'Wait' },
  bundle: { label: 'Checking + Savings Bundle', short: 'Savings Bundle', presetId: 'savings-bundle' },
  fee: { label: 'First-Fee Forgiveness', short: 'Fee Forgiveness', presetId: 'first-fee-forgiveness' },
  dd: { label: 'Direct Deposit Retention', short: 'DD Retention', presetId: 'direct-deposit-retention' },
  none: { label: 'Do nothing', short: 'Do nothing' },
}

/** Contact frequency cap: at most one offer per this many days. */
export const CONTACT_CAP_DAYS = 30
const AS_OF = reportingPeriod.internalAsOf

const signalName = (id: string) => dropOffSignals.find((s) => s.id === id)?.name ?? id

export interface NbaRule {
  code: RuleCode
  condition: string
  action: string
  reason: string
  test?: (c: NbaCustomer) => boolean
}

const daysBetween = (fromIso: string, toIso: string) =>
  Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000)

/** Ordered rules: the first one that matches decides; R5 then checks the chosen offer pays for itself. */
export const NBA_RULES: NbaRule[] = [
  {
    code: 'R0',
    condition: 'Hardship flag, or an open complaint',
    action: ACTION_META.service.label,
    reason: 'Help first; never market to them.',
    test: (c) => c.hardship || c.complaint,
  },
  {
    code: 'R1',
    condition: `Contacted within the last ${CONTACT_CAP_DAYS} days`,
    action: 'Wait until the next eligible date',
    reason: `Frequency cap: at most 1 offer per ${CONTACT_CAP_DAYS} days.`,
    test: (c) => c.lastContacted !== null && daysBetween(c.lastContacted, AS_OF) < CONTACT_CAP_DAYS,
  },
  {
    code: 'R2',
    condition: `${signalName('outbound-competitor-transfers')} (fintech or competitor bank) + no PNC savings`,
    action: ACTION_META.bundle.label,
    reason: 'Money is leaving and they hold no PNC savings: give it a home here (cross-sell).',
    test: (c) => c.coSignals.includes('outbound-competitor-transfers') && !c.hasPncSavings,
  },
  {
    code: 'R3',
    condition: `${signalName('fee-events')}, or balance near the $500 fee-waiver line (under $1,000)`,
    action: ACTION_META.fee.label,
    reason: 'A first fee triggers closures; the waiver costs less than the account is worth.',
    test: (c) => c.coSignals.includes('fee-events') || NEAR_FEE_THRESHOLD.includes(c.balance),
  },
  {
    code: 'R4',
    condition: 'Direct deposit fell >30% (including stopped) or is split',
    action: ACTION_META.dd.label,
    reason: 'Strongest drop-off signal (4.2× lift): reward keeping the paycheck here.',
    test: () => true,
  },
  {
    code: 'R5',
    condition: 'Expected annual value of the chosen offer is below its expected cost',
    action: ACTION_META.none.label,
    reason: "Don't spend more than the save is worth (both numbers shown).",
  },
]

/** Per-customer economics of an offer, from the same template inputs the builder uses. */
export interface OfferUnitEconomics {
  inputs: CampaignInputs
  /** Save rate (retention) or take-up rate (cross-sell). */
  rate: number
  /** Annual value of one saved account ($250) or one new savings account (balance × spread). */
  valuePerResult: number
  /** Fee waived for everyone treated (fee forgiveness only). */
  waiverPerPerson: number
  /** Bonus + other per-account cost, paid on each result. */
  costPerResult: number
}

export function offerUnit(action: OfferAction): OfferUnitEconomics {
  const inputs = inputsFromPreset(ACTION_META[action].presetId ?? '')
  const valuePerResult = inputs.outcome === 'savings-accounts' ? inputs.avgBalanceUsd * inputs.depositSpread : inputs.annualValuePerAccount
  return {
    inputs,
    rate: inputs.rate,
    valuePerResult,
    waiverPerPerson: inputs.kind === 'retention' && inputs.offer.waiveFirstFee ? checkingTerms.monthlyMaintenanceFee : 0,
    costPerResult: inputs.offer.bonusUsd + inputs.offer.perAccountCostUsd,
  }
}

export interface RowEconomics {
  action: OfferAction
  channelCost: number
  /** rate × value per result. */
  expectedValue: number
  /** channel + fee waiver + rate × (bonus + per-account cost). */
  expectedCost: number
}

export function rowEconomics(action: OfferAction, channel: OutreachChannel): RowEconomics {
  const u = offerUnit(action)
  const channelCost = u.inputs.costPerMessage[channel] * u.inputs.messagesPerPerson
  return {
    action,
    channelCost,
    expectedValue: u.rate * u.valuePerResult,
    expectedCost: channelCost + u.waiverPerPerson + u.rate * u.costPerResult,
  }
}

export interface NbaRecommendation {
  customer: NbaCustomer
  action: NbaAction
  /** The rule that decided the action. */
  matched: RuleCode
  /** Every rule whose condition applies to this customer. */
  codes: RuleCode[]
  /** The offer the rules picked (also kept when R5 turns it into "Do nothing"). */
  offer?: RowEconomics
  /** R1: first date another offer may be sent. */
  nextEligible?: string
  /** Offer groups keep a 10% holdout as the control, exactly as the Draft does. */
  holdout: boolean
}

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function recommend(c: NbaCustomer): NbaRecommendation {
  const codes = NBA_RULES.filter((r) => r.test?.(c)).map((r) => r.code)
  const first = NBA_RULES.find((r) => r.test?.(c))
  const matched = first?.code ?? 'R4'
  if (matched === 'R0') return { customer: c, action: 'service', matched, codes, holdout: false }
  if (matched === 'R1')
    return { customer: c, action: 'wait', matched, codes, nextEligible: addDays(c.lastContacted ?? AS_OF, CONTACT_CAP_DAYS), holdout: false }
  const action: OfferAction = matched === 'R2' ? 'bundle' : matched === 'R3' ? 'fee' : 'dd'
  const offer = rowEconomics(action, c.channel)
  if (offer.expectedValue < offer.expectedCost) return { customer: c, action: 'none', matched: 'R5', codes: [...codes, 'R5'], offer, holdout: false }
  return { customer: c, action, matched, codes, offer, holdout: false }
}

/** Deterministic order for picking holdout rows (FNV-1a of the ID). */
function idHash(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193) >>> 0
  return h
}

function build(): NbaRecommendation[] {
  const recs = nbaCustomers.map(recommend)
  // Holdout per offer group: audience − round(audience × 90%), the same split the Draft's economics use.
  for (const action of OFFER_ACTIONS) {
    const group = recs.filter((r) => r.action === action)
    const treated = Math.round(group.length * (1 - campaignAssumptions.holdoutShare))
    const byHash = [...group].sort((a, b) => idHash(a.customer.id) - idHash(b.customer.id))
    byHash.slice(treated).forEach((r) => (r.holdout = true))
  }
  return recs
}

export const nbaRecommendations: NbaRecommendation[] = build()

// --- Roll-up and the Draft each action group becomes ------------------------------------------------------

export const NBA_SOURCE_LABEL = 'Next best action · Direct deposit leaving'

/** Draft inputs for one action group: the template, with the group as audience and each customer on their channel. */
export function draftInputs(action: OfferAction, recs = nbaRecommendations): CampaignInputs {
  const group = recs.filter((r) => r.action === action)
  const treatedRows = group.filter((r) => !r.holdout)
  const base = inputsFromPreset(ACTION_META[action].presetId ?? '')
  const mix: Partial<Record<OutreachChannel, number>> = {}
  for (const r of treatedRows) mix[r.customer.channel] = (mix[r.customer.channel] ?? 0) + 1
  const channels = (['app', 'email', 'sms', 'branch'] as OutreachChannel[]).filter((c) => (mix[c] ?? 0) > 0)
  const rule = NBA_RULES.find((x) => x.action === ACTION_META[action].label)?.code
  return {
    ...base,
    name: `${base.name} · next best action`,
    sourceLabel: NBA_SOURCE_LABEL,
    audience: group.length,
    holdoutShare: campaignAssumptions.holdoutShare,
    offer: { ...base.offer, channels, extra: `From next best action (rule ${rule}): ${base.offer.extra}` },
    channelMix: mix,
  }
}

export interface GroupCheckLine {
  label: string
  rows: number
  draft: number
  format: 'count' | 'usd'
  basis: string
}

export interface ActionGroup {
  action: OfferAction
  rows: number
  treated: number
  holdout: number
  inputs: CampaignInputs
  economics: CampaignEconomics
  /** Σ over the group's treated rows, worked out per customer. */
  rowSums: { expectedResults: number; channel: number; waiver: number }
  check: GroupCheckLine[]
  equal: boolean
}

export function actionGroup(action: OfferAction, recs = nbaRecommendations): ActionGroup {
  const group = recs.filter((r) => r.action === action)
  const treatedRows = group.filter((r) => !r.holdout)
  const u = offerUnit(action)
  const inputs = draftInputs(action, recs)
  const e = computeEconomics(inputs)
  const rowSums = {
    expectedResults: treatedRows.length * u.rate,
    channel: treatedRows.reduce((s, r) => s + (r.offer?.channelCost ?? 0), 0),
    waiver: treatedRows.length * u.waiverPerPerson,
  }
  // The Draft counts whole accounts, so results are rounded once; money lines follow from that count.
  const results = Math.round(rowSums.expectedResults)
  const check: GroupCheckLine[] = [
    { label: 'Audience', rows: group.length, draft: inputs.audience, format: 'count', basis: 'rows with this action' },
    { label: 'Treated (90%)', rows: treatedRows.length, draft: e.treated, format: 'count', basis: 'rows not in the holdout' },
    {
      label: 'Expected results',
      rows: results,
      draft: e.results.total,
      format: 'count',
      basis: `Σ ${treatedRows.length} × ${(u.rate * 100).toFixed(1)}% = ${rowSums.expectedResults.toFixed(1)}, rounded`,
    },
    { label: 'Channel cost', rows: rowSums.channel, draft: e.costs.channel, format: 'usd', basis: 'Σ each customer’s preferred channel' },
    { label: 'Fees waived', rows: rowSums.waiver, draft: e.costs.feeWaiver, format: 'usd', basis: `treated × $${u.waiverPerPerson}` },
    { label: 'Bonus + per-account cost', rows: results * u.costPerResult, draft: e.costs.bonus + e.costs.perAccount, format: 'usd', basis: `results × $${u.costPerResult}` },
    { label: 'Annual value', rows: results * u.valuePerResult, draft: e.annualValue, format: 'usd', basis: `results × $${u.valuePerResult.toFixed(2)}` },
  ]
  return {
    action,
    rows: group.length,
    treated: treatedRows.length,
    holdout: group.length - treatedRows.length,
    inputs,
    economics: e,
    rowSums,
    check,
    equal: check.every((l) => Math.abs(l.rows - l.draft) < 0.005),
  }
}

export function nbaRollup(recs = nbaRecommendations) {
  const counts = Object.fromEntries(ACTION_ORDER.map((a) => [a, recs.filter((r) => r.action === a).length])) as Record<NbaAction, number>
  const groups = OFFER_ACTIONS.map((a) => actionGroup(a, recs))
  return {
    counts,
    total: recs.length,
    groups,
    cost: groups.reduce((s, g) => s + g.economics.costs.total, 0),
    value: groups.reduce((s, g) => s + g.economics.annualValue, 0),
  }
}

// --- Reconciliation with the page's tables ----------------------------------------------------------------

export function nbaReconciliation(recs = nbaRecommendations) {
  const rows = recs.map((r) => r.customer)
  const signalCounts = dropOffSignals.map((s) => ({
    id: s.id,
    name: s.name,
    rows: s.id === 'direct-deposit-leaving' ? rows.length : rows.filter((c) => c.coSignals.includes(s.id)).length,
    table: s.flaggedAccounts,
  }))
  const noSavings = rows.filter((c) => !c.hasPncSavings)
  return {
    rows: rows.length,
    signalCounts,
    noSavings: noSavings.length,
    outsideSavings: noSavings.filter((c) => c.sendsToOutsideSavings).length,
    hardship: rows.filter((c) => c.hardship).length,
    complaint: rows.filter((c) => c.complaint).length,
    serviceFriction: signalCounts.find((s) => s.id === 'service-friction')?.table ?? 0,
    contactedRecently: recs.filter((r) => r.codes.includes('R1')).length,
  }
}

/** Every rule code a customer could carry, for the filter. */
export const RULE_CODES: RuleCode[] = NBA_RULES.map((r) => r.code)
export const presetName = (action: OfferAction) => campaignPresets.find((p) => p.id === ACTION_META[action].presetId)?.name ?? action
