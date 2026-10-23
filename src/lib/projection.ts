// Where a cumulative KPI lands if today's pace continues, and what it takes to close the rest.
import type { Kpi, ReportingPeriod } from '../types'
import { getRemainingToTarget } from './metrics'

export interface PaceProjection {
  /** actual ÷ quarter elapsed. */
  projected: number
  /** projected ÷ target. */
  projectedShareOfTarget: number
  /** projected − actual: what today's pace adds over the rest of the quarter. */
  restOfQuarterAtPace: number
  /** target − actual. */
  remainingToTarget: number
  /** target − projected (0 when pace already reaches target): what has to come from new effort. */
  incrementalNeeded: number
  /** projected − target when pace overshoots, else 0. */
  projectedSurplus: number
  daysElapsed: number
  daysRemaining: number
  /** actual ÷ days elapsed. */
  currentDailyRate: number
  /** remaining to target ÷ days remaining. */
  requiredDailyRate: number
  /** required ÷ current daily rate. */
  requiredMultiple: number
}

export function getPaceProjection(kpi: Kpi, period: ReportingPeriod): PaceProjection {
  const projected = kpi.actual / period.quarterElapsed
  const remainingToTarget = getRemainingToTarget(kpi)
  const daysElapsed = period.quarterDays * period.quarterElapsed
  const daysRemaining = period.quarterDays - daysElapsed
  const currentDailyRate = kpi.actual / daysElapsed
  const requiredDailyRate = remainingToTarget / daysRemaining
  return {
    projected,
    projectedShareOfTarget: projected / kpi.target,
    restOfQuarterAtPace: projected - kpi.actual,
    remainingToTarget,
    incrementalNeeded: Math.max(0, kpi.target - projected),
    projectedSurplus: Math.max(0, projected - kpi.target),
    daysElapsed,
    daysRemaining,
    currentDailyRate,
    requiredDailyRate,
    requiredMultiple: requiredDailyRate / currentDailyRate,
  }
}

/** "2026-09-12" → "Sep 12, 2026". */
export function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
