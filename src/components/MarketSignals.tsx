import { CalendarClock, ExternalLink, Link2 } from 'lucide-react'
import { useState } from 'react'
import { dropOffSignals, riskSegments, type PncComparisonRow } from '../data/checkingHealth'
import type { MarketSignal, SignalCategory } from '../data/marketSignals'
import { getOpportunity } from '../data/opportunities'
import { formatExpiry, formatRetrieved, formatUsd } from '../lib/checkingHealth'
import { daysUntil, expiryLabel } from '../lib/dailyTracking'
import SourceBadge from './SourceBadge'

const TABS: { id: SignalCategory; label: string }[] = [
  { id: 'competitor-promo', label: 'Competitor Promotions' },
  { id: 'feature-trend', label: 'Feature Trends' },
  { id: 'market-context', label: 'Market Context' },
]

/** Where a "Relates to" chip jumps: the matching signal row, then a risk segment, then an opportunity segment. */
function relatedAnchor(relevance: string): string | undefined {
  const signal = dropOffSignals.find((s) => s.name === relevance)
  if (signal) return `#signal-${signal.id}`
  const risk = riskSegments.find((s) => s.name === relevance)
  if (risk) return `#risk-${risk.id}`
  const segment = getOpportunity('checking')?.segments.find((s) => s.name === relevance)
  return segment ? `#segment-${segment.id}` : undefined
}

/** "N days left (as of Oct 22)", counted from the offer's own retrieval date; nothing for open-ended offers. */
function ExpiryChip({ signal }: { signal: MarketSignal }) {
  const left = daysUntil(signal.offer?.expires, signal.retrievedOn)
  if (left === undefined) return null
  const tone = left < 0 ? 'bg-slate-200 text-slate-700' : left <= 30 ? 'bg-red-50 text-red-800 ring-1 ring-red-200' : 'bg-slate-100 text-slate-700'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      <CalendarClock className="h-3.5 w-3.5" aria-hidden />
      {expiryLabel(left, signal.retrievedOn)}
    </span>
  )
}

export function SourceLink({ signal }: { signal: Pick<MarketSignal, 'source' | 'sourceUrl'> }) {
  return (
    <a
      href={signal.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-medium text-brand-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
    >
      {signal.source}
      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  )
}

interface Props {
  signals: MarketSignal[]
  pncRow: PncComparisonRow
}

export default function MarketSignals({ signals, pncRow }: Props) {
  const [tab, setTab] = useState<SignalCategory>('competitor-promo')
  const visible = signals.filter((s) => s.category === tab)
  const promos = signals.filter((s) => s.category === 'competitor-promo')

  return (
    <section aria-labelledby="market-heading" className="space-y-6">
      <div className="pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="market-heading" className="heading-accent text-2xl font-semibold text-brand-ink">
            Market Signals
          </h2>
          <SourceBadge kind="external" />
        </div>
        <p className="mt-2 max-w-3xl text-slate-600">
          What our own data can't show: competitor offers, product trends, and market conditions that may explain why
          customers leave. Every item links to the page it came from, so you can check it.
        </p>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div role="tablist" aria-label="Market signal categories" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {TABS.map((t) => {
            const count = signals.filter((s) => s.category === t.id).length
            const selected = t.id === tab
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={selected}
                aria-controls="market-panel"
                onClick={() => setTab(t.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue ${
                  selected ? 'bg-brand-ink text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t.label} <span className="tabular-nums opacity-70">({count})</span>
              </button>
            )
          })}
        </div>

        <div id="market-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-4 grid gap-4 md:grid-cols-2">
          {visible.map((s) => {
            const anchor = relatedAnchor(s.relevance)
            return (
              <article key={s.id} className="flex flex-col rounded-lg border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-brand-ink">{s.headline}</h3>
                  <SourceBadge kind="external" />
                </div>
                <p className="mt-2 flex-1 text-sm text-slate-700">{s.detail}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500">
                  <SourceLink signal={s} />
                  <span>Retrieved {formatRetrieved(s.retrievedOn)}</span>
                  <ExpiryChip signal={s} />
                </div>
                <div className="mt-3">
                  {anchor ? (
                    <a
                      href={anchor}
                      className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-800 ring-1 ring-orange-200 ring-inset hover:bg-orange-100"
                    >
                      <Link2 className="h-3.5 w-3.5" aria-hidden />
                      Relates to: {s.relevance}
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-800">
                      Relates to: {s.relevance}
                    </span>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </div>

      {promos.length > 0 && (
        <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="heading-accent text-lg font-semibold text-brand-ink">Checking Offer Comparison</h3>
          <p className="mt-2 text-sm text-slate-600">
            Competitor rows are sourced from each linked page. The PNC row is our synthetic placeholder.
          </p>
          <div className="relative mt-4 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-medium">Competitor</th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">Bonus</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Direct deposit requirement</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Monthly fee &amp; waiver</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Expires</th>
                  <th scope="col" className="py-2 font-medium">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-slate-50 align-top">
                  <th scope="row" className="py-3 pr-4 font-semibold text-brand-ink">{pncRow.name}</th>
                  <td className="py-3 pr-4 text-right tabular-nums">{pncRow.bonusUsd ? formatUsd(pncRow.bonusUsd) : '—'}</td>
                  <td className="py-3 pr-4 text-slate-700">{pncRow.requirement}</td>
                  <td className="py-3 pr-4 text-slate-700">{pncRow.monthlyFee}</td>
                  <td className="py-3 pr-4 text-slate-700">—</td>
                  <td className="py-3"><SourceBadge kind="internal" /></td>
                </tr>
                {promos.map((s) => (
                  <tr key={s.id} className="align-top">
                    <th scope="row" className="py-3 pr-4 font-medium text-brand-ink">{s.competitor ?? s.source}</th>
                    <td className="py-3 pr-4 text-right tabular-nums">{s.offer?.bonusUsd ? formatUsd(s.offer.bonusUsd) : '—'}</td>
                    <td className="py-3 pr-4 text-slate-700">{s.offer?.requirement ?? '—'}</td>
                    <td className="py-3 pr-4 text-slate-700">{s.offer?.monthlyFee ?? '—'}</td>
                    <td className="py-3 pr-4 text-slate-700">
                      <span>{formatExpiry(s.offer?.expires)}</span>
                      <span className="mt-1 block">
                        <ExpiryChip signal={s} />
                      </span>
                    </td>
                    <td className="py-3 text-xs">
                      <SourceLink signal={s} />
                      <span className="mt-1 block text-slate-500">Retrieved {formatRetrieved(s.retrievedOn)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
