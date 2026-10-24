import { CalendarClock, Info } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
    <div className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 text-xs text-muted sm:px-6">
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5 text-muted" aria-hidden />
          <span>
            <span className="font-semibold text-body">Internal data as of {formatDate(internalAsOf)}</span> ·{' '}
            {quarter}, day ≈{Math.round(quarterDays * quarterElapsed)} of {quarterDays} ({formatPercent(quarterElapsed)}{' '}
            elapsed) · Illustrative
          </span>
        </span>
        {showExternal && (
          <span className="inline-flex items-center gap-1">
            <span className="font-semibold text-brand-blue">External sources retrieved {formatDate(externalRetrieved)}</span> · real,
            linked
            <WhyDatesDiffer quarter={quarter} />
          </span>
        )}
      </div>
    </div>
  )
}

/** "Why do the dates differ?": an info button with a popover (click, Enter or Space opens it; Esc or leaving closes it). */
function WhyDatesDiffer({ quarter }: { quarter: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [open])
  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="dates-differ"
        aria-label="Why do the internal and external dates differ?"
        className="btn btn-tertiary btn-sm btn-icon h-6 w-6"
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open && (
        <span
          id="dates-differ"
          role="tooltip"
          className="absolute top-full right-0 z-40 mt-1 w-72 animate-enter rounded-sm bg-white p-3 text-xs text-body shadow-pop sm:right-auto sm:left-0"
        >
          The dates differ on purpose: internal figures are a synthetic {quarter} snapshot, while web facts reflect the day they were
          read.
        </span>
      )}
    </span>
  )
}
