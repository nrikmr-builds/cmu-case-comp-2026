// Owner: Teammate A (Developer 1). Landing page: portfolio KPIs and where they stand against pace.
import { AlertTriangle, ArrowRight, Bookmark, LayoutDashboard, X } from 'lucide-react'
import { lazy, Suspense, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import DashboardActions from '../components/DashboardActions'
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
import { formatDate } from '../lib/projection'
import { BUILT_IN, createDialog, type Dashboard } from '../lib/dashboards'

/** "2026-09-12" → "Sep 12". */
const formatShortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
import type { DashboardView, KpiStatus, ProductId } from '../types'

// Loaded on demand so the report code isn't in the first download.
const WeeklyReport = lazy(() => import('../components/WeeklyReport'))

const STATUS_ORDER: KpiStatus[] = ['on-track', 'watch', 'at-risk']

const detailPath = (productId: ProductId) => `/opportunities/${productId}`

/** The built-in "Portfolio Overview" dashboard: the original home page, content and numbers unchanged. */
export default function PortfolioOverview({ dashboard = BUILT_IN, notice }: { dashboard?: Dashboard; notice?: ReactNode }) {
  const { quarter, quarterElapsed } = reportingPeriod
  const { views, saveView, deleteView, isUserView } = useSavedViews(dashboard.id)
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
        <p className="mt-4 text-body">
          {formatPercent(quarterElapsed)} of the quarter elapsed · {kpis.length} KPIs across {products.length} products
        </p>
        <dl className="mt-4 flex flex-wrap gap-3">
          {statusCounts.map(({ status, count }) => (
            <div key={status} className="card flex items-center gap-3 px-4 py-3">
              <dt>
                <StatusBadge status={status} />
              </dt>
              <dd className="font-display text-xl font-semibold text-ink">{count}</dd>
            </div>
          ))}
        </dl>
        {/* The primary action sits in the first screen; everything else steps down. */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <GenerateReportButton onOpen={setReport} dashboard={dashboard} />
          <DashboardActions dashboard={dashboard} />
          <button type="button" onClick={() => tourStore.start()} className="btn btn-tertiary">
            <Compass className="h-4 w-4" aria-hidden />
            Take the tour
          </button>
        </div>
        <p className="mt-3 text-sm text-muted">One page for leadership: KPIs, what changed, campaigns, risks, and decisions.</p>
      </PageHero>
      {notice}

      {/* 12-column grid at desktop: the rail takes 3 columns, the cards 9. */}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-12">
        <div className="lg:col-span-3">
        <SavedViewsNav
          defaultView={DEFAULT_VIEW}
          views={views}
          activeId={draft ? null : activeView.id}
          onSelect={selectView}
          onDelete={handleDelete}
          isDeletable={isUserView}
          footer={<ReportsHistory onOpen={setReport} dashboardId={dashboard.id} />}
        />
        </div>

        <section className="min-w-0 space-y-6 lg:col-span-9">
          {atRiskKpis.map((kpi) => (
            <div
              key={kpi.id}
              role="status"
              className="flex flex-col gap-3 rounded-sm border-l-4 border-l-critical bg-critical-soft p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-critical" aria-hidden />
                <div>
                  <p className="font-semibold text-critical">
                    {products.find((p) => p.id === kpi.productId)?.name} {kpi.label} is behind pace
                  </p>
                  <p className="text-sm text-critical">
                    {formatValue(kpi.actual, kpi.unit)} so far vs. {formatValue(getExpected(kpi, quarterElapsed), kpi.unit)}{' '}
                    expected by now ({formatPercent(getPaceRatio(kpi, quarterElapsed))} of pace).
                  </p>
                </div>
              </div>
              <Link to={detailPath(kpi.productId)} className="btn btn-secondary shrink-0 self-start sm:self-auto">
                View opportunity insights
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          ))}

          <div>
            <SinceLastVisit compact />
            <SourceLine />
          </div>

          <DashboardPromptBar onGenerate={setDraft} />

          <ActiveViewHeader
            view={activeView}
            isDraft={draft !== null}
            onSave={saveDraft}
            onReset={() => selectView(DEFAULT_VIEW.id)}
            onNewDashboard={draft?.prompt ? () => createDialog.open({ mode: 'describe', prompt: draft.prompt ?? '' }) : undefined}
          />

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visibleProducts.map((product) => (
              <div key={product.id} className="flex flex-col">
                <ProductCard product={product} quarterElapsed={quarterElapsed} detailPath={detailPath(product.id)} />
                <SourceLine />
              </div>
            ))}
          </div>

          <p className="text-xs text-muted">
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

/** "Source · refreshed": every number on the built-in dashboard is traceable to the internal snapshot. */
function SourceLine() {
  return (
    <p data-source-line className="mt-2 px-1 text-xs text-muted">
      Source · Internal · Illustrative · refreshed {formatDate(reportingPeriod.internalAsOf)}
    </p>
  )
}

interface ActiveViewHeaderProps {
  view: DashboardView
  isDraft: boolean
  onSave: () => void
  onReset: () => void
  /** Turn an unsaved generated view into its own dashboard. */
  onNewDashboard?: () => void
}

function ActiveViewHeader({ view, isDraft, onSave, onReset, onNewDashboard }: ActiveViewHeaderProps) {
  const isDefault = view.id === DEFAULT_VIEW.id
  const metricCount = `${view.kpiIds.length} ${view.kpiIds.length === 1 ? 'metric' : 'metrics'}`

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="heading-accent text-lg font-semibold text-brand-ink">{view.label}</h2>
          {isDraft && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">Unsaved</span>}
        </div>
        <p className="text-sm text-muted">
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
          <p className="mt-1 text-xs text-muted">
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
              className="btn btn-secondary"
            >
              <Bookmark className="h-4 w-4" aria-hidden />
              Save view
            </button>
          )}
          {isDraft && onNewDashboard && (
            <button
              type="button"
              onClick={onNewDashboard}
              className="btn btn-secondary"
            >
              New dashboard from this
            </button>
          )}
          <button
            type="button"
            onClick={onReset}
            className="btn btn-secondary"
          >
            <X className="h-4 w-4" aria-hidden />
            {isDraft ? 'Discard' : 'Full portfolio'}
          </button>
        </div>
      )}
    </div>
  )
}
