import { Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { dailyOpenings, DAYS_WITH_DATA, dayToIso } from '../data/dailyOpenings'
import { getKpi, reportingPeriod } from '../data/productMetrics'
import { CHART_COLORS } from '../lib/chartColors'
import { cumulativeChartData, getWeeklyPace, planDailyPace, shortDate } from '../lib/dailyTracking'
import { formatValue } from '../lib/metrics'
import { getPaceProjection } from '../lib/projection'
import SectionCard from './SectionCard'

const accounts = (n: number) => formatValue(n, 'accounts')
const dayTick = (x: number) => shortDate(dayToIso(Math.max(1, Math.round(x))))

export default function DailyOpeningsTrend() {
  const kpi = getKpi('checking-new-accounts')
  const p = getPaceProjection(kpi, reportingPeriod)
  const { quarterDays } = reportingPeriod
  const branchTotal = dailyOpenings.reduce((s, d) => s + d.branch, 0)
  const digitalTotal = dailyOpenings.reduce((s, d) => s + d.digital, 0)
  const ticks = [1, 15, 31, 46, 62, DAYS_WITH_DATA, quarterDays]

  return (
    <SectionCard
      id="daily-heading"
      title="Daily Openings · Branch vs. Digital"
      source="internal"
      description={`New checking accounts opened each day of ${reportingPeriod.quarter} so far (days 1–${DAYS_WITH_DATA}), against the pace needed from here to hit the ${accounts(kpi.target)} target.`}
    >
      <h4 className="text-sm font-medium text-body">Openings per day</h4>
      <div className="mt-2 h-64" role="img" aria-label="Daily openings by channel with required and current daily pace lines">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={dailyOpenings} margin={{ left: 0, right: 12, top: 8 }}>
            <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
            <XAxis dataKey="day" type="number" domain={[0.5, quarterDays + 0.5]} ticks={ticks} tickFormatter={dayTick} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} width={40} domain={[0, Math.ceil((p.requiredDailyRate * 1.1) / 50) * 50]} />
            <Tooltip
              labelFormatter={(day) => `Day ${day} · ${shortDate(dayToIso(Number(day)))}`}
              formatter={(value, name) => [accounts(Number(value)), name]}
            />
            <Legend itemSorter={null} />
            <Bar dataKey="branch" name="Branch" stackId="day" fill={CHART_COLORS.branch} isAnimationActive={false} />
            <Bar dataKey="digital" name="Digital" stackId="day" fill={CHART_COLORS.digital} isAnimationActive={false} />
            <ReferenceLine
              y={p.currentDailyRate}
              segment={[{ x: 0.5, y: p.currentDailyRate }, { x: p.daysElapsed, y: p.currentDailyRate }]}
              stroke={CHART_COLORS.ink}
              strokeDasharray="4 3"
            />
            <ReferenceLine y={planDailyPace()} stroke={CHART_COLORS.target} strokeDasharray="2 3" />
            <ReferenceLine
              segment={[{ x: p.daysElapsed, y: p.requiredDailyRate }, { x: quarterDays + 0.5, y: p.requiredDailyRate }]}
              stroke={CHART_COLORS.required}
              strokeWidth={2}
              label={{ value: `Required ${Math.round(p.requiredDailyRate)}/day`, position: 'insideTopRight', fontSize: 12, fill: CHART_COLORS.required }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-xs text-muted">
        Green dotted line: plan pace, {Math.round(planDailyPace())}/day ({accounts(kpi.target)} ÷ {quarterDays} days). Gray
        dashed: average so far, {Math.round(p.currentDailyRate)}/day. Red: {Math.round(p.requiredDailyRate)}/day needed every
        remaining day from {shortDate(dayToIso(DAYS_WITH_DATA))} to reach {accounts(kpi.target)}. Openings stepped down after
        an illustrative summer promotion ended on Jul 31, so the last 7 days averaged only {Math.round(getWeeklyPace().weekPerDay)}/day. Branch dips are Sundays and branch holidays (Jul 4, Sep 7).
      </p>

      <h4 className="mt-6 text-sm font-medium text-body">Cumulative openings and where the quarter lands</h4>
      <div className="mt-2 h-64" role="img" aria-label="Cumulative openings with projected and required lines to quarter end">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={cumulativeChartData()} margin={{ left: 8, right: 12, top: 8 }}>
            <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
            <XAxis dataKey="x" type="number" domain={[0, quarterDays]} ticks={ticks} tickFormatter={dayTick} tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={accounts} tick={{ fontSize: 12 }} width={52} domain={[0, Math.ceil((kpi.target * 1.05) / 1000) * 1000]} />
            <Tooltip formatter={(value, name) => [accounts(Number(value)), name]} labelFormatter={(x) => `Day ${Number(x).toLocaleString('en-US', { maximumFractionDigits: 1 })}`} />
            <Legend itemSorter={null} />
            <ReferenceLine y={kpi.target} stroke={CHART_COLORS.baseline} strokeDasharray="2 4" label={{ value: `Target ${accounts(kpi.target)}`, position: 'insideTopLeft', fontSize: 12, fill: CHART_COLORS.muted }} />
            <Line dataKey="actual" name="Actual" stroke={CHART_COLORS.branch} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
            <Line
              dataKey="projectedRecent"
              name={`At last-7-day pace (${accounts(getPaceProjection(kpi, reportingPeriod, getWeeklyPace().weekPerDay).projected)})`}
              stroke={CHART_COLORS.caution}
              strokeDasharray="5 4"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
              isAnimationActive={false}
            />
            <Line dataKey="projected" name={`At quarter-average pace (${accounts(p.projected)})`} stroke={CHART_COLORS.ink} strokeDasharray="5 4" strokeWidth={2} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
            <Line dataKey="required" name={`Required to hit target (${accounts(kpi.target)})`} stroke={CHART_COLORS.required} strokeWidth={2} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-4 rounded-sm bg-surface-subtle p-3 text-xs text-muted">
        <span className="font-semibold text-body">Reconciliation:</span> branch days 1–{DAYS_WITH_DATA} sum to{' '}
        {accounts(branchTotal)} and digital to {accounts(digitalTotal)}, so {accounts(branchTotal)} +{' '}
        {accounts(digitalTotal)} = {accounts(branchTotal + digitalTotal)}, matching New Account Openings ({accounts(kpi.actual)})
        and the funnel. Pace lines use the Gap Summary's {p.daysElapsed.toLocaleString('en-US', { maximumFractionDigits: 1 })}{' '}
        days elapsed: average {accounts(kpi.actual)} ÷ {p.daysElapsed.toLocaleString('en-US', { maximumFractionDigits: 1 })} ={' '}
        {Math.round(p.currentDailyRate)}/day; required {accounts(p.remainingToTarget)} ÷{' '}
        {p.daysRemaining.toLocaleString('en-US', { maximumFractionDigits: 1 })} = {Math.round(p.requiredDailyRate)}/day; projected{' '}
        {accounts(kpi.actual)} + {Math.round(p.currentDailyRate)}/day × {p.daysRemaining.toLocaleString('en-US', { maximumFractionDigits: 1 })} ≈{' '}
        {accounts(p.projected)} at the quarter-average pace (reference). Headline, at the last-7-day pace:{' '}
        {accounts(kpi.actual)} + ({accounts(getWeeklyPace().weekTotal)} ÷ 7 = {getWeeklyPace().weekPerDay.toFixed(1)}/day) ×{' '}
        {p.daysRemaining.toLocaleString('en-US', { maximumFractionDigits: 1 })} ≈{' '}
        <strong>{accounts(getPaceProjection(kpi, reportingPeriod, getWeeklyPace().weekPerDay).projected)}</strong>. Day {DAYS_WITH_DATA} (
        {shortDate(dayToIso(DAYS_WITH_DATA))}) is the internal as-of date.
      </p>
    </SectionCard>
  )
}
