import { CalendarClock } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { marketSignals } from '../data/marketSignals'
import { reportingPeriod } from '../data/productMetrics'
import { formatPercent } from '../lib/metrics'
import { formatDate } from '../lib/projection'

/** Pages that show sourced web facts, so they also get the external date. */
const PAGES_WITH_EXTERNAL = ['/opportunities/checking']

/** Latest date any external fact was read. */
const externalRetrieved = marketSignals.map((s) => s.retrievedOn).sort().at(-1)

/** Slim strip under the nav: when the internal snapshot is from, and (where shown) when web facts were read. */
export default function DataFreshness() {
  const { pathname } = useLocation()
  const { quarter, quarterElapsed, quarterDays, internalAsOf } = reportingPeriod
  const showExternal = externalRetrieved && PAGES_WITH_EXTERNAL.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 text-xs text-slate-600 sm:px-6">
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5 text-slate-500" aria-hidden />
          <span>
            <span className="font-semibold text-slate-700">Internal data as of {formatDate(internalAsOf)}</span> ·{' '}
            {quarter}, day ≈{Math.round(quarterDays * quarterElapsed)} of {quarterDays} ({formatPercent(quarterElapsed)}{' '}
            elapsed) · Illustrative
          </span>
        </span>
        {showExternal && (
          <>
            <span>
              <span className="font-semibold text-brand-blue">External sources retrieved {formatDate(externalRetrieved)}</span>{' '}
              · real, linked
            </span>
            <span className="text-slate-500">
              The dates differ on purpose: internal figures are a synthetic {quarter} snapshot, while web facts reflect the
              day they were read.
            </span>
          </>
        )}
      </div>
    </div>
  )
}
