import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatPercent, formatValue, getAttainment, getExpected, getPaceRatio, getStatus } from '../lib/metrics'
import { againstReforecast, proposalCaveat, useReforecast } from '../lib/reforecastStore'
import { PRODUCT_ICONS } from '../lib/productIcons'
import type { Kpi, KpiStatus, Product } from '../types'
import KPIProgressBar from './KPIProgressBar'
import StatusBadge from './StatusBadge'

const STATUS_RANK: Record<KpiStatus, number> = { 'on-track': 0, watch: 1, 'at-risk': 2 }

const CARD_ACCENTS: Record<KpiStatus, string> = {
  'on-track': 'border-t-positive',
  watch: 'border-t-caution',
  'at-risk': 'border-t-critical',
}

/** The most severe status across a product's KPIs. */
function getProductStatus(product: Product, quarterElapsed: number): KpiStatus {
  return product.kpis
    .map((kpi) => getStatus(kpi, quarterElapsed))
    .reduce((worst, status) => (STATUS_RANK[status] > STATUS_RANK[worst] ? status : worst), 'on-track')
}

interface Props {
  product: Product
  quarterElapsed: number
  /** When set, the whole card links to this product's detail page. */
  detailPath?: string
}

export default function ProductCard({ product, quarterElapsed, detailPath }: Props) {
  const status = getProductStatus(product, quarterElapsed)
  const Icon = PRODUCT_ICONS[product.id]

  return (
    <article
      data-product-id={product.id}
      className={`relative flex flex-col rounded-sm border-t-4 bg-white shadow-card ${CARD_ACCENTS[status]} ${
        detailPath ? 'transition hover:-translate-y-0.5 hover:shadow-pop focus-within:ring-2 focus-within:ring-brand-blue' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3 px-6 pt-6">
        <div>
          <Icon className="mb-2 h-9 w-9 text-brand-ink" aria-hidden />
          <h2 className="text-lg font-semibold text-brand-ink">{product.name}</h2>
          <p className="text-sm text-muted">{product.description}</p>
        </div>
        <span className="shrink-0">
          <StatusBadge status={status} />
        </span>
      </div>

      <ul className="flex-1 divide-y divide-line px-6 py-2">
        {product.kpis.map((kpi) => (
          <KpiRow key={kpi.id} kpi={kpi} quarterElapsed={quarterElapsed} />
        ))}
      </ul>

      {detailPath && (
        <div className="border-t border-line px-6 py-3">
          {/* Stretched link: the ::after overlay makes the whole card clickable with a single focusable element. */}
          <Link
            to={detailPath}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-blue outline-none after:absolute after:inset-0 after:rounded-sm"
          >
            View opportunity insights
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      )}
    </article>
  )
}

function KpiRow({ kpi, quarterElapsed }: { kpi: Kpi; quarterElapsed: number }) {
  const status = getStatus(kpi, quarterElapsed)
  const expected = getExpected(kpi, quarterElapsed)
  const { reforecast } = useReforecast()
  const rf = reforecast && reforecast.kpiId === kpi.id ? againstReforecast(kpi, reforecast) : null

  return (
    <li className={`space-y-2 py-3 ${status === 'at-risk' ? '-mx-2 rounded-sm bg-critical-soft/60 px-2' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-ink">
          {kpi.label}
          {kpi.definition && <span className="block text-xs font-normal text-muted">{kpi.definition}</span>}
        </span>
        <span className="shrink-0">
          <StatusBadge status={status} />
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="tabular-nums">
          <span className="text-base font-semibold text-ink">{formatValue(kpi.actual, kpi.unit)}</span>
          <span className="text-muted"> / {formatValue(kpi.target, kpi.unit)} target</span>
        </span>
        {kpi.kind === 'cumulative' && (
          <span className="text-xs tabular-nums text-muted">{formatValue(expected, kpi.unit)} expected by now</span>
        )}
      </div>
      <KPIProgressBar attainment={getAttainment(kpi)} status={status} label={`${kpi.label}: share of target`} showValue={false} />
      {/* Bar length is share of the full-quarter target; the status badge is based on pace, so label both. */}
      <p className="text-xs tabular-nums text-muted">
        {formatPercent(getAttainment(kpi))} of target
        {kpi.kind === 'cumulative' && <> · {formatPercent(getPaceRatio(kpi, quarterElapsed))} of pace</>}
      </p>
      {rf && (
        <div className="rounded-sm bg-info-soft px-2 py-1 text-xs text-body">
          <p className="flex flex-wrap items-center gap-1">
            <span className="font-medium">
              Original target {formatValue(kpi.target, kpi.unit)} · Re-forecast {formatValue(rf.target, kpi.unit)} (illustrative proposal)
            </span>
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1">
            Re-forecast still needs {rf.multiple.toFixed(2)}× the recent pace ({rf.requiredPerDay.toFixed(1)} vs. {rf.recentPerDay.toFixed(1)}/day)
            <StatusBadge status={rf.status} />
          </p>
          <p className="mt-0.5 text-muted">{proposalCaveat(rf.originalStatus)}</p>
        </div>
      )}
      {kpi.related && (
        // Sits above the card's stretched link so it gets its own click.
        <Link
          to={kpi.related.to}
          className="relative z-10 inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        >
          {kpi.related.label}
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      )}
    </li>
  )
}
