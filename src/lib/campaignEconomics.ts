// Promotion Builder math. Acquisition and retention never mix: acquisition produces new openings (toward the
// incremental openings gap); retention produces saved accounts (toward net account change and primacy).
import { activationFunnel, checkingTerms, currentQuarterHealth, feeCohorts, healthMixHistory, riskSegments } from '../data/checkingHealth'
import {
  campaignAssumptions,
  campaignPresets,
  type CampaignKind,
  type CampaignPreset,
  type OfferDefaults,
  type OpeningChannel,
  type OutreachChannel,
} from '../data/campaignPresets'
import { getOpportunity } from '../data/opportunities'
import { getKpi, reportingPeriod } from '../data/productMetrics'
import { segmentHistory } from '../data/segmentHistory'
import { getFeeCohortClosureRate, getHealthTotal, getNetAccountChange } from './checkingHealth'
import { getPaceProjection } from './projection'
import { getRateReference, type RateReference } from './segmentHistory'

/** Round to 0.1% so every rate shown can be used to redo the math by hand. */
const roundRate = (rate: number) => Math.round(rate * 1000) / 1000

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
  return { label: risk?.name ?? preset.source.id, size: risk?.eligibleCustomers ?? 0 }
}

/** Everything the Product Owner can edit; saved as-is so Phase 4 can recompute results. */
export interface CampaignInputs {
  presetId: string
  name: string
  kind: CampaignKind
  sourceLabel: string
  audience: number
  holdoutShare: number
  /** Acquisition: conversion rate. Retention: save rate. */
  rate: number
  offer: OfferDefaults
  messagesPerPerson: number
  costPerMessage: Record<OutreachChannel, number>
  annualValuePerAccount: number
}

export function defaultRate(preset: CampaignPreset): { rate: number; basis: string } {
  if (preset.kind === 'acquisition') {
    const ref = getAudienceSource(preset).history
    return ref
      ? { rate: ref.last.rate, basis: `Last-quarter rate (${ref.last.quarter})` }
      : { rate: campaignAssumptions.defaultSaveRate, basis: 'Illustrative assumption: no history yet' }
  }
  if (preset.saveRateFrom === 'fee-trigger') {
    const g = feeClosureGap()
    return { rate: g.gap, basis: `Fee-trigger data: ${(g.feeRate * 100).toFixed(1)}% − ${(g.noFeeRate * 100).toFixed(1)}% closure gap` }
  }
  return { rate: campaignAssumptions.defaultSaveRate, basis: 'Illustrative assumption: no history yet' }
}

export function inputsFromPreset(presetId: string): CampaignInputs {
  const preset = campaignPresets.find((p) => p.id === presetId) ?? campaignPresets[0]
  const source = getAudienceSource(preset)
  return {
    presetId: preset.id,
    name: preset.name,
    kind: preset.kind,
    sourceLabel: source.label,
    audience: source.size,
    holdoutShare: campaignAssumptions.holdoutShare,
    rate: defaultRate(preset).rate,
    offer: { ...preset.offer, channels: [...preset.offer.channels] },
    messagesPerPerson: 1,
    costPerMessage: { ...campaignAssumptions.costPerMessage },
    annualValuePerAccount: campaignAssumptions.annualValuePerPrimary,
  }
}

export interface CampaignEconomics {
  kind: CampaignKind
  treated: number
  holdout: number
  /** Acquisition: new openings. Retention: accounts saved. */
  outcomes: number
  /** Acquisition only: openings × funnel primacy rate. */
  primary?: number
  primacyRate?: number
  /** Accounts that earn the bonus, and how that was estimated. */
  qualifying: number
  qualifyingBasis: string
  costs: { bonus: number; channel: number; feeWaiver: number; perAccount: number; total: number }
  costPerOutcome: number
  /** Acquisition only. */
  costPerPrimary?: number
  /** Value base: primary accounts (acquisition) or saved accounts (retention). */
  valueAccounts: number
  annualValue: number
  /** Months for value to repay cost. */
  paybackMonths: number
  /** Annual value per account needed to break even within a year (= cost ÷ value accounts). */
  breakEvenValuePerAccount: number
  timing: { q3DaysAvailable: number; q3Share: number; q3: number; q4: number }
  /** Acquisition: incremental openings gap; retention: net account change. */
  impact:
    | { kind: 'acquisition'; incrementalGap: number; closesShare: number }
    | { kind: 'retention'; netChangeNow: number; netChangeAfter: number; openAccounts: number; primacyLiftPts: number }
  /** Rate vs. history (acquisition) or vs. the max that makes sense (fee forgiveness). */
  rateWarning?: string
}

