// Campaign Tracker math: lift vs. holdout with a 95% interval, a per-campaign funnel that separates
// "still maturing" from failures, planned vs. actual, totals by type, and the gap feasibility roll-up.
import { activationFunnel, riskSegments, type ActivationFunnel } from '../data/checkingHealth'
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

/** Bonus requirement window: $500+ direct deposit within 60 days. */
export const BONUS_WINDOW = 60

export interface StageProgress {
  /** Reached so far, by the as-of date. */
  soFar: number
  /** Reached once every cohort has passed the stage's window. */
  atMaturity: number
  /** atMaturity − soFar: still inside the window, so not failures. */
  maturing: number
}

export interface CampaignFunnel {
  /** Same shape as the quarter funnel, so the funnel table can render it (counts reached so far). */
  channels: ActivationFunnel[]
  activation: StageProgress
  /** "$500+ direct deposit within 60 days" (the bonus requirement). */
  metBonus: StageProgress & { byChannel: number[] }
  primary: StageProgress
  /** Opened 30+ days ago and never activated. */
  neverActivated: number
}

/**
 * Each day's openings move through the funnel at the quarter funnel's channel rates, reached in proportion to
 * age ÷ window (age = days from opening to day 74): activation 30 days, bonus requirement 60, primacy 90.
 * Still maturing = at maturity − so far, so accounts that will never get there are not counted as maturing.
 */
export function campaignFunnel(rows: DailyByChannel[]): CampaignFunnel {
  const acc = { actSoFar: 0, actMature: 0, bonusSoFar: 0, bonusMature: 0, primSoFar: 0, primMature: 0, neverAct: 0 }
  const bonusByChannel: number[] = []
  const channels = activationFunnel.map((ch) => {
    const rate = { funded: ch.funded / ch.opened, act: ch.activated / ch.opened, dd: ch.metDirectDeposit / ch.opened, prim: ch.primary / ch.opened }
    const c = { opened: 0, funded: 0, activated: 0, dd: 0, primary: 0 }
    for (const r of rows) {
      const n = r[ch.channel]
      if (!n) continue
      const age = DAYS_WITH_DATA - r.day
      const share = (window: number) => Math.min(1, age / window)
      c.opened += n
      c.funded += n * rate.funded
      c.activated += n * rate.act * share(ACTIVATION_WINDOW)
      c.dd += n * rate.dd * share(BONUS_WINDOW)
      c.primary += n * rate.prim * share(PRIMACY_WINDOW)
      acc.actMature += n * rate.act
      acc.bonusMature += n * rate.dd
      acc.primMature += n * rate.prim
      if (age >= ACTIVATION_WINDOW) acc.neverAct += n * (1 - rate.act)
    }
    acc.actSoFar += c.activated
    acc.bonusSoFar += c.dd
    acc.primSoFar += c.primary
    bonusByChannel.push(Math.round(c.dd))
    return {
      channel: ch.channel,
      label: ch.label,
      opened: c.opened,
      funded: Math.round(c.funded),
      activated: Math.round(c.activated),
      primary: Math.round(c.primary),
      metDirectDeposit: Math.round(c.dd),
    }
  })
  const keep = channels.map((c) => c.opened > 0)
  const progress = (soFar: number, mature: number): StageProgress => {
    const s = Math.round(soFar)
    const m = Math.round(mature)
    return { soFar: s, atMaturity: m, maturing: m - s }
  }
  return {
    channels: channels.filter((_, i) => keep[i]),
    activation: progress(acc.actSoFar, acc.actMature),
    metBonus: { ...progress(acc.bonusSoFar, acc.bonusMature), byChannel: bonusByChannel.filter((_, i) => keep[i]) },
    primary: progress(acc.primSoFar, acc.primMature),
    neverActivated: Math.round(acc.neverAct),
  }
}

// --- Spend and projection to campaign end -------------------------------------------------------------

export interface SeedProjection {
  /** Campaign length ÷ days of results so far (1 once the campaign has ended). */
  factor: number
  campaignDays: number
  /** Treated openings and incremental openings, projected to the end of the campaign. */
  openings: number
  incremental: number
  /** Incremental primary at maturity, for the full campaign. */
  incrementalPrimary: number
}

