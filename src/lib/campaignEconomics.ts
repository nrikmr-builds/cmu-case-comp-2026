// Promotion Builder math. Counts only what a campaign ADDS:
// - Acquisition: incremental openings = treated × (campaign rate − baseline rate). The baseline is business as
//   usual (already inside the pace projection), so only the uplift counts toward the openings gap. Bonuses are
//   still paid on every qualifying opening, including the ones that would have happened anyway.
// - Retention / closure prevention: avoided closures move net account change, timed by the signal's lead time.
// - Retention / activation: activated accounts move activation and primacy, not net account change.
// - Cross-sell: new savings accounts and deposits; moves neither the openings gap nor net account change.
import {
  activationFunnel,
  checkingTerms,
  currentQuarterHealth,
  dropOffSignals,
  feeCohorts,
  healthMixHistory,
  riskSegments,
  savingsLink,
} from '../data/checkingHealth'
import {
  campaignAssumptions,
  campaignPresets,
  type CampaignKind,
  type CampaignOutcome,
  type CampaignPreset,
  type OfferDefaults,
  type OpeningChannel,
  type OutreachChannel,
} from '../data/campaignPresets'
import { getOpportunity } from '../data/opportunities'
import { getKpi, reportingPeriod } from '../data/productMetrics'
import { segmentHistory } from '../data/segmentHistory'
import { formatLeadTime, getFeeCohortClosureRate, getHealthTotal, getNetAccountChange } from './checkingHealth'
import { getHeadlineProjection } from './dailyTracking'
import { getPaceProjection } from './projection'
import { guardrailAudience, type GuardrailAudience } from './guardrails'
import { getRateReference, type RateReference } from './segmentHistory'

/** Round to 0.1% so every rate shown can be used to redo the math by hand. */
const roundRate = (rate: number) => Math.round(rate * 1000) / 1000
const pctText = (rate: number) => `${(rate * 100).toFixed(1)}%`
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

/** Funnel primacy rate by opening channel: primary ÷ opened (digital 35.9%, branch 28.0%, blended 31.3%). */
export function primacyRateFor(channel: OpeningChannel): { rate: number; primary: number; opened: number } {
  const rows = channel === 'blended' ? activationFunnel : activationFunnel.filter((c) => c.channel === channel)
  const primary = rows.reduce((s, c) => s + c.primary, 0)
  const opened = rows.reduce((s, c) => s + c.opened, 0)
  return { rate: roundRate(primary / opened), primary, opened }
}

/** Funnel activation rate (activated ÷ opened), the proxy for meeting a debit-purchase-only requirement. */
export function activationRate(): { rate: number; activated: number; opened: number } {
  const activated = activationFunnel.reduce((s, c) => s + c.activated, 0)
  const opened = activationFunnel.reduce((s, c) => s + c.opened, 0)
  return { rate: roundRate(activated / opened), activated, opened }
}

/** Share of activated accounts that go on to become primary (primary ÷ activated): 2,380 ÷ 5,180 = 45.9%. */
export function primaryGivenActivated(): { rate: number; primary: number; activated: number } {
  const primary = activationFunnel.reduce((s, c) => s + c.primary, 0)
  const activated = activationFunnel.reduce((s, c) => s + c.activated, 0)
  return { rate: roundRate(primary / activated), primary, activated }
}

/** Fee-trigger closure gap (first-fee closures − no-fee closures), each rounded to 0.1%: 8.0% − 1.9% = 6.1%. */
export function feeClosureGap() {
  const fee = feeCohorts.find((c) => c.id === 'first-fee')
  const none = feeCohorts.find((c) => c.id === 'no-fee')
  const feeRate = roundRate(fee ? getFeeCohortClosureRate(fee) : 0)
  const noFeeRate = roundRate(none ? getFeeCohortClosureRate(none) : 0)
  return { feeRate, noFeeRate, gap: roundRate(feeRate - noFeeRate) }
}

export interface AudienceSource {
  label: string
  size: number
  /** Risk segments with customer rows: the audience is counted after the contact guardrails. */
  guardrails?: GuardrailAudience
  /** Last-quarter history, for acquisition segments that have it. */
  history?: RateReference
}

