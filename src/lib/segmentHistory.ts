// Reference points from past quarters for the conversion-rate sliders.
import type { SegmentQuarter } from '../data/segmentHistory'

export function getQuarterRate(q: SegmentQuarter): number {
  return q.converted / q.eligible
}

export interface RateReference {
  /** Most recent completed quarter. */
  last: { quarter: string; rate: number }
  /** Pooled rate across all quarters (total converted ÷ total eligible). */
  average: number
  min: number
  max: number
  quarters: number
}

/** Summarizes past conversion rates; undefined when a segment has no history yet. */
export function getRateReference(history: SegmentQuarter[] | undefined): RateReference | undefined {
  if (!history || history.length === 0) return undefined
  const rates = history.map(getQuarterRate)
  const latest = history[history.length - 1]
  const total = (key: 'eligible' | 'converted') => history.reduce((sum, q) => sum + q[key], 0)
  return {
    last: { quarter: latest.quarter, rate: getQuarterRate(latest) },
    average: total('converted') / total('eligible'),
    min: Math.min(...rates),
    max: Math.max(...rates),
    quarters: history.length,
  }
}

/** Where an assumption sits against the historical range. */
export function compareToHistory(rate: number, ref: RateReference): 'above' | 'below' | 'within' {
  // Small tolerance so a slider step landing on a rounded max isn't flagged.
  const tolerance = 0.0005
  if (rate > ref.max + tolerance) return 'above'
  if (rate < ref.min - tolerance) return 'below'
  return 'within'
}
