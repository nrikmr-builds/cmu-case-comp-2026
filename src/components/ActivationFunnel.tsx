import { Fragment } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PRIMACY_DEFINITION, type ActivationFunnel as Funnel } from '../data/checkingHealth'
import { formatPercent1, FUNNEL_STAGES, getNeverActivated, getStageConversion, getTotalFunnel } from '../lib/checkingHealth'
import { formatValue } from '../lib/metrics'
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
      description={`Checking accounts opened in ${quarter}, followed through first deposit, first debit card use (30 days), and primacy (${PRIMACY_DEFINITION}, 90 days). Accounts opened late in the quarter are still inside those windows.`}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-sm border border-critical-line bg-critical-soft p-4">
          <p className="text-sm text-muted">Opened but never activated</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-brand-ink">{formatPercent1(neverActivated.share)}</p>
          <p className="mt-1 text-xs text-muted">
            {accounts(neverActivated.accounts)} of {accounts(total.opened)} new accounts have no debit card use yet.
          </p>
        </div>
        {byChannel.map((c) => (
          <div key={c.channel} className="rounded-sm border border-line bg-surface-subtle p-4">
            <p className="text-sm font-medium text-body">{c.label} · {accounts(c.opened)} opened</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-brand-ink">
              {formatPercent1(c.never.share)} <span className="text-sm font-normal text-muted">never activated</span>
            </p>
            <p className="mt-1 text-xs text-muted">
              {accounts(c.opened - c.activated)} ÷ {accounts(c.opened)} never activated ·{' '}
              <span className="font-medium text-body">{formatPercent1(c.primary / c.opened)} reached primary</span>{' '}
              ({accounts(c.primary)} ÷ {accounts(c.opened)})
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
              <Bar key={c.channel} dataKey={c.label} fill={CHART_COLORS[c.channel]} radius={[0, 3, 3, 0]} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4">
        <FunnelTable channels={channels} />
      </div>

      <p className="mt-4 rounded-sm bg-accent-soft p-4 text-sm text-ink">
        <span className="font-semibold">Insight:</span> {worst.label} opens more accounts, but{' '}
        {formatPercent1(worst.never.share)} of them never activate, against {formatPercent1(best.never.share)} for{' '}
        {best.label.toLowerCase()}.
        {worst.channel === 'branch' &&
          " Branch teams are measured on openings, not activation, so this gap may not show up in today's branch scorecards."}
      </p>
    </SectionCard>
  )
}

interface TableProps {
  channels: Funnel[]
  /** Campaign view: reached at maturity − reached so far, per stage (still inside the window, not failures). */
  maturing?: { activated: number; primary: number; metBonus?: number }
  /** Campaign view: "Met bonus requirement (60 days)" row, shown after Activated. */
  bonusRow?: { label: string; byChannel: number[]; total: number }
}

/** Stage-by-channel funnel table; also used per campaign in the Campaign Tracker. */
export function FunnelTable({ channels, maturing, bonusRow }: TableProps) {
  const total = getTotalFunnel(channels)
  const maturingFor = (key: string) => (key === 'activated' ? maturing?.activated : key === 'primary' ? maturing?.primary : undefined)
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <caption className="sr-only">Accounts and stage-to-stage conversion by channel</caption>
        <thead className="border-b border-line text-xs text-muted">
          <tr>
            <th scope="col" className="py-2 pr-4 font-medium">Stage</th>
            {[...channels.map((c) => c.label), 'Total'].map((label) => (
              <th key={label} scope="col" className="py-2 pr-4 text-right font-medium">{label}</th>
            ))}
            {maturing && <th scope="col" className="py-2 text-right font-medium">Still maturing</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {FUNNEL_STAGES.map(({ key, label }, i) => (
            <Fragment key={key}>
              {key === 'primary' && bonusRow && (
                <tr className="bg-surface-subtle">
                  <th scope="row" className="py-2 pr-4 font-medium text-brand-ink">{bonusRow.label}</th>
                  {[...bonusRow.byChannel, bonusRow.total].map((n, j) => {
                    const opened = j < channels.length ? channels[j].opened : total.opened
                    return (
                      <td key={j} className="py-2 pr-4 text-right tabular-nums">
                        {accounts(n)}
                        <span className="ml-2 text-xs text-muted">{formatPercent1(opened ? n / opened : 0)} of opened</span>
                      </td>
                    )
                  })}
                  {maturing && (
                    <td className="py-2 text-right text-xs text-muted tabular-nums">
                      {maturing.metBonus !== undefined ? `${accounts(maturing.metBonus)} (not failures)` : '—'}
                    </td>
                  )}
                </tr>
              )}
              <tr>
                <th scope="row" className="py-2 pr-4 font-medium text-brand-ink">{label}</th>
                {[...channels, total].map((funnel, j) => (
                  <td key={j} className="py-2 pr-4 text-right tabular-nums">
                    {accounts(funnel[key])}
                    {i > 0 && <span className="ml-2 text-xs text-muted">{formatPercent1(getStageConversion(funnel, i))}</span>}
                  </td>
                ))}
                {maturing && (
                  <td className="py-2 text-right text-xs text-muted tabular-nums">
                    {maturingFor(key) !== undefined ? `${accounts(maturingFor(key) ?? 0)} (not failures)` : '—'}
                  </td>
                )}
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted">
        Small figures show the share of the previous stage that moved on.
        {maturing &&
          ' Still maturing = expected at maturity − reached so far, for accounts still inside the stage window (activation 30 days, bonus requirement 60, primacy 90). Accounts that will never reach a stage are not counted.'}
      </p>
    </div>
  )
}
