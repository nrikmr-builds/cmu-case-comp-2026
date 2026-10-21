// Simulated AI: turns a Product Owner's prompt into a dashboard view with keyword rules, so the demo
// runs offline. A real model could replace generateView without changing its callers.
import { products, reportingPeriod } from '../data/productMetrics'
import type { DashboardView, Kpi, KpiStatus, ProductId } from '../types'
import { getStatus } from './metrics'

const PRODUCT_RULES: { id: ProductId; name: string; pattern: RegExp }[] = [
  { id: 'checking', name: 'Checking', pattern: /checking/i },
  { id: 'savings', name: 'Savings', pattern: /savings/i },
  { id: 'cd', name: 'CD', pattern: /\bcds?\b|certificate/i },
]

const TOPIC_RULES: { name: string; pattern: RegExp; matches: (kpi: Kpi) => boolean }[] = [
  { name: 'Account openings', pattern: /open|acquisition|new account|sign[- ]?up/i, matches: (k) => k.id.endsWith('new-accounts') },
  { name: 'Deposit growth', pattern: /deposit|balance|dollar|\$/i, matches: (k) => k.unit === 'usd' },
  { name: 'Digital adoption', pattern: /digital|online|mobile/i, matches: (k) => /digital/i.test(k.label) },
  { name: 'Renewals', pattern: /renew|retention|retain/i, matches: (k) => /renewal/i.test(k.label) },
  { name: 'Account activity', pattern: /\bactiv|engag|usage/i, matches: (k) => /active/i.test(k.label) },
]

/** First match wins, so the more specific phrasing comes first. */
const STATUS_RULES: { name: string; pattern: RegExp; statuses: KpiStatus[] }[] = [
  { name: 'At risk', pattern: /risk/i, statuses: ['at-risk'] },
  { name: 'Behind pace', pattern: /behind|lagging|underperform|off[- ]track|struggl|problem/i, statuses: ['at-risk', 'watch'] },
  { name: 'Watch list', pattern: /watch/i, statuses: ['watch'] },
  { name: 'On track', pattern: /on[- ]track|ahead|healthy|outperform/i, statuses: ['on-track'] },
]

const ALL_KPI_IDS = products.flatMap((p) => p.kpis.map((k) => k.id))

export const DEFAULT_VIEW: DashboardView = {
  id: 'default',
  label: 'Full portfolio',
  prompt: null,
  createdAt: '2026-09-01T09:00:00',
  kpiIds: ALL_KPI_IDS,
}

/** Returns null when the prompt names no product, topic, or status, or nothing matches. */
export function generateView(
  prompt: string,
  { id = `view-${Date.now()}`, createdAt = new Date().toISOString() } = {},
): DashboardView | null {
  // "Certificate of deposit" names a product, not the deposits topic.
  const text = prompt.replace(/certificates? of deposits?/gi, 'CD')
  const productRules = PRODUCT_RULES.filter((r) => r.pattern.test(text))
  const topicRules = TOPIC_RULES.filter((r) => r.pattern.test(text))
  const statusRule = STATUS_RULES.find((r) => r.pattern.test(text))
  if (productRules.length === 0 && topicRules.length === 0 && !statusRule) return null

  const kpiIds = products
    .filter((p) => productRules.length === 0 || productRules.some((r) => r.id === p.id))
    .flatMap((p) => p.kpis)
    .filter((k) => topicRules.length === 0 || topicRules.some((r) => r.matches(k)))
    .filter((k) => !statusRule || statusRule.statuses.includes(getStatus(k, reportingPeriod.quarterElapsed)))
    .map((k) => k.id)
  if (kpiIds.length === 0) return null

  const topicLabel = topicRules.map((r) => r.name).join(' & ')
  const productLabel = productRules.map((r) => r.name).join(' & ')
  const label = [topicLabel, statusRule?.name, productLabel].filter(Boolean).join(' · ')

  return { id, label, prompt: prompt.trim(), createdAt, kpiIds }
}
