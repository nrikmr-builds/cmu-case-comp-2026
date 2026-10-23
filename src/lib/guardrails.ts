// Contact guardrails that apply to EVERY campaign, personalised or blanket: never market to customers in hardship
// or with an open complaint, and at most one offer per 30 days. Reads only the synthetic customer rows, so the
// campaign economics and the next-best-action rules share one definition.
import { nbaCustomers, type NbaCustomer } from '../data/nbaCustomers'
import { reportingPeriod } from '../data/productMetrics'

/** Contact frequency cap: at most one offer per this many days. */
export const CONTACT_CAP_DAYS = 30

const daysBetween = (fromIso: string, toIso: string) =>
  Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000)

/** R0: hardship or an open complaint → service outreach, never an offer. */
export const isSuppressed = (c: NbaCustomer) => c.hardship || c.complaint

/** R1: contacted within the cap window. */
export const isRecentlyContacted = (c: NbaCustomer) =>
  c.lastContacted !== null && daysBetween(c.lastContacted, reportingPeriod.internalAsOf) < CONTACT_CAP_DAYS

/** Risk segments with customer-level rows, where guardrails can be applied to the audience up front. */
const ROWS_BY_SEGMENT: Record<string, NbaCustomer[]> = { 'direct-deposit-leaving': nbaCustomers }

export interface GuardrailAudience {
  total: number
  /** R0, checked first. */
  suppressed: number
  /** R1 among the rest (first match wins, as in the rules table). */
  recentlyContacted: number
  eligible: number
}

// The rows are fixed, so each segment is counted once and reused (the builder asks on every render).
const audienceCache = new Map<string, GuardrailAudience>()

/** Audience after guardrails for a risk segment, or undefined when there are no rows (guardrails apply at send time). */
export function guardrailAudience(segmentId: string): GuardrailAudience | undefined {
  const rows = ROWS_BY_SEGMENT[segmentId]
  if (!rows) return undefined
  const cached = audienceCache.get(segmentId)
  if (cached) return cached
  const suppressed = rows.filter(isSuppressed).length
  const recentlyContacted = rows.filter((c) => !isSuppressed(c) && isRecentlyContacted(c)).length
  const result = { total: rows.length, suppressed, recentlyContacted, eligible: rows.length - suppressed - recentlyContacted }
  audienceCache.set(segmentId, result)
  return result
}

/** The eligible customers themselves (passed both guardrails). */
export function eligibleRows(segmentId: string): NbaCustomer[] {
  return (ROWS_BY_SEGMENT[segmentId] ?? []).filter((c) => !isSuppressed(c) && !isRecentlyContacted(c))
}
