// PLACEHOLDER DATA: synthetic values until the team confirms the final KPIs.
// Both pages read from this file, so update numbers here only.
import type { Kpi, Product, ReportingPeriod } from '../types'
import { healthMixHistory, PRIMACY_DEFINITION } from './checkingHealth'

export const reportingPeriod: ReportingPeriod = {
  quarter: 'Q3 2026',
  quarterElapsed: 0.8,
  // Q3 = Jul 1 – Sep 30. 80% of 92 days ≈ day 74, which is Sep 12.
  quarterDays: 92,
  internalAsOf: '2026-09-12',
}

// Checking rate KPIs come from the account health mix so both pages show the same numbers.
const latestHealth = healthMixHistory[healthMixHistory.length - 1]
const latestHealthTotal = latestHealth.primary + latestHealth.active + latestHealth.slipping + latestHealth.dormant

export const products: Product[] = [
  {
    id: 'checking',
    name: 'Checking',
    description: 'Everyday transaction accounts',
    kpis: [
      { id: 'checking-new-accounts', productId: 'checking', label: 'New Account Openings', kind: 'cumulative', unit: 'accounts', target: 12000, actual: 7600 },
      {
        id: 'checking-digital-completion', productId: 'checking', label: 'Digital Opening Completion Rate', kind: 'rate', unit: 'percent', target: 0.75, actual: 0.69,
        related: { label: 'Linked segment: Abandoned Digital Applications', to: '/opportunities/checking/diagnose#segment-abandoned-digital' },
      },
      {
        id: 'checking-active-rate', productId: 'checking', label: 'Active Account Rate', kind: 'rate', unit: 'percent', target: 0.85,
        actual: (latestHealth.primary + latestHealth.active) / latestHealthTotal,
        definition: 'Primary + Active tiers, all open accounts',
      },
      {
        id: 'checking-primacy-rate', productId: 'checking', label: 'Primacy Rate', kind: 'rate', unit: 'percent', target: 0.5,
        introducedOn: '2026-09-12',
        actual: latestHealth.primary / latestHealthTotal,
        definition: `Open accounts with ${PRIMACY_DEFINITION}`,
        related: { label: 'See account health mix', to: '/opportunities/checking/diagnose#health-heading' },
      },
    ],
  },
  {
    id: 'savings',
    name: 'Savings',
    description: 'Interest-bearing deposit accounts',
    kpis: [
      { id: 'savings-new-accounts', productId: 'savings', label: 'New Account Openings', kind: 'cumulative', unit: 'accounts', target: 8000, actual: 7100 },
      { id: 'savings-net-deposits', productId: 'savings', label: 'Net New Deposits', kind: 'cumulative', unit: 'usd', target: 40_000_000, actual: 36_000_000 },
      { id: 'savings-digital-enrollment', productId: 'savings', label: 'Digital Enrollment Rate', kind: 'rate', unit: 'percent', target: 0.7, actual: 0.73 },
    ],
  },
  {
    id: 'cd',
    name: 'Certificates of Deposit',
    description: 'Time-bound deposits with defined maturity periods',
    kpis: [
      { id: 'cd-new-accounts', productId: 'cd', label: 'New CD Account Openings', kind: 'cumulative', unit: 'accounts', target: 5000, actual: 4100 },
      { id: 'cd-renewal-rate', productId: 'cd', label: 'CD Renewal Rate', kind: 'rate', unit: 'percent', target: 0.65, actual: 0.67 },
      { id: 'cd-net-deposits', productId: 'cd', label: 'Net New CD Deposits', kind: 'cumulative', unit: 'usd', target: 25_000_000, actual: 22_000_000 },
    ],
  },
]

export function getKpi(id: string): Kpi {
  const kpi = products.flatMap((p) => p.kpis).find((k) => k.id === id)
  if (!kpi) throw new Error(`Unknown KPI: ${id}`)
  return kpi
}

