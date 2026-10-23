import { formatPercent, formatValue, getExpected, getPaceGap, getPaceRatio, getStatus } from '../lib/metrics'
import { getPaceProjection } from '../lib/projection'
import type { Kpi, ReportingPeriod } from '../types'
import StatusBadge from './StatusBadge'

interface Props {
  kpi: Kpi
  period: ReportingPeriod
}

const days = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 })

export default function GapSummary({ kpi, period }: Props) {
  const { quarter, quarterElapsed } = period
  const expected = getExpected(kpi, quarterElapsed)
  const paceGap = getPaceGap(kpi, quarterElapsed)
  const paceSurplus = Math.max(0, kpi.actual - expected)
  const p = getPaceProjection(kpi, period)
  const fmt = (n: number) => formatValue(n, kpi.unit)
  const perDay = (n: number) => `${fmt(n)}/day`

  return (
    <section aria-labelledby="gap-heading" className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id="gap-heading" className="heading-accent text-lg font-semibold text-brand-ink">
          Gap Summary · {kpi.label}
        </h2>
        <StatusBadge status={getStatus(kpi, quarterElapsed)} />
      </div>

      <h3 className="mt-5 text-xs font-semibold tracking-wide text-slate-500 uppercase">Where we are today</h3>
      <dl className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Current / Target" value={`${fmt(kpi.actual)} / ${fmt(kpi.target)}`} note={`${quarter} full-quarter target`} />
        <Stat
          label={`Expected by now (${formatPercent(quarterElapsed)} of quarter)`}
          value={fmt(expected)}
          note={`${fmt(kpi.target)} × ${formatPercent(quarterElapsed)}. Current is ${formatPercent(getPaceRatio(kpi, quarterElapsed))} of this.`}
        />
        {paceGap > 0 ? (
          <Stat label="Pace gap" value={fmt(paceGap)} note={`${fmt(expected)} − ${fmt(kpi.actual)}: behind where we should be today`} emphasis="pace" />
        ) : (
          <Stat label="Ahead of pace" value={fmt(paceSurplus)} note={`${fmt(kpi.actual)} − ${fmt(expected)}: above where we should be today`} emphasis="ahead" />
        )}
        <Stat
          label="Still needed to hit target"
          value={fmt(p.remainingToTarget)}
          note={`${fmt(kpi.target)} − ${fmt(kpi.actual)}: openings left before quarter end`}
          emphasis="target"
        />
      </dl>

      <h3 className="mt-6 text-xs font-semibold tracking-wide text-slate-500 uppercase">If today's pace continues to quarter end</h3>
      <dl className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Projected at current pace"
          value={fmt(p.projected)}
          note={`${fmt(kpi.actual)} ÷ ${formatPercent(quarterElapsed)} of quarter elapsed; ${formatPercent(p.projectedShareOfTarget)} of the ${fmt(kpi.target)} target`}
        />
        <Stat
          label="Expected from current pace, rest of quarter"
          value={fmt(p.restOfQuarterAtPace)}
          note={`${fmt(p.projected)} − ${fmt(kpi.actual)}: what today's pace still adds`}
        />
        {p.incrementalNeeded > 0 ? (
          <Stat
            label="Incremental needed beyond current pace"
            value={fmt(p.incrementalNeeded)}
            note={`${fmt(kpi.target)} − ${fmt(p.projected)}: must come from new effort`}
            emphasis="pace"
          />
        ) : (
          <Stat
            label="Projected above target"
            value={fmt(p.projectedSurplus)}
            note={`${fmt(p.projected)} − ${fmt(kpi.target)}: no incremental gap at current pace`}
            emphasis="ahead"
          />
        )}
        <Stat
          label="Required vs. current daily pace"
          value={`${p.requiredMultiple.toFixed(1)}×`}
          note={`Need ${perDay(p.requiredDailyRate)} (${fmt(p.remainingToTarget)} ÷ ${days(p.daysRemaining)} days left) vs. ${perDay(p.currentDailyRate)} so far (${fmt(kpi.actual)} ÷ ${days(p.daysElapsed)} days)`}
          emphasis={p.requiredMultiple > 1 ? 'target' : 'ahead'}
        />
      </dl>
    </section>
  )
}

interface StatProps {
  label: string
  value: string
  note: string
  emphasis?: 'pace' | 'ahead' | 'target'
}

const EMPHASIS_STYLES = {
  pace: 'border-red-200 bg-red-50',
  ahead: 'border-green-200 bg-green-50',
  target: 'border-brand-blue/30 bg-blue-50',
}

function Stat({ label, value, note, emphasis }: StatProps) {
  return (
    <div className={`rounded-lg border p-4 ${emphasis ? EMPHASIS_STYLES[emphasis] : 'border-slate-200 bg-slate-50'}`}>
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums text-brand-ink">{value}</dd>
      <dd className="mt-1 text-xs text-slate-500">{note}</dd>
    </div>
  )
}
