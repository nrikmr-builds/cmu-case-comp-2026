import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PRIMACY_DEFINITION, type HealthMix } from '../data/checkingHealth'
import { CHART_COLORS } from '../lib/chartColors'
import {
  formatPercent1,
  formatSignedCount,
  getClosureRate,
  getDirectDepositNotPrimary,
  getDirectDepositRate,
  getNetAccountChange,
  getDormancyRate,
  getHealthTotal,
  getNewDormancyRate,
  getPrimacyRate,
} from '../lib/checkingHealth'
import { formatValue } from '../lib/metrics'
import SectionCard from './SectionCard'

interface Props {
  /** Oldest first; the last entry is the current quarter. */
  history: HealthMix[]
  accountsWithDirectDeposit: number
  /** New accounts opened this quarter (the openings KPI). */
  openedThisQuarter: number
  closedThisQuarter: number
  newlyDormantThisQuarter: number
}

const TIERS = [
  { key: 'primary', label: 'Primary', note: `${PRIMACY_DEFINITION[0].toUpperCase()}${PRIMACY_DEFINITION.slice(1)}` },
  { key: 'active', label: 'Active', note: 'Regular use, not Primary (may have a direct deposit but fewer than 2 bill payments)' },
  { key: 'slipping', label: 'Slipping', note: 'Activity falling' },
  { key: 'dormant', label: 'Dormant', note: 'No customer activity 90+ days' },
] as const

export default function AccountHealthMix({
  history,
  accountsWithDirectDeposit,
  openedThisQuarter,
  closedThisQuarter,
  newlyDormantThisQuarter,
}: Props) {
  const current = history[history.length - 1]
  const previous = history[history.length - 2]
  const first = history[0]
  // Shares, not counts, so the trend reads the same even as the account base grows.
  const chartData = history.map((mix) => ({
    quarter: mix.quarter,
    ...Object.fromEntries(TIERS.map(({ key, label }) => [label, mix[key] / getHealthTotal(mix)])),
  }))
  const accounts = (n: number) => formatValue(n, 'accounts')
  const currentTotal = getHealthTotal(current)
  const startTotal = getHealthTotal(previous)
  const netChange = getNetAccountChange(openedThisQuarter, closedThisQuarter)
  const ddNotPrimary = getDirectDepositNotPrimary(accountsWithDirectDeposit, current)

  const tiles: { label: string; value: string; note: string; negative?: boolean }[] = [
    {
      label: 'Primacy rate',
      value: formatPercent1(getPrimacyRate(current)),
      note: `Primary tier (${PRIMACY_DEFINITION}): ${accounts(current.primary)} ÷ ${accounts(currentTotal)} open accounts`,
    },
    {
      label: 'Direct-deposit rate',
      value: formatPercent1(getDirectDepositRate(accountsWithDirectDeposit, current)),
      note: `Any direct deposit: ${accounts(accountsWithDirectDeposit)} ÷ ${accounts(currentTotal)}. That's ${accounts(current.primary)} Primary + ${accounts(ddNotPrimary)} Active with direct deposit but fewer than 2 bill payments`,
    },
    {
      label: 'Net account change (this quarter)',
      value: formatSignedCount(netChange),
      note: `Openings − closures = ${accounts(openedThisQuarter)} − ${accounts(closedThisQuarter)}. Check: ${accounts(startTotal)} at quarter start ${formatSignedCount(netChange)} = ${accounts(startTotal + netChange)} open now`,
      negative: netChange < 0,
    },
    {
      label: '90-day dormancy rate',
      value: formatPercent1(getDormancyRate(current)),
      note: `${accounts(current.dormant)} ÷ ${accounts(currentTotal)}; ${formatPercent1(getDormancyRate(first))} in ${first.quarter}`,
    },
    {
      label: 'Closure rate (this quarter)',
      value: formatPercent1(getClosureRate(closedThisQuarter, previous)),
      note: `${accounts(closedThisQuarter)} closed ÷ ${accounts(startTotal)} open at quarter start`,
    },
    {
      label: 'New dormancy (this quarter)',
      value: formatPercent1(getNewDormancyRate(newlyDormantThisQuarter, previous)),
      note: `${accounts(newlyDormantThisQuarter)} went dormant ÷ ${accounts(startTotal)} open at quarter start`,
    },
  ]

  return (
    <SectionCard
      id="health-heading"
      title="Account Health Mix · All Open Accounts"
      source="internal"
      description={`Every open checking account sorted into four health tiers at the end of each of the last ${history.length} quarters (${current.quarter}: latest snapshot, ${accounts(currentTotal)} open accounts).`}
    >
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className={`rounded-lg border p-4 ${t.negative ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
            <dt className="text-sm text-slate-600">{t.label}</dt>
            <dd className={`mt-1 text-2xl font-semibold tabular-nums ${t.negative ? 'text-red-700' : 'text-brand-ink'}`}>{t.value}</dd>
            <dd className="mt-1 text-xs text-slate-500">{t.note}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 h-72" role="img" aria-label="Stacked bar chart of the health tier mix by quarter">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ left: 0, right: 8 }}>
            <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
            <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v: number) => `${Math.round(v * 100)}%`} tick={{ fontSize: 12 }} width={48} domain={[0, 1]} />
            <Tooltip
              formatter={(value, name) => [
                formatPercent1(Number(value)),
                `${name}: ${TIERS.find((t) => t.label === name)?.note ?? ''}`,
              ]}
            />
            <Legend itemSorter={null} />
            {TIERS.map(({ key, label }) => (
              <Bar key={key} dataKey={label} stackId="mix" fill={CHART_COLORS[key]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
        {TIERS.map((t) => (
          <li key={t.key}>
            <span className="font-medium text-slate-700">{t.label}:</span> {t.note}
          </li>
        ))}
      </ul>

      <p className="mt-4 rounded-md bg-orange-50 p-4 text-sm text-slate-800">
        <span className="font-semibold">Insight:</span> The primacy rate (Primary tier: {PRIMACY_DEFINITION}) went from{' '}
        {formatPercent1(getPrimacyRate(first))} to {formatPercent1(getPrimacyRate(current))} of open accounts over{' '}
        {history.length} quarters, and dormancy from {formatPercent1(getDormancyRate(first))} to{' '}
        {formatPercent1(getDormancyRate(current))}. The headline Active Account Rate counts Primary and Active together
        ({formatPercent1((current.primary + current.active) / currentTotal)}), so it can hold steady while accounts lose
        their paycheck. The account base also shrank: {accounts(openedThisQuarter)} opened − {accounts(closedThisQuarter)}{' '}
        closed = <span className="font-semibold text-red-700">{formatSignedCount(netChange)}</span> accounts this quarter.
      </p>
    </SectionCard>
  )
}