export interface SeedSpend {
  channel: number
  bonusToDate: number
  perOpeningToDate: number
  toDate: number
  /** Projected at campaign end and once every account has matured. */
  bonusProjected: number
  perOpeningProjected: number
  projected: number
}

export function seedProjection(seed: SeedCampaign, lift: Lift, funnel: CampaignFunnel): SeedProjection {
  const campaignDays = seed.endDay - seed.startDay + 1
  const factor = lift.daysRun > 0 ? Math.max(1, campaignDays / lift.daysRun) : 1
  const openings = Math.round(lift.treatedOpenings * factor)
  const incremental = Math.round(lift.incremental * factor)
  const primaryRate = lift.treatedOpenings ? funnel.primary.atMaturity / lift.treatedOpenings : 0
  return { factor, campaignDays, openings, incremental, incrementalPrimary: Math.round(incremental * primaryRate) }
}

/** Channel cost is paid up front; per-opening cost and bonuses scale with openings (bonuses on accounts meeting the requirement). */
export function seedSpend(seed: SeedCampaign, funnel: CampaignFunnel, proj: SeedProjection, treatedOpenings: number): SeedSpend {
  const treatedN = seed.audience - seed.holdout
  const channel = treatedN * seed.costs.channelPerPerson
  const bonusToDate = seed.costs.bonusUsd * funnel.metBonus.soFar
  const perOpeningToDate = treatedOpenings * seed.costs.perOpeningUsd
  const bonusProjected = seed.costs.bonusUsd * Math.round(funnel.metBonus.atMaturity * proj.factor)
  const perOpeningProjected = proj.openings * seed.costs.perOpeningUsd
  return {
    channel,
    bonusToDate,
    perOpeningToDate,
    toDate: channel + bonusToDate + perOpeningToDate,
    bonusProjected,
    perOpeningProjected,
    projected: channel + bonusProjected + perOpeningProjected,
  }
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
    projection: SeedProjection
    spend: SeedSpend
    /** Projected cost (campaign end + maturity) ÷ projected incremental primary. */
    costPerIncrementalPrimary: number
    /** Plan pro-rated to the days of results so far (same time basis as the actual). */
    planToDate?: { incremental: number }
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
  const projection = seedProjection(seed, lift, funnel)
  const spend = seedSpend(seed, funnel, projection, lift.treatedOpenings)
  const inputs = seedPlanInputs(seed)
  const plan = inputs ? computeEconomics(inputs) : undefined
  return {
    id: seed.id,
    name: seed.name,
    status: seed.status,
    origin: 'seed',
    inputs,
    plan,
    seed,
    actual: {
      lift,
      funnel,
      projection,
      spend,
      costPerIncrementalPrimary: projection.incrementalPrimary > 0 ? spend.projected / projection.incrementalPrimary : Infinity,
      planToDate: plan ? { incremental: Math.round((plan.results.incremental * lift.daysRun) / projection.campaignDays) } : undefined,
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

/** One unit in an overlap check: a campaign, or all next-best-action Drafts on a segment together. */
export interface OverlapUnit {
  name: string
  segmentId: string
  /** Undefined for the NBA unit, which spans closure prevention and cross-sell. */
  outcome?: CampaignInputs['outcome']
  ids: string[]
  /** Annual value − total cost, over every campaign in the unit (cross-sell value included). */
  net: number
  saves: number
  savingsAccounts: number
}

export interface OverlapEntry {
  segmentLabel: string
  kept: OverlapUnit
  dropped: OverlapUnit[]
}

/**
 * The planner's overlap rule for closure-prevention and cross-sell campaigns: campaigns aimed at the same segment
 * reach the same customers, so only one counts. The one with the higher NET value (annual value − cost) is kept,
 * so a blanket offer and a personalised one are compared on what they're worth, not on raw saves. The
 * next-best-action Drafts split one segment's customers into disjoint groups (one action each), so together they
 * form one unit that overlaps every other campaign on that segment; two ordinary campaigns overlap only when they
 * also share an outcome.
 */
export function resolveOverlaps(items: { c: SavedCampaign; e: CampaignEconomics }[]): { keptIds: Set<string>; overlaps: OverlapEntry[] } {
  const segmentOf = (c: SavedCampaign) =>
    c.nba ? 'direct-deposit-leaving' : (campaignPresets.find((p) => p.id === c.inputs.presetId)?.source.id ?? c.inputs.presetId)
  const net = (e: CampaignEconomics) => e.annualValue - e.costs.total
  const units: OverlapUnit[] = []
  const nbaUnits = new Map<string, OverlapUnit>()
  for (const { c, e } of items) {
    const seg = segmentOf(c)
    const add = (u: OverlapUnit) => {
      u.ids.push(c.id)
      u.net += net(e)
      if (e.outcome === 'closures-avoided') u.saves += e.results.total
      if (e.outcome === 'savings-accounts') u.savingsAccounts += e.results.total
    }
    if (c.nba) {
      let u = nbaUnits.get(seg)
      if (!u) {
        u = { name: 'Next best action drafts', segmentId: seg, ids: [], net: 0, saves: 0, savingsAccounts: 0 }
        nbaUnits.set(seg, u)
        units.push(u)
      }
      add(u)
    } else {
      const u: OverlapUnit = { name: c.inputs.name, segmentId: seg, outcome: c.inputs.outcome, ids: [], net: 0, saves: 0, savingsAccounts: 0 }
      units.push(u)
      add(u)
    }
  }
  const overlapsWith = (a: OverlapUnit, b: OverlapUnit) =>
    a.segmentId === b.segmentId && (a.outcome === undefined || b.outcome === undefined || a.outcome === b.outcome)
  const kept: OverlapUnit[] = []
  const entries = new Map<OverlapUnit, OverlapUnit[]>()
  for (const u of [...units].sort((a, b) => b.net - a.net)) {
    const winner = kept.find((k) => overlapsWith(k, u))
    if (winner) entries.set(winner, [...(entries.get(winner) ?? []), u])
    else kept.push(u)
  }
  return {
    keptIds: new Set(kept.flatMap((u) => u.ids)),
    overlaps: [...entries].map(([k, dropped]) => ({ segmentLabel: riskSegments.find((r) => r.id === k.segmentId)?.name ?? k.segmentId, kept: k, dropped })),
  }
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

  const { keptIds, overlaps } = resolveOverlaps(planned.filter(({ c }) => c.inputs.outcome === 'closures-avoided' || c.inputs.outcome === 'savings-accounts'))
  const closure = planned.filter(({ c }) => c.inputs.outcome === 'closures-avoided')
  const activation = planned.filter(({ c }) => c.inputs.outcome === 'activations')
  const crossSell = planned.filter(({ c }) => c.inputs.outcome === 'savings-accounts')
  const closureKept = closure.filter(({ c }) => keptIds.has(c.id))
  const crossSellKept = crossSell.filter(({ c }) => keptIds.has(c.id))

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
      counted: closureKept.length,
      q3: closureKept.reduce((s, { e }) => s + e.timing.q3, 0),
      next90: closureKept.reduce((s, { e }) => s + (e.impact.kind === 'net-change' ? e.impact.next90 : 0), 0),
      netNow: closure[0]?.e.impact.kind === 'net-change' ? closure[0].e.impact.netNow : undefined,
    },
    activation: {
      count: activation.length,
      activated: activation.reduce((s, { e }) => s + e.results.total, 0),
      liftPts: activation.reduce((s, { e }) => s + (e.impact.kind === 'activation' ? e.impact.primacyLiftPts : 0), 0),
    },
    overlaps,
    crossSell: {
      count: crossSell.length,
      counted: crossSellKept.length,
      deposits: crossSellKept.reduce((s, { e }) => s + (e.impact.kind === 'cross-sell' ? e.impact.deposits : 0), 0),
    },
  }
}

/** A Live seed's results inside the strip's comparison window. */
export function liveWindowChange(seed: SeedCampaign, w: Window) {
  const inWindow = seed.treatedDaily.filter((d) => d.day > w.fromDay && d.day <= w.toDay)
  return { newTreatedOpenings: total(inWindow), lift: seedLift(seed) }
}
