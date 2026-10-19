export type ProductId = 'checking' | 'savings' | 'cd'

export type KpiStatus = 'on-track' | 'watch' | 'at-risk'

/**
 * cumulative: grows through the quarter (account openings, deposits), so it is
 *             judged against the expected pace.
 * rate:       a percentage (completion rate, renewal rate), so it is judged
 *             directly against the target.
 */
export type KpiKind = 'cumulative' | 'rate'

/** Rates are stored as fractions (0.75 = 75%); currency as whole dollars. */
export type KpiUnit = 'accounts' | 'usd' | 'percent'

export interface Kpi {
  id: string
  productId: ProductId
  label: string
  kind: KpiKind
  unit: KpiUnit
  target: number
  actual: number
}

export interface Product {
  id: ProductId
  name: string
  description: string
  kpis: Kpi[]
}

export interface ReportingPeriod {
  quarter: string
  /** Fraction of the quarter that has passed, 0–1. */
  quarterElapsed: number
}

export interface CustomerSegment {
  id: string
  name: string
  whyRelevant: string
  consideration: string
  eligibleCustomers: number
  /** Fraction, 0–1. */
  estimatedConversionRate: number
}
