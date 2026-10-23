// Daily tracking math: cumulative openings, windows for "since your last visit", and alert-rule checks.
import { dropOffSignals } from '../data/checkingHealth'
import { dailyFlags, dailyOpenings, DAYS_WITH_DATA, dayToIso } from '../data/dailyOpenings'
import { getKpi, reportingPeriod } from '../data/productMetrics'
import type { KpiStatus } from '../types'
import { getPaceProjection } from './projection'

const openingsKpi = () => getKpi('checking-new-accounts')

export const dailyTotal = (day: number) => {
  const d = dailyOpenings[day - 1]
  return d ? d.branch + d.digital : 0
}

/** Target ÷ days in the quarter: the even daily pace the plan assumes (12,000 ÷ 92 ≈ 130/day). */
export function planDailyPace(): number {
  return openingsKpi().target / reportingPeriod.quarterDays
}

/** Average daily openings over the 7 days ending on `day` (undefined before day 7). */
export function sevenDayAverage(day: number): number | undefined {
  if (day < 7) return undefined
  return (cumulativeOpenings(day) - cumulativeOpenings(day - 7)) / 7
}

/** This week (last 7 days of data) vs. the quarter-to-date daily average. */
export function getWeeklyPace() {
  const p = getPaceProjection(openingsKpi(), reportingPeriod)
  const weekTotal = cumulativeOpenings(DAYS_WITH_DATA) - cumulativeOpenings(DAYS_WITH_DATA - 7)
  const weekPerDay = weekTotal / 7
  return { weekTotal, weekPerDay, quarterPerDay: p.currentDailyRate, slowing: weekPerDay < p.currentDailyRate }
}

/** Openings from day 1 through `day`. */
export function cumulativeOpenings(day: number): number {
  return dailyOpenings.slice(0, day).reduce((sum, d) => sum + d.branch + d.digital, 0)
}

/** Sum of a daily series over days (from, to], i.e. the days after `from` up to and including `to`. */
export function sumDays(series: number[], from: number, to: number): number {
  return series.slice(Math.max(0, from), to).reduce((a, b) => a + b, 0)
}

/**
 * Quarter elapsed at the end of `day`. The latest day uses the reporting period's 80% (73.6 of 92 days),
 * so day-74 figures match the Gap Summary exactly.
 */
export function elapsedAt(day: number): number {
  const { quarterDays, quarterElapsed } = reportingPeriod
  return day >= DAYS_WITH_DATA ? quarterElapsed : day / quarterDays
}

/** Openings so far ÷ openings expected by `day` (1 = on pace). */
export function paceRatioAt(day: number): number {
  return cumulativeOpenings(day) / (openingsKpi().target * elapsedAt(day))
}

export function statusFromRatio(ratio: number): KpiStatus {
  if (ratio >= 0.95) return 'on-track'
  if (ratio >= 0.85) return 'watch'
  return 'at-risk'
}

/** One point per day for the cumulative chart, plus projected and required lines from today to quarter end. */
export function cumulativeChartData() {
  const kpi = openingsKpi()
  const p = getPaceProjection(kpi, reportingPeriod)
  const { quarterDays } = reportingPeriod
  const today = p.daysElapsed
  const points: { x: number; actual?: number; projected?: number; required?: number }[] = dailyOpenings.map((d) => ({
    x: Math.min(d.day, today),
    actual: cumulativeOpenings(d.day),
  }))
  // Both forward lines start at today's actual so they read as "from here".
  points[points.length - 1] = { ...points[points.length - 1], projected: kpi.actual, required: kpi.actual }
  points.push({ x: quarterDays, projected: p.projected, required: kpi.target })
  return points
}

// --- Comparison window ----------------------------------------------------------------------------

export interface Window {
  /** Internal days compared: (fromDay, toDay]. */
  fromDay: number
  toDay: number
  days: number
  firstVisit: boolean
  /** Real-world time of the stored last visit, if any. */
  lastVisitAt?: string
}

/** On a first visit, compare against 7 days of data; otherwise against the real time since the last visit. */
export function getWindow(lastVisitAt: string | null, now = Date.now()): Window {
  const toDay = DAYS_WITH_DATA
  if (!lastVisitAt) return { fromDay: toDay - 7, toDay, days: 7, firstVisit: true }
  const elapsedDays = Math.ceil((now - Date.parse(lastVisitAt)) / 86_400_000)
  const days = Math.min(Math.max(elapsedDays, 1), toDay - 1)
  return { fromDay: toDay - days, toDay, days, firstVisit: false, lastVisitAt }
}

