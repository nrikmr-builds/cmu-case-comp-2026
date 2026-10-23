import { AlertTriangle, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import type { SegmentQuarter } from '../data/segmentHistory'
import { formatValue, getExpected, getPaceGap, getPotentialAccounts } from '../lib/metrics'
import { getPaceProjection } from '../lib/projection'
import { formatRate, getHistoricalOpportunity } from '../lib/segmentHistory'
import type { CustomerSegment, Kpi, ReportingPeriod } from '../types'

interface Props {
  kpi: Kpi
  period: ReportingPeriod
  /** Segments with the Product Owner's slider rates applied (the "scenario"). */
  segments: CustomerSegment[]
  /** Past quarters by segment id; the insight leads with last-quarter rates from here. */
  history: Record<string, SegmentQuarter[]>
  /** True once any slider differs from its baseline; until then there is no separate scenario to show. */
  scenarioAdjusted: boolean
  /** Product-specific caveats, without a trailing period. */
  openQuestions: string
  /** Extra prewritten sentences for products with more evidence on the page (checking retention). */
  addendum?: ReactNode
}

/**
 * Prewritten summary (no live AI). It leads with what the segments converted at last quarter, not with
 * slider assumptions, and shows the slider total only as a secondary scenario.
 */
export default function AIInsightPanel({ kpi, period, segments, history, scenarioAdjusted, openQuestions, addendum }: Props) {
  const fmt = (n: number) => formatValue(n, kpi.unit)
  const { quarterElapsed } = period
  const paceGap = getPaceGap(kpi, quarterElapsed)
  const pace =
    paceGap > 0
      ? `${fmt(paceGap)} behind the expected pace`
      : `${fmt(kpi.actual - getExpected(kpi, quarterElapsed))} ahead of the expected pace`
  const p = getPaceProjection(kpi, period)
  const historical = getHistoricalOpportunity(segments, history)
  const atHistory = historical.totalAtLastQuarter
  const scenario = segments.reduce((sum, s) => sum + getPotentialAccounts(s), 0)
  const n = segments.length

  return (
    <section aria-labelledby="insight-heading" className="space-y-4">
      <div className="rounded-md border border-brand-orange/30 bg-orange-50 p-6">
        <h2 id="insight-heading" className="text-lg font-semibold text-brand-ink">Key Insight</h2>
        <p className="mt-2 text-slate-800">
          At <strong>last-quarter conversion rates</strong>, the {n} segments show <strong>{fmt(atHistory)}</strong>{' '}
          potential accounts, which is {atHistory >= p.remainingToTarget ? 'more' : 'less'} than the{' '}
          <strong>{fmt(p.remainingToTarget)}</strong> still needed to hit target.
        </p>
        <p className="mt-2 text-slate-800">
          {p.incrementalNeeded > 0 ? (
            <>
              Today's pace should add about {fmt(p.restOfQuarterAtPace)} more on its own, so the gap that new effort has
              to close is <strong>{fmt(p.incrementalNeeded)}</strong> beyond current pace. The segment opportunity is{' '}
              {atHistory >= p.incrementalNeeded ? 'larger' : 'smaller'} than that ({fmt(atHistory)} vs.{' '}
              {fmt(p.incrementalNeeded)}), but some of these conversions may already be part of the current pace
              (overlap), so the true addition is likely smaller.
            </>
          ) : (
            <>
              At current pace the quarter lands at {fmt(p.projected)}, {fmt(p.projectedSurplus)} above target, so there is
              no incremental gap; the segments are upside, and some may already be part of the current pace (overlap).
            </>
          )}
        </p>
        <div className="mt-3 rounded border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700">
          {scenarioAdjusted ? (
            <>
              <span className="font-semibold">Your scenario:</span> {fmt(scenario)} potential accounts with your current
              slider settings.
            </>
          ) : (
            <span className="text-slate-500">Move a slider to test your own scenario.</span>
          )}
          {historical.outsideHistory.length > 0 && (
            <span className="mt-1 flex items-start gap-1.5 font-medium text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                {historical.outsideHistory.length} of {n} sliders{' '}
                {historical.outsideHistory.length === 1 ? 'is' : 'are'} outside the last 4 quarters' range:{' '}
                {historical.outsideHistory
                  .map(({ segment, direction }) => `${segment.name} at ${formatRate(segment.estimatedConversionRate)} (${direction})`)
                  .join(', ')}
                .
              </span>
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">This is a hypothetical opportunity, not a forecast.</p>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-orange" aria-hidden />
          <h3 className="text-lg font-semibold text-brand-ink">AI Summary</h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Illustrative</span>
        </div>
        <blockquote className="mt-3 border-l-4 border-brand-blue/40 pl-4 text-slate-700">
          {kpi.label} are {pace}, with {fmt(p.remainingToTarget)} still needed to reach target. At current pace the
          quarter lands at {fmt(p.projected)}
          {p.incrementalNeeded > 0
            ? `, leaving ${fmt(p.incrementalNeeded)} to come from new effort.`
            : `, ${fmt(p.projectedSurplus)} above target.`}{' '}
          At last-quarter conversion rates, the {n} segments show an illustrative {fmt(atHistory)} new accounts
          {historical.largest && <>; {historical.largest.name} is the largest opportunity</>}
          {historical.highestRate && (
            <>
              , and {historical.highestRate.segment.name} converted best last quarter ({formatRate(historical.highestRate.rate)})
            </>
          )}
          . Some of these may already be counted in the current pace. Open questions: {openQuestions}. Validate these
          assumptions before estimating impact.
          {addendum && <p className="mt-3">{addendum}</p>}
        </blockquote>
      </div>
    </section>
  )
}
