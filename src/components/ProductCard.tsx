import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatValue, getAttainment, getExpected, getStatus } from '../lib/metrics'
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

  return (
    <article
      className={`relative flex flex-col rounded-xl border border-t-4 border-slate-200 bg-white shadow-sm ${CARD_ACCENTS[status]} ${
        detailPath ? 'transition hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-brand-blue' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h2 className="text-lg font-semibold text-brand-navy">{product.name}</h2>
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
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-blue outline-none after:absolute after:inset-0 after:rounded-xl"
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
        <span className="text-sm font-medium text-slate-800">{kpi.label}</span>
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
      <KPIProgressBar attainment={getAttainment(kpi)} status={status} label={`${kpi.label}: share of target`} />
    </li>
  )
}
