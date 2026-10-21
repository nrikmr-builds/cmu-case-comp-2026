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

/** Everything the opportunity page needs for one product. */
export interface ProductOpportunity {
  productId: ProductId
  /** Short name for headings, e.g. "CD". */
  shortName: string
  /** Completes "Why they might open a …". */
  accountNoun: string
  /** The KPI the page investigates. */
  focusKpiId: string
  segments: CustomerSegment[]
  /** Prewritten caveats for the AI summary, without a trailing period. */
  openQuestions: string
}

/** A dashboard layout: which KPIs to show. Values always come from live data. */
export interface DashboardView {
  id: string
  label: string
  /** The Product Owner's prompt; null for the default view. */
  prompt: string | null
  /** ISO timestamp. */
  createdAt: string
  kpiIds: string[]
}