export function getAudienceSource(preset: CampaignPreset): AudienceSource {
  if (preset.source.type === 'segment') {
    const segment = getOpportunity('checking')?.segments.find((s) => s.id === preset.source.id)
    return {
      label: segment?.name ?? preset.source.id,
      size: segment?.eligibleCustomers ?? 0,
      history: getRateReference(segmentHistory[preset.source.id]),
    }
  }
  const risk = riskSegments.find((s) => s.id === preset.source.id)
  // Blanket campaigns follow the same guardrails as next best action: no hardship, complaint or recently contacted
  // customers. Where customer rows exist, the default audience is counted after them.
  const g = guardrailAudience(preset.source.id)
  if (g) return { label: `${risk?.name ?? preset.source.id} · after guardrails`, size: g.eligible, guardrails: g }
  return { label: risk?.name ?? preset.source.id, size: risk?.eligibleCustomers ?? 0 }
}

/** Everything the Product Owner can edit; saved as-is so Phase 4 can recompute results. */
export interface CampaignInputs {
  presetId: string
  name: string
  kind: CampaignKind
  outcome: CampaignOutcome
  sourceLabel: string
  audience: number
  holdoutShare: number
  /** Acquisition: what the holdout is expected to do (business as usual). 0 for other kinds. */
  baselineRate: number
  /** Acquisition: campaign conversion rate. Retention: save or activation rate. Cross-sell: take-up rate. */
  rate: number
  offer: OfferDefaults
  messagesPerPerson: number
  costPerMessage: Record<OutreachChannel, number>
  /** Annual value per primary (acquisition, activation) or saved (closure prevention) account. */
  annualValuePerAccount: number
  /** Cross-sell only. */
  avgBalanceUsd: number
  depositSpread: number
  /**
   * Next-best-action drafts: treated people per preferred channel (each reached once on their own channel).
   * Used only while it still adds up to the treated count; editing the audience falls back to the channel list.
   */
  channelMix?: Partial<Record<OutreachChannel, number>>
}

/** Channel cost, and how it was worked out: per-customer channels when a valid mix is attached, else the channel list. */
export function channelCost(inputs: CampaignInputs, treated: number): { cost: number; basis: string; mixed: boolean } {
  const mix = inputs.channelMix
  const mixTotal = mix ? Object.values(mix).reduce((s, n) => s + (n ?? 0), 0) : 0
  if (mix && mixTotal === treated) {
    const parts = (Object.entries(mix) as [OutreachChannel, number][]).filter(([, n]) => n > 0)
    return {
      cost: parts.reduce((s, [c, n]) => s + n * inputs.costPerMessage[c] * inputs.messagesPerPerson, 0),
      basis: parts.map(([c, n]) => `${n.toLocaleString('en-US')} ${c} × $${inputs.costPerMessage[c].toFixed(2)}`).join(' + ') + ' (each customer on their preferred channel)',
      mixed: true,
    }
  }
  const perPerson = inputs.offer.channels.reduce((s, c) => s + inputs.costPerMessage[c], 0) * inputs.messagesPerPerson
  return {
    cost: treated * perPerson,
    basis: `${treated.toLocaleString('en-US')} treated × $${perPerson.toFixed(2)} per person (${inputs.offer.channels.join(' + ') || 'none'} × ${inputs.messagesPerPerson})`,
    mixed: false,
  }
}

/** Cross-sell default balance: the existing "Avg. PNC savings" of checking customers who have PNC savings. */
export function defaultSavingsBalance(): number {
  return savingsLink.find((g) => g.id === 'has-pnc-savings')?.avgPncSavingsBalance ?? 0
}

