// Campaign Tracker math: lift vs. holdout with a 95% interval, a per-campaign funnel that separates
// "still maturing" from failures, planned vs. actual, totals by type, and the gap feasibility roll-up.
import { activationFunnel, type ActivationFunnel } from '../data/checkingHealth'
import { campaignPresets } from '../data/campaignPresets'
import { seedCampaigns, type DailyByChannel, type SeedCampaign } from '../data/campaignSeeds'
import { DAYS_WITH_DATA, dayToIso } from '../data/dailyOpenings'
import { getKpi } from '../data/productMetrics'
import { computeEconomics, inputsFromPreset, type CampaignEconomics, type CampaignInputs } from './campaignEconomics'
import type { SavedCampaign } from './campaignStore'
import { getHeadlineProjection, shortDate, type Window } from './dailyTracking'

/** Funnel windows (days after opening): activation is measured at 30 days, primacy at 90. */
export const ACTIVATION_WINDOW = 30
export const PRIMACY_WINDOW = 90
/** Below these, a lift reading is "Too early". */
export const MIN_HOLDOUT = 100
export const MIN_DAYS = 14
const Z95 = 1.96

// --- Lift vs. holdout --------------------------------------------------------------------------------

export type LiftLabel = 'Too early' | 'Not yet significant' | 'Significant'

export interface Lift {
  treatedN: number
  holdoutN: number
  treatedOpenings: number
  holdoutOpenings: number
  /** p1 = treated openings ÷ treated. */
  treatedRate: number
  /** p2 = holdout openings ÷ holdout. */
  holdoutRate: number
  /** p1 − p2. */
  uplift: number
  /** SE = √(p1(1−p1)/n1 + p2(1−p2)/n2). */
  standardError: number
  /** uplift ± 1.96 × SE. */
  ci: [number, number]
  /** round(n1 × (p1 − p2)). */
  incremental: number
  daysRun: number
  label: LiftLabel
}

export function computeLift(treatedN: number, treatedOpenings: number, holdoutN: number, holdoutOpenings: number, daysRun: number): Lift {
  const p1 = treatedN ? treatedOpenings / treatedN : 0
  const p2 = holdoutN ? holdoutOpenings / holdoutN : 0
  const uplift = p1 - p2
  const se = Math.sqrt((treatedN ? (p1 * (1 - p1)) / treatedN : 0) + (holdoutN ? (p2 * (1 - p2)) / holdoutN : 0))
  const ci: [number, number] = [uplift - Z95 * se, uplift + Z95 * se]
  const label: LiftLabel =
    holdoutN < MIN_HOLDOUT || daysRun < MIN_DAYS ? 'Too early' : ci[0] <= 0 && ci[1] >= 0 ? 'Not yet significant' : 'Significant'
  return {
    treatedN,
    holdoutN,
    treatedOpenings,
    holdoutOpenings,
    treatedRate: p1,
    holdoutRate: p2,
    uplift,
    standardError: se,
    ci,
    incremental: Math.round(treatedN * uplift),
    daysRun,
    label,
  }
}

const total = (rows: DailyByChannel[]) => rows.reduce((s, r) => s + r.branch + r.digital, 0)

/** Days of results by the internal as-of date (day 74). */
export function daysRun(seed: SeedCampaign): number {
  return Math.max(0, Math.min(seed.endDay, DAYS_WITH_DATA) - seed.startDay + 1)
}

export function seedLift(seed: SeedCampaign, upToDay = DAYS_WITH_DATA): Lift {
  const t = seed.treatedDaily.filter((d) => d.day <= upToDay)
  const h = seed.holdoutDaily.filter((d) => d.day <= upToDay)
  const ran = Math.max(0, Math.min(seed.endDay, upToDay) - seed.startDay + 1)
  return computeLift(seed.audience - seed.holdout, total(t), seed.holdout, total(h), ran)
}

// --- Funnel with maturity ----------------------------------------------------------------------------

export interface CampaignFunnel {
  /** Same shape as the quarter funnel, so the activation funnel component can render it. */
  channels: ActivationFunnel[]
  /** Opened under 30 days ago and not activated yet: not failures. */
  maturingActivation: number
  /** Opened under 90 days ago and not primary yet: not failures. */
  maturingPrimary: number
  /** Opened 30+ days ago and never activated. */
  neverActivated: number
  /** Expected primary accounts once every cohort passes 90 days (channel primacy rate × openings). */
  primaryAtMaturity: number
}

/**
 * Each day's openings move through the funnel at the quarter funnel's channel rates, reached in proportion
 * to age: activated so far = openings × activation rate × min(1, age ÷ 30); primary so far = openings ×
 * primacy rate × min(1, age ÷ 90). Age = days from opening to the as-of date (day 74).
 */
