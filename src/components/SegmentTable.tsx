import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'
import { Fragment, useState } from 'react'
import { products, reportingPeriod } from '../data/productMetrics'
import type { SegmentQuarter } from '../data/segmentHistory'
import { formatValue, getPotentialAccounts, getStatus } from '../lib/metrics'
import {
  compareToHistory,
  formatRate,
  getHistoricalOpportunity,
  getLastQuarterPotential,
  getQuarterRate,
  getRateReference,
  type RateReference,
} from '../lib/segmentHistory'
import type { CustomerSegment } from '../types'
import StatusBadge from './StatusBadge'

/** Slider range for the Product Owner's conversion-rate assumptions. */
const MAX_CONVERSION_RATE = 0.3
// 0.1% steps so the slider can land exactly on any historical rate shown.
const CONVERSION_STEP = 0.001

interface Props {
  /** Segments with the Product Owner's adjusted conversion rates applied. */
  segments: CustomerSegment[]
  /** Completes "Why they might open a …". */
  accountNoun: string
  /** Original rates from shared data, used to flag and reset adjustments. */
  baselineRates: Record<string, number>
  /** Past quarters by segment id, shown as a reference next to each slider. */
  history: Record<string, SegmentQuarter[]>
  onRateChange: (segmentId: string, rate: number) => void
  onReset: () => void
}

const accounts = (n: number) => formatValue(n, 'accounts')
/** Position along the slider track, as a CSS percentage. */
const trackPosition = (rate: number) => `${(Math.min(rate, MAX_CONVERSION_RATE) / MAX_CONVERSION_RATE) * 100}%`
/** KPI whose "related" link points at this segment's row, e.g. Digital Opening Completion → Abandoned Digital. */
const relatedKpi = (segmentId: string) =>
  products.flatMap((p) => p.kpis).find((k) => k.related?.to.endsWith(`#segment-${segmentId}`))

