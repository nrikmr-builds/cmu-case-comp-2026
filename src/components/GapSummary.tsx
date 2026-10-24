import { getHeadlineProjection, getWeeklyPace } from '../lib/dailyTracking'
import { againstReforecast, END_LABEL, proposalCaveat, reforecastLabel, useReforecast } from '../lib/reforecastStore'
import { formatPercent, formatValue, getExpected, getPaceGap, getPaceRatio, getStatus } from '../lib/metrics'
import type { PaceProjection } from '../lib/projection'
import type { Kpi, ReportingPeriod } from '../types'
import StatusBadge from './StatusBadge'

interface Props {
  kpi: Kpi
  period: ReportingPeriod
  /** A dashboard can show several Gap Summaries; each needs its own heading id. */
  headingId?: string
}

const days = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 })
const STATUS_TEXT = { 'on-track': 'On Track', watch: 'Watch', 'at-risk': 'At Risk' } as const

export default function GapSummary({ kpi, period, headingId = 'gap-heading' }: Props) {
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
    <section aria-labelledby={headingId} className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id={headingId} className="heading-accent text-lg font-semibold text-brand-ink">
          Gap Summary · {kpi.label}
        </h2>
        <StatusBadge status={getStatus(kpi, quarterElapsed)} />
      </div>

      <h3 className="mt-5 text-xs font-semibold text-muted">Where we are today</h3>
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
          <h3 className="mt-6 text-xs font-semibold text-brand-ink">
            Original target vs. {reforecastLabel(reforecast)}
          </h3>
          <dl className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Original target (unchanged)" value={fmt(kpi.target)} note={`${formatPercent(getPaceRatio(kpi, quarterElapsed))} of pace · ${STATUS_TEXT[getStatus(kpi, quarterElapsed)]}`} />
            <Stat
              label="Re-forecast (proposal)"
              value={fmt(rf.target)}
              note={`${END_LABEL[reforecast.end]} of the planner range ${fmt(reforecast.range.low)}–${fmt(reforecast.range.high)}`}
              emphasis="target"
            />
            <Stat
              label="Required per day to reach it"
              value={`${rf.requiredPerDay.toFixed(1)}/day`}
              note={`(${fmt(rf.target)} − ${fmt(kpi.actual)}) ÷ ${days(rf.daysLeft)} days left = ${fmt(rf.stillNeeded)} ÷ ${days(rf.daysLeft)}`}
            />
            <Stat
              label="Vs. the recent pace"
              value={`${rf.multiple.toFixed(2)}×`}
              note={`Needs ${rf.multiple.toFixed(2)}× the recent pace: ${rf.requiredPerDay.toFixed(1)} ÷ ${rf.recentPerDay.toFixed(1)}/day. Recent ÷ required = ${formatPercent(rf.recentVsRequired)} · ${STATUS_TEXT[rf.status]}`}
              emphasis={rf.status === 'on-track' ? 'ahead' : 'pace'}
            />
          </dl>
          <p className="mt-2 text-xs font-medium text-body">{proposalCaveat(rf.originalStatus)}</p>
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
      <h3 className={`mt-6 text-xs font-semibold ${headline ? 'text-brand-ink' : 'text-muted'}`}>{title}</h3>
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
  pace: 'border-critical-line bg-critical-soft',
  ahead: 'border-positive-line bg-positive-soft',
  target: 'border-brand-blue/30 bg-info-soft',
}

function Stat({ label, value, note, emphasis }: StatProps) {
  return (
    <div className={`rounded-sm border p-4 ${emphasis ? EMPHASIS_STYLES[emphasis] : 'border-line bg-surface-subtle'}`}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums text-brand-ink">{value}</dd>
      <dd className="mt-1 text-xs text-muted">{note}</dd>
    </div>
  )
}
