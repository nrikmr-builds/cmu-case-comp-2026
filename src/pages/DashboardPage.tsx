// Routes "/" (the default landing dashboard) and "/d/<slug>". The built-in dashboard is the original Portfolio
// Overview, unchanged; user dashboards render their cards. Opportunity pages are shared, never copied.
import { Info } from 'lucide-react'
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import DashboardActions from '../components/DashboardActions'
import DashboardPromptBar from '../components/DashboardPromptBar'
import { DashboardIconBadge } from '../components/DashboardSwitcher'
import { DASHBOARD_ICONS } from '../components/dashboardIcons'
import PageHero from '../components/PageHero'
import ReportsHistory from '../components/ReportsHistory'
import SavedViewsNav from '../components/SavedViewsNav'
import GenerateReportButton from '../components/GenerateReportButton'
import { BUILT_IN, coversChecking, dashboardKpiIds, dashboardStore, findBySlug, scopeLabel, useDashboards, type Dashboard } from '../lib/dashboards'
import { formatTimestamp } from '../lib/metrics'
import { useSavedViews } from '../lib/useSavedViews'
import { buildWeeklyReport, scopeReport, type ReportSnapshot } from '../lib/weeklyReport'
import { useCampaigns } from '../lib/campaignStore'
import { useAlertRules } from '../lib/trackingStore'
import { useReforecast } from '../lib/reforecastStore'
import type { DashboardView } from '../types'
import PortfolioOverview from './PortfolioOverview'

const DashboardCardView = lazy(() => import('../components/DashboardCards'))
const WeeklyReport = lazy(() => import('../components/WeeklyReport'))
// Cards that read better across the whole row.
const WIDE = new Set(['gap', 'daily', 'tracker', 'what-changed'])

export default function DashboardPage() {
  const { slug } = useParams()
  const { state, landing, all } = useDashboards()
  const found = slug ? findBySlug(slug, state) : landing
  const dashboard = found ?? all.find((d) => d.id === BUILT_IN.id) ?? BUILT_IN
  const missing = slug && !found ? slug : undefined

  useEffect(() => {
    dashboardStore.markOpened(dashboard.id)
  }, [dashboard.id])

  const notice = missing ? (
    <p role="note" className="mx-auto mt-4 flex max-w-7xl items-center gap-2 rounded-sm border border-caution-line bg-caution-soft px-4 py-2 text-sm text-caution">
      <Info className="h-4 w-4 shrink-0" aria-hidden />
      No dashboard at “/d/{missing}”. Showing {dashboard.name} instead.
    </p>
  ) : null

  if (dashboard.builtIn) return <PortfolioOverview dashboard={dashboard} notice={notice} />
  return <UserDashboard key={dashboard.id} dashboard={dashboard} notice={notice} />
}

function UserDashboard({ dashboard, notice }: { dashboard: Dashboard; notice: ReactNode }) {
  const [report, setReport] = useState<ReportSnapshot | null>(null)
  const { campaigns } = useCampaigns()
  const { rules } = useAlertRules()
  const { reforecast } = useReforecast()
  const { views, saveView, deleteView, isUserView } = useSavedViews(dashboard.id)
  const [searchParams, setSearchParams] = useSearchParams()
  const [draft, setDraft] = useState<DashboardView | null>(null)
  const kpiIds = dashboardKpiIds(dashboard)
  const allCards: DashboardView = { id: 'default', label: 'All cards', prompt: null, createdAt: dashboard.createdAt, kpiIds }
  const active = draft ?? views.find((v) => v.id === searchParams.get('view')) ?? allCards
  // A view narrows KPI cards and product cards to its KPIs; other cards always show.
  const cards = dashboard.cards.filter((c) => c.type !== 'kpi' || active.kpiIds.includes(c.kpiId ?? ''))
  const openReport = () =>
    setReport(scopeReport(buildWeeklyReport(campaigns, rules, new Date(), reforecast), { id: dashboard.id, name: dashboard.name, kpiIds, checkingSections: coversChecking(dashboard) }))
  const Icon = DASHBOARD_ICONS[dashboard.icon]

  return (
    <>
      <PageHero
        title={dashboard.name}
        eyebrow={
          <span>
            Dashboard · {scopeLabel(dashboard.scope)}
            {dashboard.example ? ' · Example · illustrative' : ''}
          </span>
        }
        icon={Icon}
      >
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-body">
          <DashboardIconBadge d={dashboard} />
          {dashboard.cards.length} cards · {kpiIds.length} KPIs · owner: {dashboard.owner} · updated {formatTimestamp(dashboard.updatedAt)}
          {dashboard.origin ? ` · ${dashboard.origin}` : ''}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <GenerateReportButton onOpen={setReport} dashboard={dashboard} />
          <DashboardActions dashboard={dashboard} />
        </div>
      </PageHero>
      {notice}

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-12">
        <div className="lg:col-span-3">
        <SavedViewsNav
          defaultView={allCards}
          views={views}
          activeId={draft ? null : active.id}
          onSelect={(id) => {
            setDraft(null)
            setSearchParams(id === 'default' ? {} : { view: id })
          }}
          onDelete={(id) => {
            deleteView(id)
            if (active.id === id) setSearchParams({})
          }}
          isDeletable={isUserView}
          footer={<ReportsHistory onOpen={setReport} dashboardId={dashboard.id} />}
        />
        </div>
        <section className="min-w-0 space-y-6 lg:col-span-9">
          <DashboardPromptBar
            onGenerate={(v) => {
              const inScope = v.kpiIds.filter((id) => kpiIds.includes(id))
              setDraft({ ...v, kpiIds: inScope.length ? inScope : v.kpiIds })
            }}
          />
          {active.id !== 'default' && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-line bg-white px-4 py-2 text-sm">
              <span>
                <strong>{active.label}</strong>
                {draft ? ' · Unsaved view of this dashboard' : ` · saved ${formatTimestamp(active.createdAt)}`}
              </span>
              <span className="flex gap-2">
                {draft && (
                  <button
                    type="button"
                    onClick={() => {
                      saveView(draft)
                      setSearchParams({ view: draft.id })
                      setDraft(null)
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    Save view
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setDraft(null)
                    setSearchParams({})
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  {draft ? 'Discard' : 'All cards'}
                </button>
              </span>
            </div>
          )}
          <Suspense
            fallback={
              <div role="status" aria-busy="true" className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                <span className="sr-only">Loading cards…</span>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton h-48" />
                ))}
              </div>
            }
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
              {cards.map((c) => (
                <div key={c.id} className={WIDE.has(c.type) ? 'md:col-span-2 xl:col-span-3' : ''}>
                  <DashboardCardView card={c} filter={dashboard.filter} onlyKpiIds={active.id === 'default' ? undefined : active.kpiIds} onReport={openReport} />
                </div>
              ))}
            </div>
          </Suspense>
          <p className="text-xs text-muted">
            Every card reuses the Hub’s existing calculations; opportunity pages are shared, not copied. Internal figures are synthetic and
            illustrative.
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
