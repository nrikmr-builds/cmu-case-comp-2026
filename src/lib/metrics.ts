// Shared KPI math. Derive numbers here instead of hardcoding them in pages.
import type { CustomerSegment, Kpi, KpiStatus, KpiUnit } from '../types'

const ON_TRACK_THRESHOLD = 0.95
const WATCH_THRESHOLD = 0.85

/** Share of the full-quarter target achieved so far (can exceed 1). */
export function getAttainment(kpi: Kpi): number {
  return kpi.actual / kpi.target
}

/** What a cumulative KPI should be by now; a rate KPI is judged against its target. */
export function getExpected(kpi: Kpi, quarterElapsed: number): number {
  return kpi.kind === 'cumulative' ? kpi.target * quarterElapsed : kpi.target
}

/** Actual vs. expected pace (1 = exactly on pace). */
export function getPaceRatio(kpi: Kpi, quarterElapsed: number): number {
  return kpi.actual / getExpected(kpi, quarterElapsed)
}

export function getStatus(kpi: Kpi, quarterElapsed: number): KpiStatus {
  const ratio = getPaceRatio(kpi, quarterElapsed)
  if (ratio >= ON_TRACK_THRESHOLD) return 'on-track'
  if (ratio >= WATCH_THRESHOLD) return 'watch'
  return 'at-risk'
}

/** How far behind the expected pace (0 if ahead). */
export function getPaceGap(kpi: Kpi, quarterElapsed: number): number {
  return Math.max(0, getExpected(kpi, quarterElapsed) - kpi.actual)
}

/** How much more is needed to hit the full-quarter target (0 if met). */
export function getRemainingToTarget(kpi: Kpi): number {
  return Math.max(0, kpi.target - kpi.actual)
}

export function getPotentialAccounts(segment: CustomerSegment): number {
  return Math.round(segment.eligibleCustomers * segment.estimatedConversionRate)
}

export function formatValue(value: number, unit: KpiUnit): string {
  switch (unit) {
    case 'percent':
      return `${Math.round(value * 100)}%`
    case 'usd':
      return `$${(value / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`
    case 'accounts':
      return Math.round(value).toLocaleString('en-US')
  }
}

export function formatPercent(fraction: number): string {
  return `${(fraction * 100).toLocaleString('en-US', { maximumFractionDigits: 1 })}%`
}

/** e.g. "Sep 10, 8:55 AM". */
export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
