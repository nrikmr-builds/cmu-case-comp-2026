// Owner: Nripesh (Developer 1). Landing page: portfolio KPIs and where they stand against pace.
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import StatusBadge from '../components/StatusBadge'
import { products, reportingPeriod } from '../data/productMetrics'
import { formatPercent, formatValue, getExpected, getPaceRatio, getStatus } from '../lib/metrics'
import type { KpiStatus, ProductId } from '../types'

/** Products with a drill-down page. */
const DETAIL_PATHS: Partial<Record<ProductId, string>> = {
  cd: '/cd-opportunities',
}

const STATUS_ORDER: KpiStatus[] = ['on-track', 'watch', 'at-risk']

export default function PortfolioOverview() {
  const { quarter, quarterElapsed } = reportingPeriod
  const kpis = products.flatMap((p) => p.kpis)
  const statusCounts = STATUS_ORDER.map((status) => ({
    status,
    count: kpis.filter((kpi) => getStatus(kpi, quarterElapsed) === status).length,
  }))
  const atRiskKpis = kpis.filter((kpi) => getStatus(kpi, quarterElapsed) === 'at-risk')

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy">Portfolio Overview</h1>
          <p className="mt-1 text-sm text-slate-600">
            {quarter} · {formatPercent(quarterElapsed)} of the quarter elapsed · {kpis.length} KPIs across{' '}
            {products.length} products
          </p>
        </div>
        <dl className="flex flex-wrap gap-2">
          {statusCounts.map(({ status, count }) => (
            <div key={status} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <dt>
                <StatusBadge status={status} />
              </dt>
              <dd className="text-lg font-semibold tabular-nums text-slate-900">{count}</dd>
            </div>
          ))}
        </dl>
      </div>

      {atRiskKpis.map((kpi) => {
        const detailPath = DETAIL_PATHS[kpi.productId]
        return (
          <div
            key={kpi.id}
            role="status"
            className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
              <div>
                <p className="font-semibold text-red-900">{kpi.label} is behind pace</p>
                <p className="text-sm text-red-800">
                  {formatValue(kpi.actual, kpi.unit)} so far vs. {formatValue(getExpected(kpi, quarterElapsed), kpi.unit)}{' '}
                  expected by now ({formatPercent(getPaceRatio(kpi, quarterElapsed))} of pace).
                </p>
              </div>
            </div>
            {detailPath && (
              <Link
                to={detailPath}
                className="inline-flex shrink-0 items-center gap-1 self-start rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:self-auto"
              >
                View opportunity insights
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            )}
          </div>
        )
      })}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            quarterElapsed={quarterElapsed}
            detailPath={DETAIL_PATHS[product.id]}
          />
        ))}
      </div>

      <p className="text-xs text-slate-500">
        Status compares progress with expected pace: account and deposit KPIs against{' '}
        {formatPercent(quarterElapsed)} of target, rate KPIs against target. On Track ≥ 95%, Watch 85–95%, At Risk
        &lt; 85%.
      </p>
    </section>
  )
}
