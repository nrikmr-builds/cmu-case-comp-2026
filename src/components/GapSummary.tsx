import { formatPercent, formatValue, getExpected, getPaceGap, getPaceRatio, getRemainingToTarget, getStatus } from '../lib/metrics'
import type { Kpi } from '../types'
import StatusBadge from './StatusBadge'

interface Props {
  kpi: Kpi
  quarter: string
  quarterElapsed: number
}

export default function GapSummary({ kpi, quarter, quarterElapsed }: Props) {
  const expected = getExpected(kpi, quarterElapsed)
  const paceGap = getPaceGap(kpi, quarterElapsed)
  const remaining = getRemainingToTarget(kpi)
  const fmt = (n: number) => formatValue(n, kpi.unit)

  return (
    <section aria-labelledby="gap-heading" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="gap-heading" className="text-lg font-semibold text-brand-navy">
          Gap Summary · {kpi.label}
        </h2>
        <StatusBadge status={getStatus(kpi, quarterElapsed)} />
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Target / Current" value={`${fmt(kpi.target)} / ${fmt(kpi.actual)}`} note={`${quarter} full-quarter target`} />
        <Stat
          label={`Expected by now (${formatPercent(quarterElapsed)} of quarter)`}
          value={fmt(expected)}
          note={`Current is ${formatPercent(getPaceRatio(kpi, quarterElapsed))} of expected pace`}
        />
        <Stat label="Pace gap" value={fmt(paceGap)} note="Behind where we should be today" emphasis="pace" />
        <Stat label="Still needed to hit target" value={fmt(remaining)} note="Openings left before quarter end" emphasis="target" />
      </dl>
    </section>
  )
}

interface StatProps {
  label: string
  value: string
  note: string
  emphasis?: 'pace' | 'target'
}

const EMPHASIS_STYLES = {
  pace: 'border-red-200 bg-red-50',
  target: 'border-brand-blue/30 bg-blue-50',
}

function Stat({ label, value, note, emphasis }: StatProps) {
  return (
    <div className={`rounded-lg border p-4 ${emphasis ? EMPHASIS_STYLES[emphasis] : 'border-slate-200 bg-slate-50'}`}>
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums text-brand-navy">{value}</dd>
      <dd className="mt-1 text-xs text-slate-500">{note}</dd>
    </div>
  )
}