export function campaignFunnel(rows: DailyByChannel[]): CampaignFunnel {
  const acc = { maturingAct: 0, maturingPrim: 0, neverAct: 0, primaryAtMaturity: 0 }
  const channels = activationFunnel.map((ch) => {
    const fundedRate = ch.funded / ch.opened
    const actRate = ch.activated / ch.opened
    const primRate = ch.primary / ch.opened
    let opened = 0
    let funded = 0
    let activated = 0
    let primary = 0
    for (const r of rows) {
      const n = r[ch.channel]
      if (!n) continue
      const age = DAYS_WITH_DATA - r.day
      const actShare = Math.min(1, age / ACTIVATION_WINDOW)
      const primShare = Math.min(1, age / PRIMACY_WINDOW)
      opened += n
      funded += n * fundedRate
      activated += n * actRate * actShare
      primary += n * primRate * primShare
      if (age < ACTIVATION_WINDOW) acc.maturingAct += n * (1 - actRate * actShare)
      else acc.neverAct += n * (1 - actRate)
      if (age < PRIMACY_WINDOW) acc.maturingPrim += n * (1 - primRate * primShare)
      acc.primaryAtMaturity += n * primRate
    }
    return { channel: ch.channel, label: ch.label, opened, funded: Math.round(funded), activated: Math.round(activated), primary: Math.round(primary) }
  })
  return {
    channels: channels.filter((c) => c.opened > 0),
    maturingActivation: Math.round(acc.maturingAct),
    maturingPrimary: Math.round(acc.maturingPrim),
    neverActivated: Math.round(acc.neverAct),
    primaryAtMaturity: Math.round(acc.primaryAtMaturity),
  }
}

// --- Spend -------------------------------------------------------------------------------------------

export interface SeedSpend {
  channel: number
  bonusToDate: number
  bonusAtMaturity: number
  perOpening: number
  toDate: number
  atMaturity: number
}

/** Bonuses are paid as accounts meet the requirement: primary accounts, reached in proportion to age ÷ window. */
export function seedSpend(seed: SeedCampaign): SeedSpend {
  const treatedN = seed.audience - seed.holdout
  const channel = treatedN * seed.costs.channelPerPerson
  const openings = total(seed.treatedDaily)
  const perOpening = openings * seed.costs.perOpeningUsd
  let bonusToDate = 0
  let bonusAtMaturity = 0
  if (seed.costs.bonusUsd > 0) {
    for (const r of seed.treatedDaily) {
      const age = DAYS_WITH_DATA - r.day
      for (const ch of activationFunnel) {
        const qualifying = r[ch.channel] * (seed.costs.bonusOnPrimary ? ch.primary / ch.opened : 1)
        bonusToDate += qualifying * Math.min(1, age / seed.costs.bonusWindowDays)
        bonusAtMaturity += qualifying
      }
    }
    bonusToDate = Math.round(bonusToDate) * seed.costs.bonusUsd
    bonusAtMaturity = Math.round(bonusAtMaturity) * seed.costs.bonusUsd
  }
  return { channel, bonusToDate, bonusAtMaturity, perOpening, toDate: channel + bonusToDate + perOpening, atMaturity: channel + bonusAtMaturity + perOpening }
}

// --- Tracked campaigns (seeds + builder saves) -------------------------------------------------------

export interface TrackedCampaign {
  id: string
  name: string
  status: 'draft' | 'live' | 'completed'
  origin: 'seed' | 'builder'
  inputs?: CampaignInputs
  plan?: CampaignEconomics
  seed?: SeedCampaign
  /** Seeds only. */
  actual?: {
    lift: Lift
    funnel: CampaignFunnel
    spend: SeedSpend
    /** round(incremental × primary at maturity ÷ treated openings). */
    incrementalPrimary: number
    costPerIncrementalPrimary: number
    dates: string
  }
}

export function seedPlanInputs(seed: SeedCampaign): CampaignInputs | undefined {
  if (!seed.presetId || !campaignPresets.some((p) => p.id === seed.presetId)) return undefined
  const base = inputsFromPreset(seed.presetId)
  return {
    ...base,
    name: seed.name,
    audience: seed.planOverrides?.audience ?? base.audience,
    holdoutShare: seed.holdout / seed.audience,
    offer: { ...base.offer, durationDays: seed.planOverrides?.durationDays ?? base.offer.durationDays },
  }
}

