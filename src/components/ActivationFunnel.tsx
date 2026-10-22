import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ActivationFunnel as Funnel } from '../data/checkingHealth'
import { FUNNEL_STAGES, getNeverActivated, getStageConversion, getTotalFunnel } from '../lib/checkingHealth'
import { formatPercent, formatValue } from '../lib/metrics'
import { CHART_COLORS } from '../lib/chartColors'
import SectionCard from './SectionCard'

interface Props {
  channels: Funnel[]
  quarter: string
}

const accounts = (n: number) => formatValue(n, 'accounts')

export default function ActivationFunnel({ channels, quarter }: Props) {
  const total = getTotalFunnel(channels)
  const neverActivated = getNeverActivated(total)
  const chartData = FUNNEL_STAGES.map(({ key, label }) => ({
    stage: label,
    ...Object.fromEntries(channels.map((c) => [c.label, c[key]])),
  }))
  const byChannel = channels.map((c) => ({ ...c, never: getNeverActivated(c) }))
  const [worst, best] = [...byChannel].sort((a, b) => b.never.share - a.never.share)

  return (
    <SectionCard
      id="activation-heading"
      title="Activation Funnel · New Accounts"
      source="internal"
      description={`Checking accounts opened in ${quarter}, followed through first deposit, first debit card use (30 days), and primacy (direct deposit + 2 bill payments, 90 days). Accounts opened late in the quarter are still inside those windows.`}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-slate-600">Opened but never activated</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-brand-ink">{formatPercent(neverActivated.share)}</p>
          <p className="mt-1 text-xs text-slate-600">
            {accounts(neverActivated.accounts)} of {accounts(total.opened)} new accounts have no debit card use yet.
          </p>
        </div>
        {byChannel.map((c) => (
          <div key={c.channel} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">{c.label}: never activated</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-brand-ink">{formatPercent(c.never.share)}</p>
            <p className="mt-1 text-xs text-slate-600">
              {accounts(c.opened)} opened · {formatPercent(c.primary / c.opened)} reached primary
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 h-64" role="img" aria-label="Bar chart of accounts at each activation stage, by channel">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} stroke={CHART_COLORS.grid} />
            <XAxis type="number" tickFormatter={accounts} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="stage" width={72} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => accounts(Number(value))} />
            <Legend itemSorter={null} />
            {channels.map((c) => (
              <Bar key={c.channel} dataKey={c.label} fill={CHART_COLORS[c.channel]} radius={[0, 3, 3, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <caption className="sr-only">Accounts and stage-to-stage conversion by channel</caption>
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="py-2 pr-4 font-medium">Stage</th>
              {[...channels.map((c) => c.label), 'Total'].map((label) => (
                <th key={label} scope="col" className="py-2 pr-4 text-right font-medium">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {FUNNEL_STAGES.map(({ key, label }, i) => (
              <tr key={key}>
                <th scope="row" className="py-2 pr-4 font-medium text-brand-ink">{label}</th>
                {[...channels, total].map((funnel, j) => (
                  <td key={j} className="py-2 pr-4 text-right tabular-nums">
                    {accounts(funnel[key])}
                    {i > 0 && (
                      <span className="ml-2 text-xs text-slate-500">{formatPercent(getStageConversion(funnel, i))}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-slate-500">Small figures show the share of the previous stage that moved on.</p>
      </div>

      <p className="mt-4 rounded-md bg-orange-50 p-4 text-sm text-slate-800">
        <span className="font-semibold">Insight:</span> {worst.label} opens more accounts, but{' '}
        {formatPercent(worst.never.share)} of them never activate, against {formatPercent(best.never.share)} for{' '}
        {best.label.toLowerCase()}.
        {worst.channel === 'branch' &&
          " Branch teams are measured on openings, not activation, so this gap may not show up in today's branch scorecards."}
      </p>
    </SectionCard>
  )
}
