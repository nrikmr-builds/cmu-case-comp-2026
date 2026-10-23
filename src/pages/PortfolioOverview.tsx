// Owner: Teammate A (Developer 1). Landing page: portfolio KPIs and where they stand against pace.
import { AlertTriangle, ArrowRight, Bookmark, LayoutDashboard, X } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import DashboardPromptBar from '../components/DashboardPromptBar'
import PageHero from '../components/PageHero'
import ProductCard from '../components/ProductCard'
import SavedViewsNav from '../components/SavedViewsNav'
import ReportsHistory from '../components/ReportsHistory'
import SinceLastVisit from '../components/SinceLastVisit'
import GenerateReportButton from '../components/GenerateReportButton'
import { tourStore } from '../lib/tour'
import { Compass } from 'lucide-react'
import type { ReportSnapshot } from '../lib/weeklyReport'
import StatusBadge from '../components/StatusBadge'
import { products, reportingPeriod } from '../data/productMetrics'
import { DEFAULT_VIEW } from '../lib/dashboardPrompt'
import { formatPercent, formatTimestamp, formatValue, getExpected, getPaceRatio, getStatus } from '../lib/metrics'
import { useSavedViews } from '../lib/useSavedViews'

/** "2026-09-12" → "Sep 12". */
const formatShortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
import type { DashboardView, KpiStatus, ProductId } from '../types'

// Loaded on demand so the report code isn't in the first download.
const WeeklyReport = lazy(() => import('../components/WeeklyReport'))

const STATUS_ORDER: KpiStatus[] = ['on-track', 'watch', 'at-risk']

const detailPath = (productId: ProductId) => `/opportunities/${productId}`

export default function PortfolioOverview() {
  const { quarter, quarterElapsed } = reportingPeriod
  const { views, saveView, deleteView, isUserView } = useSavedViews()
  const [searchParams, setSearchParams] = useSearchParams()
  // A generated view the Product Owner hasn't saved yet. Saved views are addressed by ?view= instead.
  const [draft, setDraft] = useState<DashboardView | null>(null)
  // The weekly report on screen: freshly generated, or reopened from Reports history.
  const [report, setReport] = useState<ReportSnapshot | null>(null)
  const activeView = draft ?? views.find((v) => v.id === searchParams.get('view')) ?? DEFAULT_VIEW

  const kpis = products.flatMap((p) => p.kpis)
  const statusCounts = STATUS_ORDER.map((status) => ({
    status,
    count: kpis.filter((kpi) => getStatus(kpi, quarterElapsed) === status).length,
  }))
  const atRiskKpis = kpis.filter((kpi) => getStatus(kpi, quarterElapsed) === 'at-risk')
  const visibleProducts = products
    .map((p) => ({ ...p, kpis: p.kpis.filter((k) => activeView.kpiIds.includes(k.id)) }))
    .filter((p) => p.kpis.length > 0)

  function selectView(id: string) {
    setDraft(null)
    setSearchParams(id === DEFAULT_VIEW.id ? {} : { view: id })
  }

  function saveDraft() {
    if (!draft) return
    saveView(draft)
    setDraft(null)
    setSearchParams({ view: draft.id })
  }

  function handleDelete(id: string) {
    deleteView(id)
    if (activeView.id === id) selectView(DEFAULT_VIEW.id)
  }

  return (
    <>
      <PageHero title="Portfolio Overview" eyebrow={`Deposit products · ${quarter}`} icon={LayoutDashboard}>
        <p className="mt-4 text-slate-700">
          {formatPercent(quarterElapsed)} of the quarter elapsed · {kpis.length} KPIs across {products.length} products
        </p>
        <dl className="mt-4 flex flex-wrap gap-2">
          {statusCounts.map(({ status, count }) => (
            <div key={status} className="flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <dt>
                <StatusBadge status={status} />
              </dt>
              <dd className="text-lg font-semibold tabular-nums text-slate-900">{count}</dd>
            </div>
          ))}
        </dl>
      </PageHero>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <SavedViewsNav
          defaultView={DEFAULT_VIEW}
          views={views}
          activeId={draft ? null : activeView.id}
          onSelect={selectView}
          onDelete={handleDelete}
          isDeletable={isUserView}
          footer={<ReportsHistory onOpen={setReport} />}
        />

        <section className="min-w-0 space-y-6">
          {atRiskKpis.map((kpi) => (
            <div
              key={kpi.id}
              role="status"
              className="flex flex-col gap-3 rounded border border-l-4 border-red-200 border-l-red-600 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
                <div>
                  <p className="font-semibold text-red-900">
                    {products.find((p) => p.id === kpi.productId)?.name} {kpi.label} is behind pace
                  </p>
                  <p className="text-sm text-red-800">
                    {formatValue(kpi.actual, kpi.unit)} so far vs. {formatValue(getExpected(kpi, quarterElapsed), kpi.unit)}{' '}
                    expected by now ({formatPercent(getPaceRatio(kpi, quarterElapsed))} of pace).
                  </p>
                </div>
              </div>
              <Link
                to={detailPath(kpi.productId)}
                className="inline-flex shrink-0 items-center gap-1 self-start rounded bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:self-auto"
              >
                View opportunity insights
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600">One page for leadership: KPIs, what changed, campaigns, risks, and decisions.</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => tourStore.start()}
                className="inline-flex items-center gap-1.5 rounded border border-brand-blue bg-white px-3 py-1.5 text-sm font-medium text-brand-blue hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
              >
                <Compass className="h-4 w-4" aria-hidden />
                Take the tour
              </button>
              <GenerateReportButton onOpen={setReport} />
            </div>
          </div>

          <SinceLastVisit compact />

          <DashboardPromptBar onGenerate={setDraft} />

          <ActiveViewHeader
            view={activeView}
            isDraft={draft !== null}
            onSave={saveDraft}
            onReset={() => selectView(DEFAULT_VIEW.id)}
          />

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                quarterElapsed={quarterElapsed}
                detailPath={detailPath(product.id)}
              />
            ))}
          </div>

          <p className="text-xs text-slate-500">
            Status compares progress with expected pace: account and deposit KPIs against{' '}
            {formatPercent(quarterElapsed)} of target, rate KPIs against target. On Track ≥ 95%, Watch 85–95%, At Risk
            &lt; 85%.
          </p>
        </section>
      </div>
      {report && (
        <Suspense fallback={null}>
          <WeeklyReport key={report.id} report={report} onClose={() => setReport(null)} />
        </Suspense>
      )}
    </>
  )
}

