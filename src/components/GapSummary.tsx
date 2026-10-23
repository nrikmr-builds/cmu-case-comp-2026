import { getHeadlineProjection, getWeeklyPace } from '../lib/dailyTracking'
import { againstReforecast, reforecastLabel, useReforecast } from '../lib/reforecastStore'
import { formatPercent, formatValue, getExpected, getPaceGap, getPaceRatio, getStatus } from '../lib/metrics'
import type { PaceProjection } from '../lib/projection'
import type { Kpi, ReportingPeriod } from '../types'
import StatusBadge from './StatusBadge'

interface Props {
  kpi: Kpi
  period: ReportingPeriod
}

const days = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 })
const STATUS_TEXT = { 'on-track': 'On Track', watch: 'Watch', 'at-risk': 'At Risk' } as const

export default function GapSummary({ kpi, period }: Props) {
  const { quarter, quarterElapsed } = period
  const expected = getExpected(kpi, quarterElapsed)
  const paceGap = getPaceGap(kpi, quarterElapsed)
  const paceSurplus = Math.max(0, kpi.actual - expected)
  const { basis, projection: headline, average } = getHeadlineProjection(kpi)
  const fmt = (n: number) => formatValue(n, kpi.unit)
  const weekly = basis === 'last-7-day' ? getWeeklyPace() : undefined
  const { reforecast } = useReforecast()
  const rf = reforecast && reforecast.kpiId === kpi.id ? againstReforecast(kpi, reforecast) : null

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
          value={fmt(headline.remainingToTarget)}
          note={`${fmt(kpi.target)} − ${fmt(kpi.actual)}: openings left before quarter end`}
          emphasis="target"
        />
      </dl>

      {weekly && (
        <ProjectionRow
          kpi={kpi}
          p={headline}
          title={`At last-7-day pace (${Math.round(headline.paceDailyRate)}/day) · conservative headline`}
          paceFormula={`${fmt(weekly.weekTotal)} ÷ 7`}
          headline
        />
      )}
      {rf && reforecast && (
        <>
          <h3 className="mt-6 text-xs font-semibold tracking-wide text-brand-ink uppercase">
            Original target vs. {reforecastLabel(reforecast)}
          </h3>
          <dl className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Original target (unchanged)" value={fmt(kpi.target)} note={`${formatPercent(getPaceRatio(kpi, quarterElapsed))} of pace · ${STATUS_TEXT[getStatus(kpi, quarterElapsed)]}`} />
            <Stat label="Re-forecast target" value={fmt(rf.target)} note={`Expected by now ${fmt(rf.expected)} (× ${formatPercent(quarterElapsed)})`} emphasis="target" />
            <Stat
              label="Pace vs. re-forecast"
              value={formatPercent(rf.paceRatio)}
              note={`${fmt(kpi.actual)} ÷ ${fmt(rf.expected)} · ${STATUS_TEXT[rf.status]}`}
              emphasis={rf.status === 'on-track' ? 'ahead' : 'pace'}
            />
            <Stat
              label="Beyond last-7-day pace, vs. re-forecast"
              value={fmt(Math.max(0, rf.target - headline.projected))}
              note={`${fmt(rf.target)} − ${fmt(headline.projected)} (vs. ${fmt(headline.incrementalNeeded)} for the original)`}
            />
          </dl>
        </>
      )}
      <ProjectionRow
        kpi={kpi}
        p={average}
        title={`At quarter-average pace (${Math.round(average.paceDailyRate)}/day)${weekly ? ' · reference' : ''}`}
        paceFormula={`${fmt(kpi.actual)} ÷ ${days(average.daysElapsed)} days`}
        headline={!weekly}
      />
    </section>
  )
}

interface RowProps {
  kpi: Kpi
  p: PaceProjection
  title: string
  /** How the daily pace was computed, e.g. "487 ÷ 7". */
  paceFormula: string
  /** The headline row gets stronger emphasis; the reference row is muted. */
  headline: boolean
}

function ProjectionRow({ kpi, p, title, paceFormula, headline }: RowProps) {
  const fmt = (n: number) => formatValue(n, kpi.unit)
  const perDay = (n: number) => `${fmt(n)}/day`
  return (
    <>
      <h3 className={`mt-6 text-xs font-semibold tracking-wide uppercase ${headline ? 'text-brand-ink' : 'text-slate-500'}`}>{title}</h3>
      <dl className={`mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${headline ? '' : 'opacity-80'}`}>
        <Stat
          label="Projected at quarter end"
          value={fmt(p.projected)}
          note={`${fmt(kpi.actual)} + (${paceFormula}) × ${days(p.daysRemaining)} days left; ${formatPercent(p.projectedShareOfTarget)} of the ${fmt(kpi.target)} target`}
        />
        <Stat label="Added by this pace, rest of quarter" value={fmt(p.restOfQuarterAtPace)} note={`${fmt(p.projected)} − ${fmt(kpi.actual)}`} />
        {p.incrementalNeeded > 0 ? (
          <Stat
            label="Incremental needed beyond this pace"
            value={fmt(p.incrementalNeeded)}
            note={`${fmt(kpi.target)} − ${fmt(p.projected)}: must come from new effort`}
            emphasis={headline ? 'pace' : undefined}
          />
        ) : (
          <Stat
            label="Projected above target"
            value={fmt(p.projectedSurplus)}
            note={`${fmt(p.projected)} − ${fmt(kpi.target)}: no incremental gap at this pace`}
            emphasis={headline ? 'ahead' : undefined}
          />
        )}
        <Stat
          label="Required vs. this pace"
          value={`${p.requiredMultiple.toFixed(1)}×`}
          note={`Need ${perDay(p.requiredDailyRate)} (${fmt(p.remainingToTarget)} ÷ ${days(p.daysRemaining)} days left) vs. ${perDay(p.paceDailyRate)}`}
          emphasis={headline ? (p.requiredMultiple > 1 ? 'target' : 'ahead') : undefined}
        />
      </dl>
    </>
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
