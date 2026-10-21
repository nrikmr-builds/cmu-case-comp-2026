import { Sparkles } from 'lucide-react'
import { formatValue, getExpected, getPaceGap, getPotentialAccounts, getRemainingToTarget } from '../lib/metrics'
import type { CustomerSegment, Kpi } from '../types'

interface Props {
  kpi: Kpi
  quarterElapsed: number
  segments: CustomerSegment[]
  /** Product-specific caveats, without a trailing period. */
  openQuestions: string
}

/** Prewritten summary (no live AI). Numbers are filled in from shared data so they stay in sync. */
export default function AIInsightPanel({ kpi, quarterElapsed, segments, openQuestions }: Props) {
  const fmt = (n: number) => formatValue(n, kpi.unit)
  const paceGap = getPaceGap(kpi, quarterElapsed)
  const remaining = getRemainingToTarget(kpi)
  const pace =
    paceGap > 0
      ? `${fmt(paceGap)} behind the expected pace`
      : `${fmt(kpi.actual - getExpected(kpi, quarterElapsed))} ahead of the expected pace`
  const totalPotential = segments.reduce((sum, s) => sum + getPotentialAccounts(s), 0)
  const largest = maxBy(segments, getPotentialAccounts)
  const highestConversion = maxBy(segments, (s) => s.estimatedConversionRate)
  const coversRemaining = totalPotential >= remaining

  return (
    <section aria-labelledby="insight-heading" className="space-y-4">
      <div className="rounded-md border border-brand-orange/30 bg-orange-50 p-6">
        <h2 id="insight-heading" className="text-lg font-semibold text-brand-ink">Key Insight</h2>
        <p className="mt-2 text-slate-800">
          The three segments show <strong>{fmt(totalPotential)}</strong> potential accounts, which is{' '}
          {coversRemaining ? 'more' : 'less'} than the <strong>{fmt(remaining)}</strong> still needed to hit target.
          This is a hypothetical opportunity, not a forecast.
        </p>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-orange" aria-hidden />
          <h3 className="text-lg font-semibold text-brand-ink">AI Summary</h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Illustrative</span>
        </div>
        <blockquote className="mt-3 border-l-4 border-brand-blue/40 pl-4 text-slate-700">
          {kpi.label} are {pace}, with {fmt(remaining)} still needed to reach
          target. Three segments show an illustrative combined opportunity of {fmt(totalPotential)} new accounts.{' '}
          {largest.name} is the largest opportunity, and {highestConversion.name} has the highest assumed conversion.
          Open questions: {openQuestions}. Validate these assumptions before estimating impact.
        </blockquote>
      </div>
    </section>
  )
}

function maxBy<T>(items: T[], score: (item: T) => number): T {
  return items.reduce((best, item) => (score(item) > score(best) ? item : best))
}