export function rateBasis(preset: CampaignPreset): { baseline?: { rate: number; basis: string }; rate: number; basis: string } {
  if (preset.kind === 'acquisition') {
    const ref = getAudienceSource(preset).history
    const baseline = ref?.last.rate ?? 0
    const uplift = (preset.upliftPp ?? 0) / 100
    return {
      baseline: { rate: baseline, basis: ref ? `last-quarter rate (${ref.last.quarter})` : 'no history yet' },
      rate: roundRate(baseline + uplift),
      basis: `Baseline + ${(preset.upliftPp ?? 0).toFixed(1)} pp. Illustrative assumption; Phase 4's holdout will measure it`,
    }
  }
  if (preset.saveRateFrom === 'fee-trigger') {
    const g = feeClosureGap()
    return { rate: g.gap, basis: `Fee-trigger data: ${pctText(g.feeRate)} − ${pctText(g.noFeeRate)} closure gap` }
  }
  return { rate: campaignAssumptions.defaultSaveRate, basis: 'Illustrative assumption: no history yet' }
}

export function inputsFromPreset(presetId: string): CampaignInputs {
  const preset = campaignPresets.find((p) => p.id === presetId) ?? campaignPresets[0]
  const source = getAudienceSource(preset)
  const r = rateBasis(preset)
  return {
    presetId: preset.id,
    name: preset.name,
    kind: preset.kind,
    outcome: preset.outcome,
    sourceLabel: source.label,
    audience: source.size,
    holdoutShare: campaignAssumptions.holdoutShare,
    baselineRate: r.baseline?.rate ?? 0,
    rate: r.rate,
    offer: { ...preset.offer, channels: [...preset.offer.channels] },
    messagesPerPerson: 1,
    costPerMessage: { ...campaignAssumptions.costPerMessage },
    annualValuePerAccount: campaignAssumptions.annualValuePerPrimary,
    avgBalanceUsd: defaultSavingsBalance(),
    depositSpread: campaignAssumptions.depositSpread,
  }
}

export const OUTCOME_LABELS: Record<CampaignOutcome, { noun: string; title: string }> = {
  openings: { noun: 'new openings', title: 'New openings' },
  'closures-avoided': { noun: 'closures avoided', title: 'Closures avoided' },
  activations: { noun: 'accounts activated', title: 'Accounts activated' },
  'savings-accounts': { noun: 'new savings accounts', title: 'New PNC savings accounts' },
}

export interface CampaignEconomics {
  kind: CampaignKind
  outcome: CampaignOutcome
  treated: number
  holdout: number
  /** total = everything the treated group produces; incremental = what the campaign adds over the baseline. */
  results: { total: number; baseline: number; incremental: number }
  /** Acquisition: primary among openings. Activation: primary expected from activated accounts. */
  primary?: { rate: number; total: number; incremental: number; basis: string }
  /** Accounts that earn the bonus, and how that was estimated. */
  qualifying: number
  qualifyingBasis: string
  costs: { bonus: number; channel: number; feeWaiver: number; perAccount: number; total: number }
  costPerResult: number
  costPerIncremental: number
  costPerPrimary?: number
  /** The true price of the campaign's effect: total cost ÷ incremental primary accounts. */
  costPerIncrementalPrimary?: number
  /** What the annual value is counted on, e.g. "113 incremental primary × $250". */
  valueBasis: string
  valueUnits: number
  annualValue: number
  /** Months for value to repay cost. */
  paybackMonths: number
  /** Value per value-unit needed to repay the cost within a year (= cost ÷ value units). */
  breakEvenPerUnit: number
  timing: { q3Share: number; q3: number; later: number; basis: string; within90?: number }
  impact:
    | { kind: 'openings'; gap: number; gapBasis: string; gapAverage: number; closesShare: number }
    | { kind: 'net-change'; netNow: number; netQ3After: number; next90: number }
    | { kind: 'activation'; primaryQ3: number; openAccounts: number; primacyLiftPts: number }
    | { kind: 'cross-sell'; deposits: number; depositsQ3: number }
  rateWarning?: string
}