export function computeEconomics(inputs: CampaignInputs): CampaignEconomics {
  const { offer } = inputs
  const preset = campaignPresets.find((p) => p.id === inputs.presetId)
  const treated = Math.round(inputs.audience * (1 - inputs.holdoutShare))
  const holdout = inputs.audience - treated
  // Counts are whole accounts before any cost math, so every line can be redone from the numbers shown.
  const outcomes = Math.round(treated * inputs.rate)

  let primary: number | undefined
  let primacyRate: number | undefined
  let qualifying = outcomes
  let qualifyingBasis = inputs.kind === 'acquisition' ? 'All new openings (no requirement)' : 'All saved accounts'
  if (inputs.kind === 'acquisition') {
    primacyRate = primacyRateFor(offer.openingChannel).rate
    primary = Math.round(outcomes * primacyRate)
    if (offer.directDepositUsd > 0) {
      qualifying = primary
      qualifyingBasis = `Primary accounts, as the proxy for meeting a direct-deposit requirement (${(primacyRate * 100).toFixed(1)}% of openings)`
    } else if (offer.debitPurchases > 0) {
      const a = activationRate()
      qualifying = Math.round(outcomes * a.rate)
      qualifyingBasis = `Activated accounts, as the proxy for meeting a debit-purchase requirement (${(a.rate * 100).toFixed(1)}% of openings)`
    }
  }

  const perPersonChannel = offer.channels.reduce((s, c) => s + inputs.costPerMessage[c], 0) * inputs.messagesPerPerson
  const costs = {
    bonus: offer.bonusUsd * qualifying,
    channel: treated * perPersonChannel,
    // Retention fee waiver goes to everyone treated; it's revenue given up, so it counts as cost.
    feeWaiver: inputs.kind === 'retention' && offer.waiveFirstFee ? treated * checkingTerms.monthlyMaintenanceFee : 0,
    perAccount: offer.perAccountCostUsd * outcomes,
    total: 0,
  }
  costs.total = costs.bonus + costs.channel + costs.feeWaiver + costs.perAccount

  const valueAccounts = inputs.kind === 'acquisition' ? (primary ?? 0) : outcomes
  const annualValue = valueAccounts * inputs.annualValuePerAccount
  const q3DaysAvailable = getPaceProjection(getKpi('checking-new-accounts'), reportingPeriod).daysRemaining
  const q3Share = offer.durationDays > 0 ? Math.min(offer.durationDays, q3DaysAvailable) / offer.durationDays : 0
  const q3 = Math.round(outcomes * q3Share)

  let impact: CampaignEconomics['impact']
  if (inputs.kind === 'acquisition') {
    const gap = getPaceProjection(getKpi('checking-new-accounts'), reportingPeriod).incrementalNeeded
    impact = { kind: 'acquisition', incrementalGap: gap, closesShare: gap > 0 ? q3 / gap : 0 }
  } else {
    const netChangeNow = getNetAccountChange(getKpi('checking-new-accounts').actual, currentQuarterHealth.closedThisQuarter)
    const total = getHealthTotal(healthMixHistory[healthMixHistory.length - 1])
    impact = { kind: 'retention', netChangeNow, netChangeAfter: netChangeNow + q3, openAccounts: total, primacyLiftPts: (q3 / total) * 100 }
  }

  let rateWarning: string | undefined
  const ref = preset ? getAudienceSource(preset).history : undefined
  if (inputs.kind === 'acquisition' && ref && roundRate(inputs.rate) > ref.max) {
    rateWarning = `Above the last ${ref.quarters} quarters' range (${(ref.min * 100).toFixed(1)}%–${(ref.max * 100).toFixed(1)}%).`
  } else if (inputs.kind === 'acquisition' && ref && roundRate(inputs.rate) < ref.min) {
    rateWarning = `Below the last ${ref.quarters} quarters' range (${(ref.min * 100).toFixed(1)}%–${(ref.max * 100).toFixed(1)}%).`
  } else if (preset?.saveRateFrom === 'fee-trigger' && roundRate(inputs.rate) > feeClosureGap().gap) {
    rateWarning = `Above the ${(feeClosureGap().gap * 100).toFixed(1)}% extra closures the first fee causes: a waiver can't save more than that.`
  }

  return {
    kind: inputs.kind,
    treated,
    holdout,
    outcomes,
    primary,
    primacyRate,
    qualifying,
    qualifyingBasis,
    costs,
    costPerOutcome: outcomes > 0 ? costs.total / outcomes : 0,
    costPerPrimary: primary ? costs.total / primary : undefined,
    valueAccounts,
    annualValue,
    paybackMonths: annualValue > 0 ? costs.total / (annualValue / 12) : Infinity,
    breakEvenValuePerAccount: valueAccounts > 0 ? costs.total / valueAccounts : 0,
    timing: { q3DaysAvailable, q3Share, q3, q4: outcomes - q3 },
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