export const windowLabel = (w: Window) => `${shortDate(dayToIso(w.fromDay))} → ${shortDate(dayToIso(w.toDay))}`

export function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export interface FlagChange {
  id: string
  name: string
  current: number
  previous: number
  /** (current − previous) ÷ previous. */
  change: number
}

/** New flags per signal in the window vs. the same-length window just before it. */
export function getFlagChanges(w: Window): FlagChange[] {
  return dropOffSignals.map((s) => {
    const series = dailyFlags[s.id] ?? []
    const current = sumDays(series, w.fromDay, w.toDay)
    const previous = sumDays(series, w.fromDay - w.days, w.fromDay)
    return { id: s.id, name: s.name, current, previous, change: previous ? (current - previous) / previous : 0 }
  })
}

// --- Alert rules ------------------------------------------------------------------------------------

export type AlertRule =
  | { id: string; kind: 'avg7-below-plan'; enabled: boolean; days: number }
  | { id: string; kind: 'flags-week-over-week'; enabled: boolean; signalId: string; thresholdPct: number }

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  { id: 'rule-avg7-plan', kind: 'avg7-below-plan', enabled: true, days: 3 },
  { id: 'rule-dd-leaving', kind: 'flags-week-over-week', enabled: true, signalId: 'direct-deposit-leaving', thresholdPct: 15 },
]

export interface AlertResult {
  rule: AlertRule
  triggered: boolean
  /** Plain-language rule, e.g. "Daily openings below required pace for 3+ days in a row". */
  title: string
  /** What the data shows, with the numbers behind the verdict. */
  evidence: string
}

export function describeRule(rule: AlertRule): string {
  if (rule.kind === 'avg7-below-plan') return `7-day average openings below plan pace for ${rule.days}+ days in a row`
  const signal = dropOffSignals.find((s) => s.id === rule.signalId)
  return `${signal?.name ?? rule.signalId} flags up more than ${rule.thresholdPct}% week over week`
}

export function evaluateRule(rule: AlertRule): AlertResult {
  const title = describeRule(rule)
  if (rule.kind === 'avg7-below-plan') {
    const plan = planDailyPace()
    // Count back from today while the trailing 7-day average stays below plan.
    let streak = 0
    for (let day = DAYS_WITH_DATA; (sevenDayAverage(day) ?? Infinity) < plan; day--) streak++
    const now = sevenDayAverage(DAYS_WITH_DATA) ?? 0
    const since = streak > 0 ? ` since ${shortDate(dayToIso(DAYS_WITH_DATA - streak + 1))}` : ''
    return {
      rule,
      title,
      triggered: streak >= rule.days,
      evidence: `7-day average now ${Math.round(now)}/day vs. plan ${Math.round(plan)}/day (${openingsKpi().target.toLocaleString('en-US')} ÷ ${reportingPeriod.quarterDays}). Below plan ${streak} day${streak === 1 ? '' : 's'} in a row${since}.`,
    }
  }
  const series = dailyFlags[rule.signalId] ?? []
  const thisWeek = sumDays(series, DAYS_WITH_DATA - 7, DAYS_WITH_DATA)
  const lastWeek = sumDays(series, DAYS_WITH_DATA - 14, DAYS_WITH_DATA - 7)
  const change = lastWeek ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0
  return {
    rule,
    title,
    triggered: change > rule.thresholdPct,
    evidence: `Last 7 days ${thisWeek} vs. prior 7 days ${lastWeek}: ${change >= 0 ? '+' : ''}${change.toFixed(1)}% (threshold ${rule.thresholdPct}%).`,
  }
}

// --- Competitor offer expiry ------------------------------------------------------------------------

/** Whole days from `asOf` to `expires` (both ISO dates); undefined for free text like "Ongoing". */
export function daysUntil(expires: string | undefined, asOf: string): number | undefined {
  if (!expires || !/^\d{4}-\d{2}-\d{2}$/.test(expires)) return undefined
  return Math.round((Date.parse(`${expires}T00:00:00Z`) - Date.parse(`${asOf}T00:00:00Z`)) / 86_400_000)
}

export function expiryLabel(daysLeft: number, asOf: string): string {
  const when = `as of ${shortDate(asOf)}`
  if (daysLeft < 0) return 'Expired'
  if (daysLeft === 0) return `Expires today (${when})`
  return `${daysLeft} day${daysLeft === 1 ? '' : 's'} left (${when})`
}
