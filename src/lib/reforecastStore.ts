// An accepted (illustrative) re-forecast of a KPI target. Stored under pih.* so Reset demo clears it. The
// original target in productMetrics.ts is never changed: pages show both side by side.
import { useSyncExternalStore } from 'react'
import { reportingPeriod } from '../data/productMetrics'
import type { Kpi, KpiStatus } from '../types'
import { getStatus } from './metrics'

export interface Reforecast {
  kpiId: string
  /** New illustrative target. */
  target: number
  reason: string
  /** ISO timestamp the product owner accepted it. */
  acceptedAt: string
  /** How the planner got there, for the record. */
  basis: string
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

/** The KPI judged against the re-forecast target instead of the original (a copy; the original is untouched). */
export function againstReforecast(kpi: Kpi, r: Reforecast) {
  const asTarget: Kpi = { ...kpi, target: r.target }
  const expected = r.target * reportingPeriod.quarterElapsed
  const status: KpiStatus = getStatus(asTarget, reportingPeriod.quarterElapsed)
  return {
    target: r.target,
    expected,
    paceRatio: kpi.actual / expected,
    shareOfTarget: kpi.actual / r.target,
    stillNeeded: Math.max(0, r.target - kpi.actual),
    status,
  }
}

/** "Re-forecast (illustrative, proposed by product owner, Oct 23)". */
export function reforecastLabel(r: Reforecast): string {
  const date = new Date(r.acceptedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `Re-forecast (illustrative, proposed by product owner, ${date})`
}
