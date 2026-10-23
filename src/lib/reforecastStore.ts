// An accepted (illustrative) re-forecast of a KPI target. Stored under pih.* so Reset demo clears it. The
// original target in productMetrics.ts is never changed: pages show both side by side.
import { useSyncExternalStore } from 'react'
import { reportingPeriod } from '../data/productMetrics'
import type { Kpi, KpiStatus } from '../types'
import { getRecentDailyRate, statusFromRatio } from './dailyTracking'
import { getStatus } from './metrics'
import { getPaceProjection } from './projection'

/** Which end of the planner range the proposal came from. */
export type ReforecastEnd = 'low' | 'high' | 'custom'
export const END_LABEL: Record<ReforecastEnd, string> = { low: 'low end', high: 'high end', custom: 'custom value' }

export interface Reforecast {
  kpiId: string
  /** New illustrative target. */
  target: number
  reason: string
  /** ISO timestamp the product owner accepted it. */
  acceptedAt: string
  /** How the planner got there, for the record. */
  basis: string
  end: ReforecastEnd
  /** Planner range at the time of acceptance. */
  range: { low: number; high: number }
}

const KEY = 'pih.reforecast.v1'
const CHANGE_EVENT = 'pih:reforecast-changed'
let cache: Reforecast | null | undefined

export function getReforecast(): Reforecast | null {
  if (cache !== undefined) return cache
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    cache = parsed && typeof parsed === 'object' ? (parsed as Reforecast) : null
  } catch {
    cache = null
  }
  return cache
}

function save(value: Reforecast | null) {
  cache = value
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value))
    else localStorage.removeItem(KEY)
  } catch {
    // Storage unavailable: the re-forecast lasts for this page view only.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function useReforecast() {
  const value = useSyncExternalStore(
    (l) => {
      window.addEventListener(CHANGE_EVENT, l)
      return () => window.removeEventListener(CHANGE_EVENT, l)
    },
    getReforecast,
  )
  return { reforecast: value, accept: (r: Reforecast) => save(r), clear: () => save(null) }
}

/**
 * Forward-looking check of a re-forecast. Measuring today's actual against 80% of a target that was itself built
 * from today's actual and pace would be circular (it almost always looks On Track), so instead: what daily pace
 * the rest of the quarter needs to reach the re-forecast, compared with the recent (last-7-day) pace.
 */
export function againstReforecast(kpi: Kpi, r: Reforecast) {
  const daysLeft = getPaceProjection(kpi, reportingPeriod).daysRemaining
  const recentPerDay = getRecentDailyRate(kpi.id) ?? kpi.actual / (reportingPeriod.quarterDays * reportingPeriod.quarterElapsed)
  const stillNeeded = Math.max(0, r.target - kpi.actual)
  const requiredPerDay = stillNeeded / daysLeft
  const recentVsRequired = requiredPerDay > 0 ? recentPerDay / requiredPerDay : Infinity
  const status: KpiStatus = statusFromRatio(recentVsRequired)
  return {
    target: r.target,
    shareOfTarget: kpi.actual / r.target,
    stillNeeded,
    daysLeft,
    requiredPerDay,
    recentPerDay,
    /** required ÷ recent: "needs 1.2× the recent pace". */
    multiple: recentPerDay > 0 ? requiredPerDay / recentPerDay : Infinity,
    /** recent ÷ required, judged with the usual thresholds (≥ 95% On Track, 85–95% Watch, < 85% At Risk). */
    recentVsRequired,
    status,
    /** The original target's status, which the re-forecast never replaces. */
    originalStatus: getStatus(kpi, reportingPeriod.quarterElapsed),
  }
}

const STATUS_TEXT: Record<KpiStatus, string> = { 'on-track': 'On Track', watch: 'Watch', 'at-risk': 'At Risk' }

/** "The original target stays At Risk; the re-forecast is a proposal, not a new target." */
export function proposalCaveat(originalStatus: KpiStatus): string {
  return `The original target stays ${STATUS_TEXT[originalStatus]}; the re-forecast is a proposal, not a new target.`
}

/** "Re-forecast (illustrative, proposed by product owner, Oct 23)". */
export function reforecastLabel(r: Reforecast): string {
  const date = new Date(r.acceptedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `Re-forecast (illustrative, proposed by product owner, ${date})`
}
