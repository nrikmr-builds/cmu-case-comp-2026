import { CheckCheck, History } from 'lucide-react'
import { products, reportingPeriod } from '../data/productMetrics'
import { formatPercent, formatTimestamp, formatValue, getPaceRatio, getStatus } from '../lib/metrics'
import { markVisitSeen, useLastVisit } from '../lib/trackingStore'
import type { ProductId } from '../types'
import StatusBadge from './StatusBadge'

/**
 * "Since your last visit" for products without daily data (Savings, CD). It shows current KPI status only and
 * says so plainly, rather than inventing a daily series or past values.
 */
export default function ProductStatusStrip({ productId }: { productId: ProductId }) {
  const lastVisit = useLastVisit()
  const product = products.find((p) => p.id === productId)
  if (!product) return null
  const q = reportingPeriod.quarterElapsed

  return (
    <section aria-labelledby="product-strip-heading" className="rounded-md border border-brand-blue/30 bg-blue-50/40 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="product-strip-heading" className="flex items-center gap-1.5 text-lg font-semibold text-brand-ink">
            <History className="h-5 w-5" aria-hidden />
            Since your last visit
          </h2>
          <p className="text-xs text-slate-600">
            {lastVisit ? `Last visit ${formatTimestamp(lastVisit)}. ` : 'First visit. '}
            <strong>No daily data in this prototype</strong> for {product.name}, so this shows current KPI status only (no change history).
          </p>
        </div>
        <button
          type="button"
          onClick={() => markVisitSeen()}
          className="inline-flex items-center gap-1 rounded border border-brand-blue bg-white px-3 py-1.5 text-sm font-medium text-brand-blue hover:bg-slate-50"
        >
          <CheckCheck className="h-4 w-4" aria-hidden />
          Mark as seen
        </button>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {product.kpis.map((k) => (
          <li key={k.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
            <p className="font-medium text-brand-ink">{k.label}</p>
            <p className="mt-1 flex flex-wrap items-center gap-1 text-slate-700">
              {formatValue(k.actual, k.unit)} / {formatValue(k.target, k.unit)} <StatusBadge status={getStatus(k, q)} />
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatPercent(getPaceRatio(k, q))} {k.kind === 'cumulative' ? 'of expected pace' : 'of target'} · change since last visit: —
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
