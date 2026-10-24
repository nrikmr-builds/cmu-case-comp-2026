// Reference points from past quarters for the conversion-rate sliders.
// Rates are rounded to 0.1% before any math, so every figure on screen can be redone by hand
// from the rate shown next to it (e.g. 6,000 × 18.0% = 1,080).
import type { SegmentQuarter } from '../data/segmentHistory'
import type { CustomerSegment } from '../types'

/** Rate in whole tenths of a percent (0.0798 → 80), so rounding and averaging stay exact. */
const toTenths = (rate: number) => Math.round(rate * 1000)
const fromTenths = (tenths: number) => tenths / 1000

/** Converted ÷ eligible, rounded to 0.1%. */
export function getQuarterRate(q: SegmentQuarter): number {
  return fromTenths(toTenths(q.converted / q.eligible))
}

export interface RateReference {
  /** Most recent completed quarter. */
  last: { quarter: string; rate: number }
  /** Simple average of the quarterly rates shown, rounded to 0.1%. */
  average: number
  min: number
  max: number
  quarters: number
}

/** Summarizes past conversion rates; undefined when a segment has no history yet. */
export function getRateReference(history: SegmentQuarter[] | undefined): RateReference | undefined {
  if (!history || history.length === 0) return undefined
  const tenths = history.map((q) => toTenths(getQuarterRate(q)))
  const latest = history[history.length - 1]
  return {
    last: { quarter: latest.quarter, rate: getQuarterRate(latest) },
    average: fromTenths(Math.round(tenths.reduce((sum, t) => sum + t, 0) / tenths.length)),
    min: fromTenths(Math.min(...tenths)),
    max: fromTenths(Math.max(...tenths)),
    quarters: history.length,
  }
}

/** Where an assumption sits against the historical range. */
export function compareToHistory(rate: number, ref: RateReference): 'above' | 'below' | 'within' {
  const tenths = toTenths(rate)
  if (tenths > toTenths(ref.max)) return 'above'
  if (tenths < toTenths(ref.min)) return 'below'
  return 'within'
}

/** Eligible × last quarter's (displayed) rate. */
export function getLastQuarterPotential(segment: CustomerSegment, ref: RateReference): number {
  return Math.round(segment.eligibleCustomers * ref.last.rate)
}

export interface HistoricalOpportunity {
  /** Σ eligible × last-quarter rate, over segments that have history. */
  totalAtLastQuarter: number
  /** Every segment has history, so the total covers all of them. */
  complete: boolean
  largest?: CustomerSegment
  highestRate?: { segment: CustomerSegment; rate: number }
  /** Segments whose slider is outside its historical range. */
  outsideHistory: { segment: CustomerSegment; direction: 'above' | 'below' }[]
}

export function getHistoricalOpportunity(
  segments: CustomerSegment[],
  history: Record<string, SegmentQuarter[]>,
): HistoricalOpportunity {
  const withRef = segments.flatMap((s) => {
    const ref = getRateReference(history[s.id])
    return ref ? [{ segment: s, ref, potential: getLastQuarterPotential(s, ref) }] : []
  })
  const largest = withRef.reduce<(typeof withRef)[number] | undefined>((best, x) => (!best || x.potential > best.potential ? x : best), undefined)
  const highest = withRef.reduce<(typeof withRef)[number] | undefined>((best, x) => (!best || x.ref.last.rate > best.ref.last.rate ? x : best), undefined)
  return {
    totalAtLastQuarter: withRef.reduce((sum, x) => sum + x.potential, 0),
    complete: withRef.length === segments.length,
    largest: largest?.segment,
    highestRate: highest && { segment: highest.segment, rate: highest.ref.last.rate },
    outsideHistory: withRef.flatMap(({ segment, ref }) => {
      const direction = compareToHistory(segment.estimatedConversionRate, ref)
      return direction === 'within' ? [] : [{ segment, direction }]
    }),
  }
}

/** Conversion rates always show one decimal (8.0%, 18.0%) so the math beside them checks out. */
export function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`
}
