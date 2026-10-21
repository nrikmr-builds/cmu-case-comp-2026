import { RotateCcw } from 'lucide-react'
import { formatPercent, formatValue, getPotentialAccounts } from '../lib/metrics'
import type { CustomerSegment } from '../types'

/** Slider range for the Product Owner's conversion-rate assumptions. */
const MAX_CONVERSION_RATE = 0.3
const CONVERSION_STEP = 0.005

interface Props {
  /** Segments with the Product Owner's adjusted conversion rates applied. */
  segments: CustomerSegment[]
  /** Completes "Why they might open a …". */
  accountNoun: string
  /** Original rates from shared data, used to flag and reset adjustments. */
  baselineRates: Record<string, number>
  onRateChange: (segmentId: string, rate: number) => void
  onReset: () => void
}

export default function SegmentTable({ segments, accountNoun, baselineRates, onRateChange, onReset }: Props) {
  const totalEligible = segments.reduce((sum, s) => sum + s.eligibleCustomers, 0)
  const totalPotential = segments.reduce((sum, s) => sum + getPotentialAccounts(s), 0)
  const accounts = (n: number) => formatValue(n, 'accounts')
  const isAdjusted = segments.some((s) => s.estimatedConversionRate !== baselineRates[s.id])

  return (
    <section aria-labelledby="segments-heading" className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="segments-heading" className="heading-accent text-lg font-semibold text-brand-ink">
            Customer Segments · Opportunity
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Illustrative figures. Potential accounts = eligible customers × estimated conversion rate. Drag a slider to
            test your own conversion assumption.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={!isAdjusted}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-brand-blue hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Reset to baseline
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="py-2 pr-4 font-medium">Segment</th>
              <th scope="col" className="py-2 pr-4 font-medium">Why they might open a {accountNoun}</th>
              <th scope="col" className="py-2 pr-4 font-medium">Consideration</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Eligible</th>
              <th scope="col" className="w-44 py-2 pr-4 font-medium">Est. Conversion</th>
              <th scope="col" className="py-2 text-right font-medium">Potential Accounts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {segments.map((s) => {
              const baseline = baselineRates[s.id]
              const changed = s.estimatedConversionRate !== baseline
              return (
                <tr key={s.id} className="align-top">
                  <th scope="row" className="py-3 pr-4 font-medium text-brand-ink">{s.name}</th>
                  <td className="py-3 pr-4 text-slate-700">{s.whyRelevant}</td>
                  <td className="py-3 pr-4 text-amber-800">{s.consideration}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{accounts(s.eligibleCustomers)}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={MAX_CONVERSION_RATE}
                        step={CONVERSION_STEP}
                        value={s.estimatedConversionRate}
                        onChange={(e) => onRateChange(s.id, Number(e.target.value))}
                        aria-label={`${s.name} estimated conversion rate`}
                        aria-valuetext={formatPercent(s.estimatedConversionRate)}
                        className="w-full cursor-pointer accent-brand-blue"
                      />
                      <span className={`w-12 text-right tabular-nums ${changed ? 'font-semibold text-brand-blue' : ''}`}>
                        {formatPercent(s.estimatedConversionRate)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {changed ? `Baseline ${formatPercent(baseline)}` : 'Baseline'}
                    </p>
                  </td>
                  <td className="py-3 text-right font-semibold tabular-nums text-brand-ink">{accounts(getPotentialAccounts(s))}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="border-t-2 border-slate-200 font-semibold text-brand-ink">
            <tr>
              <th scope="row" className="py-3 pr-4">Total</th>
              <td colSpan={2} />
              <td className="py-3 pr-4 text-right tabular-nums">{accounts(totalEligible)}</td>
              <td className="py-3 pr-4 text-xs font-normal text-slate-500">{isAdjusted ? 'Includes your adjustments' : ''}</td>
              <td className="py-3 text-right tabular-nums">{accounts(totalPotential)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
