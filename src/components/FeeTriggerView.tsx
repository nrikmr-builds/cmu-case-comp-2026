import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { FeeCohort } from '../data/checkingHealth'
import { CHART_COLORS } from '../lib/chartColors'
import { formatUsd, getClosureRate, getExcessFeeClosures } from '../lib/checkingHealth'
import { formatPercent, formatValue } from '../lib/metrics'
import SectionCard from './SectionCard'

interface Props {
  feeGroup: FeeCohort
  baseline: FeeCohort
  monthlyFee: number
}

export default function FeeTriggerView({ feeGroup, baseline, monthlyFee }: Props) {
  const chartData = [feeGroup, baseline].map((c) => ({ label: c.label, rate: getClosureRate(c), id: c.id }))
  const excessClosures = getExcessFeeClosures(feeGroup, baseline)
  const firstFeeRevenue = feeGroup.accounts * monthlyFee

  return (
    <SectionCard
      id="fee-heading"
      title="Fee Trigger · Closures After the First Fee"
      source="internal"
      description={`Share of accounts closed within 60 days of their first ${formatUsd(monthlyFee)} maintenance fee, compared with accounts that were not charged.`}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-56" role="img" aria-label="Bar chart comparing 60-day closure rates with and without a first fee">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 8, left: 0, right: 48 }}>
              <CartesianGrid horizontal={false} stroke={CHART_COLORS.grid} />
              <XAxis type="number" tickFormatter={(v: number) => formatPercent(v)} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [formatPercent(Number(value)), 'Closed within 60 days']} />
              <Bar dataKey="rate" maxBarSize={40} radius={[0, 3, 3, 0]}>
                {chartData.map((d) => (
                  <Cell key={d.id} fill={d.id === 'first-fee' ? CHART_COLORS.feeGroup : CHART_COLORS.baseline} />
                ))}
                <LabelList dataKey="rate" position="right" formatter={(v) => formatPercent(Number(v))} fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3 text-sm">
          <p className="text-slate-700">
            {formatValue(feeGroup.accounts, 'accounts')} accounts paid a first fee this quarter, and{' '}
            {formatPercent(getClosureRate(feeGroup))} of them closed within 60 days, against{' '}
            {formatPercent(getClosureRate(baseline))} of accounts with no fee.
          </p>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-brand-ink">Trade-off</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
              <li>
                First fees this quarter brought in about <strong>{formatUsd(firstFeeRevenue)}</strong>.
              </li>
              <li>
                About <strong>{formatValue(excessClosures, 'accounts')}</strong> more accounts closed than the no-fee rate
                would predict.
              </li>
              <li>Whether the fee pays off depends on each closed account's longer-term value, which this view does not include.</li>
            </ul>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}