export function computeEconomics(inputs: CampaignInputs): CampaignEconomics {
  const { offer } = inputs
  const preset = campaignPresets.find((p) => p.id === inputs.presetId)
  const openingsKpi = getKpi('checking-new-accounts')
  const daysLeft = getPaceProjection(openingsKpi, reportingPeriod).daysRemaining
  const treated = Math.round(inputs.audience * (1 - inputs.holdoutShare))
  const holdout = inputs.audience - treated

  // Results, as whole accounts before any cost math so every line can be redone from the numbers shown.
  const isAcq = inputs.outcome === 'openings'
  const total = Math.round(treated * inputs.rate)
  const baseline = isAcq ? Math.round(treated * inputs.baselineRate) : 0
  const incremental = isAcq ? total - baseline : total

  let primary: CampaignEconomics['primary']
  if (isAcq) {
    const p = primacyRateFor(offer.openingChannel).rate
    primary = { rate: p, total: Math.round(total * p), incremental: Math.round(incremental * p), basis: `funnel primacy, ${offer.openingChannel}` }
  } else if (inputs.outcome === 'activations') {
    const p = primaryGivenActivated().rate
    primary = { rate: p, total: Math.round(total * p), incremental: Math.round(total * p), basis: 'activated → primary in the funnel' }
  }

  // The bonus goes to every qualifying account, including those that would have opened anyway.
  let qualifying = total
  let qualifyingBasis = isAcq ? 'All openings (no requirement)' : `All ${OUTCOME_LABELS[inputs.outcome].noun}`
  if (isAcq && primary && offer.directDepositUsd > 0) {
    qualifying = primary.total
    qualifyingBasis = `Primary accounts among ALL openings, as the proxy for meeting a direct-deposit requirement (${pctText(primary.rate)})`
  } else if (isAcq && offer.debitPurchases > 0) {
    const a = activationRate()
    qualifying = Math.round(total * a.rate)
    qualifyingBasis = `Activated accounts among ALL openings, as the proxy for meeting a debit-purchase requirement (${pctText(a.rate)})`
  }

  const costs = {
    bonus: offer.bonusUsd * qualifying,
    channel: channelCost(inputs, treated).cost,
    // Fee waiver goes to everyone treated; it's revenue given up, so it counts as cost.
    feeWaiver: inputs.kind === 'retention' && offer.waiveFirstFee ? treated * checkingTerms.monthlyMaintenanceFee : 0,
    perAccount: offer.perAccountCostUsd * total,
    total: 0,
  }
  costs.total = costs.bonus + costs.channel + costs.feeWaiver + costs.perAccount

  // Value counts only what the campaign adds.
  let valueUnits: number
  let valueBasis: string
  let annualValue: number
  if (inputs.outcome === 'savings-accounts') {
    valueUnits = total * inputs.avgBalanceUsd
    annualValue = valueUnits * inputs.depositSpread
    valueBasis = `$${Math.round(valueUnits).toLocaleString('en-US')} deposits × ${pctText(inputs.depositSpread)} spread`
  } else if (primary) {
    valueUnits = primary.incremental
    annualValue = valueUnits * inputs.annualValuePerAccount
    valueBasis = `${valueUnits.toLocaleString('en-US')} incremental primary × $${inputs.annualValuePerAccount}`
  } else {
    valueUnits = total
    annualValue = valueUnits * inputs.annualValuePerAccount
    valueBasis = `${valueUnits.toLocaleString('en-US')} ${OUTCOME_LABELS[inputs.outcome].noun} × $${inputs.annualValuePerAccount}`
  }

  // Timing. Closure prevention: a save counts in the quarter the closure WOULD have happened, spread evenly
  // across the signal's lead-time window. Everything else accrues evenly over the campaign's length.
  let timing: CampaignEconomics['timing']
  const signal = inputs.outcome === 'closures-avoided' ? dropOffSignals.find((s) => s.id === preset?.leadSignalId) : undefined
  if (signal) {
    const [a, b] = signal.leadDays
    const q3Share = clamp01((daysLeft - a) / (b - a))
    const within90 = clamp01((90 - a) / (b - a))
    const q3 = Math.round(total * q3Share)
    timing = {
      q3Share,
      q3,
      later: total - q3,
      within90: Math.round(total * within90),
      basis: `${signal.name} lead time ${formatLeadTime(signal.leadDays)}: Q3 share = clamp((${daysLeft.toFixed(1)} − ${a}) ÷ (${b} − ${a})) = ${pctText(q3Share)}`,
    }
  } else {
    const q3Share = offer.durationDays > 0 ? Math.min(offer.durationDays, daysLeft) / offer.durationDays : 0
    const counted = isAcq ? incremental : total
    const q3 = Math.round(counted * q3Share)
    timing = {
      q3Share,
      q3,
      later: counted - q3,
      basis: `${offer.durationDays}-day campaign, ${daysLeft.toFixed(1)} days left in Q3 → ${pctText(q3Share)} lands in Q3`,
    }
  }

  let impact: CampaignEconomics['impact']
  if (isAcq) {
    const { basis, projection, average } = getHeadlineProjection(openingsKpi)
    const gap = projection.incrementalNeeded
    impact = {
      kind: 'openings',
      gap,
      gapBasis: basis === 'last-7-day' ? 'beyond the last-7-day pace' : 'beyond the quarter-average pace',
      gapAverage: average.incrementalNeeded,
      closesShare: gap > 0 ? timing.q3 / gap : 0,
    }
  } else if (inputs.outcome === 'closures-avoided') {
    const netNow = getNetAccountChange(openingsKpi.actual, currentQuarterHealth.closedThisQuarter)
    impact = { kind: 'net-change', netNow, netQ3After: netNow + timing.q3, next90: timing.within90 ?? 0 }
  } else if (inputs.outcome === 'activations') {
    const openAccounts = getHealthTotal(healthMixHistory[healthMixHistory.length - 1])
    const primaryQ3 = Math.round(timing.q3 * (primary?.rate ?? 0))
    impact = { kind: 'activation', primaryQ3, openAccounts, primacyLiftPts: (primaryQ3 / openAccounts) * 100 }
  } else {
    impact = { kind: 'cross-sell', deposits: total * inputs.avgBalanceUsd, depositsQ3: timing.q3 * inputs.avgBalanceUsd }
  }

  let rateWarning: string | undefined
  const ref = preset ? getAudienceSource(preset).history : undefined
  const rangeText = ref ? `the last ${ref.quarters} quarters' range (${pctText(ref.min)}–${pctText(ref.max)})` : ''
  if (isAcq && ref && roundRate(inputs.rate) > ref.max) rateWarning = `Campaign rate is above ${rangeText}.`
  else if (isAcq && ref && roundRate(inputs.rate) < ref.min) rateWarning = `Campaign rate is below ${rangeText}.`
  if (isAcq && roundRate(inputs.rate) <= roundRate(inputs.baselineRate)) {
    rateWarning = 'No uplift: the campaign rate must be above the baseline rate to add openings.'
  }
  if (preset?.saveRateFrom === 'fee-trigger' && roundRate(inputs.rate) > feeClosureGap().gap) {
    rateWarning = `Above the ${pctText(feeClosureGap().gap)} extra closures the first fee causes: a waiver can't save more than that.`
  }

  const primaryIncr = primary?.incremental ?? 0
  return {
    kind: inputs.kind,
    outcome: inputs.outcome,
    treated,
    holdout,
    results: { total, baseline, incremental },
    primary,
    qualifying,
    qualifyingBasis,
    costs,
    costPerResult: total > 0 ? costs.total / total : 0,
    costPerIncremental: incremental > 0 ? costs.total / incremental : Infinity,
    costPerPrimary: primary && primary.total > 0 ? costs.total / primary.total : undefined,
    costPerIncrementalPrimary: primary ? (primaryIncr > 0 ? costs.total / primaryIncr : Infinity) : undefined,
    valueBasis,
    valueUnits,
    annualValue,
    paybackMonths: annualValue > 0 ? costs.total / (annualValue / 12) : Infinity,
    breakEvenPerUnit: valueUnits > 0 ? costs.total / valueUnits : 0,
    timing,
    impact,
    rateWarning,
  }
}

/** Fee forgiveness reference figures over the FULL audience (before holdout). */
export function feeForgivenessMaxima(audience: number) {
  const g = feeClosureGap()
  return {
    maxWaivedRevenue: audience * checkingTerms.monthlyMaintenanceFee,
    closuresAvoidedMax: audience * g.gap,
    ...g,
  }
}