export default function SegmentTable({ segments, accountNoun, baselineRates, history, onRateChange, onReset }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const totalEligible = segments.reduce((sum, s) => sum + s.eligibleCustomers, 0)
  const totalPotential = segments.reduce((sum, s) => sum + getPotentialAccounts(s), 0)
  const isAdjusted = segments.some((s) => s.estimatedConversionRate !== baselineRates[s.id])
  const references = Object.fromEntries(segments.map((s) => [s.id, getRateReference(history[s.id])]))
  // What this quarter would look like if every segment converted at its last-quarter rate.
  const { totalAtLastQuarter, complete: allHaveHistory } = getHistoricalOpportunity(segments, history)

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <section aria-labelledby="segments-heading" className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="segments-heading" className="heading-accent text-lg font-semibold text-brand-ink">
            Customer Segments · Opportunity
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Illustrative figures. Potential accounts = eligible customers × estimated conversion rate. Each slider starts
            at the segment's last-quarter rate (the baseline); drag it to test your own assumption. The band under each
            slider shows what the segment actually converted at over the last four quarters.
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
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="py-2 pr-4 font-medium">Segment</th>
              <th scope="col" className="py-2 pr-4 font-medium">Why they might open a {accountNoun}</th>
              <th scope="col" className="py-2 pr-4 font-medium">Consideration</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Eligible</th>
              <th scope="col" className="w-72 py-2 pr-4 font-medium">Est. Conversion vs. History</th>
              <th scope="col" className="py-2 text-right font-medium">Potential Accounts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {segments.map((s) => {
              const baseline = baselineRates[s.id]
              const changed = s.estimatedConversionRate !== baseline
              const ref = references[s.id]
              const isOpen = expanded.has(s.id)
              const kpi = relatedKpi(s.id)
              return (
                <Fragment key={s.id}>
                  <tr id={`segment-${s.id}`} className="scroll-mt-24 align-top target:bg-orange-50">
                    <th scope="row" className="py-3 pr-4 font-medium text-brand-ink">
                      {s.name}
                      {kpi && (
                        <span className="mt-1 flex flex-wrap items-center gap-1 text-xs font-normal text-slate-600">
                          Related KPI: {kpi.label} <StatusBadge status={getStatus(kpi, reportingPeriod.quarterElapsed)} />
                        </span>
                      )}
                      {ref && (
                        <button
                          type="button"
                          onClick={() => toggle(s.id)}
                          aria-expanded={isOpen}
                          aria-controls={`history-${s.id}`}
                          className="mt-1 flex items-center gap-0.5 rounded text-xs font-normal text-brand-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
                        >
                          {isOpen ? <ChevronDown className="h-3.5 w-3.5" aria-hidden /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
                          {isOpen ? 'Hide history' : 'Show history'}
                        </button>
                      )}
                    </th>
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
                          aria-valuetext={formatRate(s.estimatedConversionRate)}
                          className="w-full cursor-pointer accent-brand-blue"
                        />
                        <span className={`w-12 text-right tabular-nums ${changed ? 'font-semibold text-brand-blue' : ''}`}>
                          {formatRate(s.estimatedConversionRate)}
                        </span>
                      </div>
                      {ref && <HistoryTrack rate={s.estimatedConversionRate} reference={ref} />}
                      {ref ? (
                        <HistoryNote
                          rate={s.estimatedConversionRate}
                          reference={ref}
                          baseline={changed ? baseline : undefined}
                          onUse={(rate) => onRateChange(s.id, rate)}
                        />
                      ) : (
                        <p className="mt-1 text-xs text-slate-500">
                          {changed ? `Baseline ${formatRate(baseline)} · ` : 'Baseline · '}No history yet
                        </p>
                      )}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      <span className="font-semibold text-brand-ink">{accounts(getPotentialAccounts(s))}</span>
                      {ref && (
                        <span className="mt-1 block text-xs text-slate-500">
                          {accounts(getLastQuarterPotential(s, ref))} at {formatRate(ref.last.rate)} last-qtr rate
                        </span>
                      )}
                    </td>
                  </tr>
                  {ref && isOpen && (
                    <tr id={`history-${s.id}`} className="bg-slate-50">
                      <td colSpan={6} className="px-4 py-3">
                        <HistoryTable quarters={history[s.id]} assumption={s.estimatedConversionRate} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
          <tfoot className="border-t-2 border-slate-200 font-semibold text-brand-ink">
            <tr>
              <th scope="row" className="py-3 pr-4">Total</th>
              <td colSpan={2} />
              <td className="py-3 pr-4 text-right tabular-nums">{accounts(totalEligible)}</td>
              <td className="py-3 pr-4 text-xs font-normal text-slate-500">{isAdjusted ? 'Includes your adjustments' : ''}</td>
              <td className="py-3 text-right tabular-nums">
                {accounts(totalPotential)}
                {allHaveHistory && (
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    {accounts(totalAtLastQuarter)} at last-qtr rates
                  </span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}

/** Thin bar under the slider: shaded past range, a tick for the average, a dot for last quarter. */
function HistoryTrack({ rate, reference }: { rate: number; reference: RateReference }) {
  const status = compareToHistory(rate, reference)
  return (
    // Inset to roughly line up with the slider thumb's travel; stops short of the value label.
    <div className="mt-1 mr-14 px-2" aria-hidden>
      <div className="relative h-2 rounded-full bg-slate-100">
        <div
          className="absolute inset-y-0 rounded-full bg-brand-blue/25"
          style={{ left: trackPosition(reference.min), width: `calc(${trackPosition(reference.max)} - ${trackPosition(reference.min)})`, minWidth: 4 }}
        />
        <div className="absolute inset-y-[-2px] w-0.5 bg-slate-500" style={{ left: trackPosition(reference.average) }} />
        <div
          className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-blue"
          style={{ left: trackPosition(reference.last.rate) }}
        />
        <div
          className={`absolute top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full ${status === 'within' ? 'bg-transparent' : 'bg-amber-600'}`}
          style={{ left: trackPosition(rate) }}
        />
      </div>
    </div>
  )
}

interface NoteProps {
  rate: number
  reference: RateReference
  /** Set when the Product Owner has moved the slider. */
  baseline?: number
  onUse: (rate: number) => void
}

function HistoryNote({ rate, reference, baseline, onUse }: NoteProps) {
  const status = compareToHistory(rate, reference)
  const chip =
    'rounded border border-slate-300 px-1.5 py-0.5 text-[11px] font-medium text-brand-blue hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-blue'

  return (
    <div className="mt-1.5 space-y-1 text-xs text-slate-600">
      <p className="tabular-nums">
        <span className="inline-block h-2 w-2 rounded-full bg-brand-blue align-middle" aria-hidden /> Last qtr ({reference.last.quarter}){' '}
        <span className="font-medium text-slate-800">{formatRate(reference.last.rate)}</span>
        {' · '}
        <span className="inline-block h-2.5 w-0.5 bg-slate-500 align-middle" aria-hidden /> {reference.quarters}-qtr avg{' '}
        <span className="font-medium text-slate-800">{formatRate(reference.average)}</span>
        {' · '}Range {formatRate(reference.min)}–{formatRate(reference.max)}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className={chip} onClick={() => onUse(reference.last.rate)}>
          Use last qtr
        </button>
        <button type="button" className={chip} onClick={() => onUse(reference.average)}>
          Use avg
        </button>
        {baseline !== undefined && <span className="text-slate-500">Baseline {formatRate(baseline)}</span>}
      </div>
      {status !== 'within' && (
        <p className="font-medium text-amber-700">
          {status === 'above' ? 'Above' : 'Below'} every quarter in the last {reference.quarters}: check what would make this
          quarter different.
        </p>
      )}
    </div>
  )
}

function HistoryTable({ quarters, assumption }: { quarters: SegmentQuarter[]; assumption: number }) {
  return (
    <table className="w-full max-w-xl text-left text-xs">
      <caption className="mb-1 text-left font-medium text-slate-600">Past quarters (Illustrative)</caption>
      <thead className="text-slate-500">
        <tr>
          <th scope="col" className="py-1 pr-4 font-medium">Quarter</th>
          <th scope="col" className="py-1 pr-4 text-right font-medium">Eligible</th>
          <th scope="col" className="py-1 pr-4 text-right font-medium">Converted</th>
          <th scope="col" className="py-1 text-right font-medium">Conversion rate</th>
        </tr>
      </thead>
      <tbody className="tabular-nums text-slate-700">
        {quarters.map((q) => (
          <tr key={q.quarter}>
            <th scope="row" className="py-1 pr-4 font-normal">{q.quarter}</th>
            <td className="py-1 pr-4 text-right">{accounts(q.eligible)}</td>
            <td className="py-1 pr-4 text-right">{accounts(q.converted)}</td>
            <td className="py-1 text-right">{formatRate(getQuarterRate(q))}</td>
          </tr>
        ))}
        <tr className="border-t border-slate-200 font-semibold text-brand-blue">
          <th scope="row" className="py-1 pr-4">This quarter (your assumption)</th>
          <td colSpan={2} />
          <td className="py-1 text-right">{formatRate(assumption)}</td>
        </tr>
      </tbody>
    </table>
  )
}
