import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { HealthMix } from '../data/checkingHealth'
import { CHART_COLORS } from '../lib/chartColors'
import { getAttritionRate, getDormancyRate, getHealthTotal, getPrimacyRate } from '../lib/checkingHealth'
import { formatPercent, formatValue } from '../lib/metrics'
import SectionCard from './SectionCard'

interface Props {
  /** Oldest first; the last entry is the current quarter. */
  history: HealthMix[]
  accountsWithDirectDeposit: number
  closedThisQuarter: number
  newlyDormantThisQuarter: number
}

const TIERS = [
  { key: 'primary', label: 'Primary', note: 'Direct deposit + bill payments' },
  { key: 'active', label: 'Active', note: 'Regular use, no direct deposit' },
  { key: 'slipping', label: 'Slipping', note: 'Activity falling' },
  { key: 'dormant', label: 'Dormant', note: 'No customer activity 90+ days' },
] as const

export default function AccountHealthMix({ history, accountsWithDirectDeposit, closedThisQuarter, newlyDormantThisQuarter }: Props) {
  const current = history[history.length - 1]
  const previous = history[history.length - 2]
  const first = history[0]
  // Shares, not counts, so the trend reads the same even as the account base grows.
  const chartData = history.map((mix) => ({
    quarter: mix.quarter,
    ...Object.fromEntries(TIERS.map(({ key, label }) => [label, mix[key] / getHealthTotal(mix)])),
  }))
  const primaryShare = (mix: HealthMix) => mix.primary / getHealthTotal(mix)

  const tiles = [
    {
      label: 'Primacy rate',
      value: formatPercent(getPrimacyRate(accountsWithDirectDeposit, current)),
      note: 'Open accounts with a direct deposit',
    },
    {
      label: '90-day dormancy rate',
      value: formatPercent(getDormancyRate(current)),
      note: `${formatPercent(getDormancyRate(first))} in ${first.quarter}`,
    },
    {
      label: 'Attrition rate',
      value: formatPercent(getAttritionRate(closedThisQuarter, newlyDormantThisQuarter, previous)),
      note: `${formatValue(closedThisQuarter, 'accounts')} closed + ${formatValue(newlyDormantThisQuarter, 'accounts')} newly dormant this quarter`,
    },
  ]

  return (
    <SectionCard
      id="health-heading"
      title="Account Health Mix · All Open Accounts"
      source="internal"
      description={`Every open checking account sorted into four health tiers at quarter end, for the last ${history.length} quarters.`}
    >
      <dl className="grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <dt className="text-sm text-slate-600">{t.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-brand-ink">{t.value}</dd>
            <dd className="mt-1 text-xs text-slate-500">{t.note}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 h-72" role="img" aria-label="Stacked bar chart of the health tier mix by quarter">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ left: 0, right: 8 }}>
            <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
            <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v: number) => formatPercent(v)} tick={{ fontSize: 12 }} width={48} domain={[0, 1]} />
            <Tooltip formatter={(value) => formatPercent(Number(value))} />
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
        <span className="font-semibold">Insight:</span> The Primary tier went from {formatPercent(primaryShare(first))} to{' '}
        {formatPercent(primaryShare(current))} of accounts over {history.length} quarters, and dormancy from{' '}
        {formatPercent(getDormancyRate(first))} to {formatPercent(getDormancyRate(current))}. The headline active-account
        rate counts Primary and Active together, so it can hold steady while accounts lose their paycheck.
      </p>
    </SectionCard>
  )
}