export function trackSeed(seed: SeedCampaign): TrackedCampaign {
  const lift = seedLift(seed)
  const funnel = campaignFunnel(seed.treatedDaily)
  const spend = seedSpend(seed)
  const openings = lift.treatedOpenings
  const incrementalPrimary = openings ? Math.round((lift.incremental * funnel.primaryAtMaturity) / openings) : 0
  const inputs = seedPlanInputs(seed)
  return {
    id: seed.id,
    name: seed.name,
    status: seed.status,
    origin: 'seed',
    inputs,
    plan: inputs ? computeEconomics(inputs) : undefined,
    seed,
    actual: {
      lift,
      funnel,
      spend,
      incrementalPrimary,
      costPerIncrementalPrimary: incrementalPrimary > 0 ? spend.atMaturity / incrementalPrimary : Infinity,
      dates: `${shortDate(dayToIso(seed.startDay))} – ${shortDate(dayToIso(seed.endDay))}`,
    },
  }
}

export function trackSaved(c: SavedCampaign): TrackedCampaign {
  return { id: c.id, name: c.inputs.name, status: c.status, origin: 'builder', inputs: c.inputs, plan: computeEconomics(c.inputs) }
}

export function getTrackedCampaigns(saved: SavedCampaign[]): TrackedCampaign[] {
  return [...seedCampaigns.map(trackSeed), ...saved.map(trackSaved)]
}

// --- Totals by type (never summed across types) and feasibility --------------------------------------

const ACQUISITION_PRESETS = ['primacy-bonus', 'application-rescue', 'first-account']

export interface PlanItem {
  name: string
  status: string
  q3Incremental: number
  /** "saved" campaigns from the builder, or an unsaved preset at its defaults. */
  from: 'saved' | 'preset default'
}

export function getTotals(saved: SavedCampaign[]) {
  const kpi = getKpi('checking-new-accounts')
  const { projection, average } = getHeadlineProjection(kpi)
  const seeds = seedCampaigns.map(trackSeed)
  const planned = saved.filter((c) => c.status !== 'completed').map((c) => ({ c, e: computeEconomics(c.inputs) }))

  // Acquisition plan: every saved Live/Draft acquisition campaign, plus any of the three acquisition presets
  // not saved yet (at defaults). Seeds are excluded: their openings are already inside the 7,600 actual.
  const savedAcq = planned.filter(({ c }) => c.inputs.outcome === 'openings')
  const plan: PlanItem[] = [
    ...savedAcq.map(({ c, e }) => ({ name: c.inputs.name, status: c.status, q3Incremental: e.timing.q3, from: 'saved' as const })),
    ...ACQUISITION_PRESETS.filter((id) => !savedAcq.some(({ c }) => c.inputs.presetId === id)).map((id) => {
      const e = computeEconomics(inputsFromPreset(id))
      return { name: inputsFromPreset(id).name, status: 'Not saved', q3Incremental: e.timing.q3, from: 'preset default' as const }
    }),
  ]
  const planQ3 = plan.reduce((s, p) => s + p.q3Incremental, 0)
  const gap = projection.incrementalNeeded

  const closure = planned.filter(({ c }) => c.inputs.outcome === 'closures-avoided')
  const activation = planned.filter(({ c }) => c.inputs.outcome === 'activations')
  const crossSell = planned.filter(({ c }) => c.inputs.outcome === 'savings-accounts')

  return {
    acquisition: {
      delivered: seeds.reduce((s, t) => s + (t.actual?.lift.incremental ?? 0), 0),
      seeds,
      plan,
      planQ3,
      gap,
      gapAverage: average.incrementalNeeded,
      share: gap > 0 ? planQ3 / gap : 0,
      unlikely: gap > 0 && planQ3 / gap < 0.5,
    },
    closure: {
      count: closure.length,
      q3: closure.reduce((s, { e }) => s + e.timing.q3, 0),
      next90: closure.reduce((s, { e }) => s + (e.impact.kind === 'net-change' ? e.impact.next90 : 0), 0),
      netNow: closure[0]?.e.impact.kind === 'net-change' ? closure[0].e.impact.netNow : undefined,
    },
    activation: {
      count: activation.length,
      activated: activation.reduce((s, { e }) => s + e.results.total, 0),
      liftPts: activation.reduce((s, { e }) => s + (e.impact.kind === 'activation' ? e.impact.primacyLiftPts : 0), 0),
    },
    crossSell: {
      count: crossSell.length,
      deposits: crossSell.reduce((s, { e }) => s + (e.impact.kind === 'cross-sell' ? e.impact.deposits : 0), 0),
    },
  }
}

/** A Live seed's results inside the strip's comparison window. */
export function liveWindowChange(seed: SeedCampaign, w: Window) {
  const inWindow = seed.treatedDaily.filter((d) => d.day > w.fromDay && d.day <= w.toDay)
  return { newTreatedOpenings: total(inWindow), lift: seedLift(seed) }
}
