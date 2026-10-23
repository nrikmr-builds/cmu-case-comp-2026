import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatPercent, formatValue, getAttainment, getExpected, getPaceRatio, getStatus } from '../lib/metrics'
import { PRODUCT_ICONS } from '../lib/productIcons'
import type { Kpi, KpiStatus, Product } from '../types'
import KPIProgressBar from './KPIProgressBar'
import StatusBadge from './StatusBadge'

const STATUS_RANK: Record<KpiStatus, number> = { 'on-track': 0, watch: 1, 'at-risk': 2 }

const CARD_ACCENTS: Record<KpiStatus, string> = {
  'on-track': 'border-t-green-600',
  watch: 'border-t-amber-500',
  'at-risk': 'border-t-red-600',
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
      className={`relative flex flex-col rounded-md border border-t-4 border-slate-200 bg-white shadow-sm ${CARD_ACCENTS[status]} ${
        detailPath ? 'transition hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-brand-blue' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <Icon className="mb-2 h-9 w-9 text-brand-ink" strokeWidth={1.25} aria-hidden />
          <h2 className="text-lg font-semibold text-brand-ink">{product.name}</h2>
          <p className="text-sm text-slate-500">{product.description}</p>
        </div>
        <span className="shrink-0">
          <StatusBadge status={status} />
        </span>
      </div>

      <ul className="flex-1 divide-y divide-slate-100 px-5 py-2">
        {product.kpis.map((kpi) => (
          <KpiRow key={kpi.id} kpi={kpi} quarterElapsed={quarterElapsed} />
        ))}
      </ul>

      {detailPath && (
        <div className="border-t border-slate-100 px-5 py-3">
          {/* Stretched link: the ::after overlay makes the whole card clickable with a single focusable element. */}
          <Link
            to={detailPath}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-blue outline-none after:absolute after:inset-0 after:rounded-md"
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

  return (
    <li className={`space-y-2 py-3 ${status === 'at-risk' ? '-mx-2 rounded-lg bg-red-50/60 px-2' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-slate-800">
          {kpi.label}
          {kpi.definition && <span className="block text-xs font-normal text-slate-500">{kpi.definition}</span>}
        </span>
        <span className="shrink-0">
          <StatusBadge status={status} />
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="tabular-nums">
          <span className="text-base font-semibold text-slate-900">{formatValue(kpi.actual, kpi.unit)}</span>
          <span className="text-slate-500"> / {formatValue(kpi.target, kpi.unit)} target</span>
        </span>
        {kpi.kind === 'cumulative' && (
          <span className="text-xs tabular-nums text-slate-500">{formatValue(expected, kpi.unit)} expected by now</span>
        )}
      </div>
      <KPIProgressBar attainment={getAttainment(kpi)} status={status} label={`${kpi.label}: share of target`} showValue={false} />
      {/* Bar length is share of the full-quarter target; the status badge is based on pace, so label both. */}
      <p className="text-xs tabular-nums text-slate-600">
        {formatPercent(getAttainment(kpi))} of target
        {kpi.kind === 'cumulative' && <> · {formatPercent(getPaceRatio(kpi, quarterElapsed))} of pace</>}
      </p>
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