interface ActiveViewHeaderProps {
  view: DashboardView
  isDraft: boolean
  onSave: () => void
  onReset: () => void
}

function ActiveViewHeader({ view, isDraft, onSave, onReset }: ActiveViewHeaderProps) {
  const isDefault = view.id === DEFAULT_VIEW.id
  const metricCount = `${view.kpiIds.length} ${view.kpiIds.length === 1 ? 'metric' : 'metrics'}`

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="heading-accent text-xl font-semibold text-brand-ink">{view.label}</h2>
          {isDraft && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">Unsaved</span>}
        </div>
        <p className="text-sm text-slate-500">
          {view.prompt ? (
            <>
              “{view.prompt}” · {metricCount}
              {!isDraft && ` · saved ${formatTimestamp(view.createdAt)}`}
            </>
          ) : (
            `Default view · ${metricCount}`
          )}
        </p>
        {/* A saved view keeps its metric list, but statuses are recomputed from the current snapshot. */}
        {!isDefault && !isDraft && (
          <p className="mt-1 text-xs text-slate-500">
            KPI status shown as of today's data ({formatShortDate(reportingPeriod.internalAsOf)}).
          </p>
        )}
      </div>
      {!isDefault && (
        <div className="flex shrink-0 gap-2">
          {isDraft && (
            <button
              type="button"
              onClick={onSave}
              className="inline-flex items-center gap-1.5 rounded bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
            >
              <Bookmark className="h-4 w-4" aria-hidden />
              Save view
            </button>
          )}
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded border border-brand-blue bg-white px-3 py-1.5 text-sm font-medium text-brand-blue hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          >
            <X className="h-4 w-4" aria-hidden />
            {isDraft ? 'Discard' : 'Full portfolio'}
          </button>
        </div>
      )}
    </div>
  )
}
