// Owner: Teammate B (Developer 2). Shows evidence and trade-offs; the decision stays with the Product Owner.
import { ArrowLeft, ImageDown } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, Navigate, NavLink, useLocation, useParams } from 'react-router-dom'
import ActNow from '../components/ActNow'
import { dashboardPath, useDashboards } from '../lib/dashboards'
import { useCurrentDashboard } from '../lib/useCurrentDashboard'
import ReportsHistory from '../components/ReportsHistory'
import { CHECKING_TABS, DEFAULT_TAB, isCheckingTab, tabForAnchor, tabPath, type CheckingTab } from '../lib/checkingTabs'
import AIInsightPanel from '../components/AIInsightPanel'
import CheckingSummaryAddendum from '../components/CheckingSummaryAddendum'
import GapSummary from '../components/GapSummary'
import PageHero from '../components/PageHero'
import SegmentTable from '../components/SegmentTable'
import ProductStatusStrip from '../components/ProductStatusStrip'
import SinceLastVisit from '../components/SinceLastVisit'
import GenerateReportButton from '../components/GenerateReportButton'
import type { ReportSnapshot } from '../lib/weeklyReport'
import { presetForSource } from '../data/campaignPresets'
import { getOpportunity } from '../data/opportunities'
import { getKpi, reportingPeriod } from '../data/productMetrics'
import { segmentHistory } from '../data/segmentHistory'
import { PRODUCT_ICONS } from '../lib/productIcons'
import { getRateReference } from '../lib/segmentHistory'
import type { SavedCampaign } from '../lib/campaignStore'
import type { ProductOpportunity } from '../types'

// Charts (Recharts), the builder, and the report load on demand so the first download stays small.
const CheckingHealthSections = lazy(() => import('../components/CheckingHealthSections'))
const DailyOpeningsTrend = lazy(() => import('../components/DailyOpeningsTrend'))
const PromotionBuilder = lazy(() => import('../components/PromotionBuilder'))
const WeeklyReport = lazy(() => import('../components/WeeklyReport'))
const ExportFigures = lazy(() => import('../components/ExportFigures'))

function SectionLoading({ label }: { label: string }) {
  return <p className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading {label}…</p>
}

/** Height of the sticky Checking tab bar, so a section scrolled into view isn't hidden under it. */
const TAB_BAR_OFFSET = 64

/**
 * Scrolls to an element once it is laid out. Tab content loads lazily (and may sit hidden while Suspense
 * resolves), so keep looking for a few seconds, then correct once more after the layout settles.
 */
function scrollToId(id: string, timeoutMs = 4000): () => void {
  let cancelled = false
  const start = Date.now()
  const timers: number[] = []
  const place = (el: HTMLElement) => {
    el.scrollIntoView({ block: 'start' })
    window.scrollBy(0, -TAB_BAR_OFFSET)
  }
  const tick = () => {
    if (cancelled) return
    const el = document.getElementById(id)
    if (el && el.getClientRects().length > 0) {
      place(el)
      const top = el.getBoundingClientRect().top
      // Charts above the target can still change height after the first paint.
      timers.push(window.setTimeout(() => !cancelled && Math.abs(el.getBoundingClientRect().top - top) > 4 && place(el), 500))
    } else if (Date.now() - start < timeoutMs) timers.push(window.setTimeout(tick, 50))
  }
  tick()
  return () => {
    cancelled = true
    timers.forEach(clearTimeout)
  }
}

export default function OpportunityInsights() {
  const { productId = '', tab } = useParams()
  const { hash, pathname } = useLocation()
  const opportunity = getOpportunity(productId)
  // Client-side navigation doesn't scroll to #anchors on its own (e.g. a home page KPI linking to its segment).
  useEffect(() => {
    if (hash) return scrollToId(decodeURIComponent(hash.slice(1)))
  }, [hash, pathname])
  if (!opportunity) return <Navigate to="/" replace />
  const isChecking = opportunity.productId === 'checking'
  // Checking always shows a tab. Old links without one (e.g. "/opportunities/checking#tracker-heading") go to the
  // tab that holds the anchor, or to Today. Savings and CD keep their single page.
  if (isChecking && !isCheckingTab(tab)) {
    const anchorTab = hash ? tabForAnchor(decodeURIComponent(hash.slice(1))) : undefined
    return <Navigate to={`${tabPath(anchorTab ?? DEFAULT_TAB)}${hash}`} replace />
  }
  if (!isChecking && tab) return <Navigate to={`/opportunities/${opportunity.productId}${hash}`} replace />
  // Keyed so slider adjustments reset when switching products (but not when switching Checking tabs).
  return <OpportunityDetail key={opportunity.productId} opportunity={opportunity} tab={isCheckingTab(tab) ? tab : null} />
}

function CheckingTabs({ active }: { active: CheckingTab }) {
  return (
    <nav id="checking-tabs" aria-label="Checking Insights sections" className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <ul className="relative mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
        {CHECKING_TABS.map((t, i) => (
          <li key={t.id} className="shrink-0">
            <NavLink
              to={tabPath(t.id)}
              title={t.blurb}
              className={`flex items-center gap-1.5 border-b-[3px] px-3 py-3 text-sm font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-blue ${
                t.id === active ? 'border-brand-orange text-brand-ink' : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-brand-ink'
              }`}
            >
              <span className="text-xs font-normal text-slate-400 tabular-nums">{i + 1}</span>
              {t.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function OpportunityDetail({ opportunity, tab }: { opportunity: ProductOpportunity; tab: CheckingTab | null }) {
  const { quarter } = reportingPeriod
  const kpi = getKpi(opportunity.focusKpiId)
  // "New CD Account Openings" already names its product; "New Account Openings" doesn't.
  const kpiName = kpi.label.includes(opportunity.shortName) ? kpi.label : `${opportunity.shortName} ${kpi.label}`
  // Sliders start (and reset) at each segment's last-quarter rate, so the default scenario is history,
  // not an assumption. Segments without history fall back to the planning rate in opportunities.ts.
  const baselineRates: Record<string, number> = Object.fromEntries(
    opportunity.segments.map((s) => [s.id, getRateReference(segmentHistory[s.id])?.last.rate ?? s.estimatedConversionRate]),
  )
  // The Product Owner's what-if conversion rates. Starts at the shared data; never written back to it.
  const [rates, setRates] = useState(baselineRates)
  // Promotion Builder (checking only): a preset to start from, or a saved campaign to edit.
  const [builder, setBuilder] = useState<{ presetId?: string; campaign?: SavedCampaign } | null>(null)
  const isChecking = opportunity.productId === 'checking'
  const [report, setReport] = useState<ReportSnapshot | null>(null)
  const [exporting, setExporting] = useState(false)
  const segments = opportunity.segments.map((s) => ({ ...s, estimatedConversionRate: rates[s.id] }))
  // Opportunity pages are shared by every dashboard: "Back" returns to the one the user came from.
  const backTo = useCurrentDashboard()
  const { state } = useDashboards()
  const { hash } = useLocation()
  useEffect(() => {
    if (!tab || hash) return
    const bar = document.getElementById('checking-tabs')
    const hero = bar?.previousElementSibling
    if (bar && hero && window.scrollY > hero.getBoundingClientRect().bottom + window.scrollY) {
      window.scrollTo({ top: hero.getBoundingClientRect().bottom + window.scrollY })
    }
  }, [tab, hash])

  // Customer Segments + Key Insight: the whole page on Savings/CD, the top of Diagnose on Checking.
  const segmentsAndInsight = (
    <>
      <SegmentTable
        segments={segments}
        accountNoun={opportunity.accountNoun}
        baselineRates={baselineRates}
        history={segmentHistory}
        onRateChange={(id, rate) => setRates((prev) => ({ ...prev, [id]: rate }))}
        onReset={() => setRates(baselineRates)}
        onDesignCampaign={
          isChecking
            ? (segmentId) => {
                const preset = presetForSource('segment', segmentId)
                if (preset) setBuilder({ presetId: preset.id })
              }
            : undefined
        }
      />
      <AIInsightPanel
        kpi={kpi}
        period={reportingPeriod}
        segments={segments}
        history={segmentHistory}
        scenarioAdjusted={segments.some((s) => s.estimatedConversionRate !== baselineRates[s.id])}
        openQuestions={opportunity.openQuestions}
        addendum={opportunity.productId === 'checking' ? <CheckingSummaryAddendum /> : undefined}
      />
    </>
  )

  return (
    <>
      <PageHero
        title={`${opportunity.shortName} Opportunity Intelligence`}
        eyebrow={
          <Link
            to={dashboardPath(backTo, state)}
            className="inline-flex items-center gap-1 rounded text-brand-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to {backTo.name}
          </Link>
        }
        icon={PRODUCT_ICONS[opportunity.productId]}
      >
        <p className="mt-4 max-w-2xl text-slate-700">
          Evidence, trade-offs, and open questions for {kpiName} in {quarter}. All figures
          are illustrative.
        </p>
        {isChecking && (
          <div className="mt-4 flex flex-wrap gap-2">
            <GenerateReportButton onOpen={setReport} />
            <button
              type="button"
              onClick={() => setExporting(true)}
              className="inline-flex items-center gap-1.5 rounded border border-brand-ink bg-white px-3 py-1.5 text-sm font-medium text-brand-ink hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
            >
              <ImageDown className="h-4 w-4" aria-hidden />
              Export figures
            </button>
          </div>
        )}
      </PageHero>

      {tab && <CheckingTabs active={tab} />}
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        {!tab ? (
          <>
            <ProductStatusStrip productId={opportunity.productId} />
            <GapSummary kpi={kpi} period={reportingPeriod} />
            {segmentsAndInsight}
          </>
        ) : tab === 'today' ? (
          <>
            <SinceLastVisit />
            <ActNow />
            <GapSummary kpi={kpi} period={reportingPeriod} />
            <Suspense fallback={<SectionLoading label="daily openings" />}>
              <DailyOpeningsTrend />
            </Suspense>
          </>
        ) : tab === 'diagnose' ? (
          <>
            {segmentsAndInsight}
            <Suspense fallback={<SectionLoading label="retention and account health" />}>
              <CheckingHealthSections tab="diagnose" quarter={quarter} onDesign={(presetId) => setBuilder({ presetId })} onEditCampaign={(campaign) => setBuilder({ campaign })} />
            </Suspense>
          </>
        ) : tab === 'act' || tab === 'market' ? (
          <Suspense fallback={<SectionLoading label={tab === 'act' ? 'campaigns' : 'market signals'} />}>
            <CheckingHealthSections tab={tab} quarter={quarter} onDesign={(presetId) => setBuilder({ presetId })} onEditCampaign={(campaign) => setBuilder({ campaign })} />
          </Suspense>
        ) : (
          <ReportTab onOpen={setReport} />
        )}
      </section>
      <Suspense fallback={null}>
        {report && <WeeklyReport key={report.id} report={report} onClose={() => setReport(null)} />}
        {exporting && <ExportFigures onClose={() => setExporting(false)} />}
        {builder && (
          <PromotionBuilder
          key={builder.campaign?.id ?? builder.presetId}
          presetId={builder.presetId}
          campaign={builder.campaign}
          onClose={() => setBuilder(null)}
          />
        )}
      </Suspense>
    </>
  )
}

/** Report tab: build this week's leadership report, or reopen a saved one. */
function ReportTab({ onOpen }: { onOpen: (r: ReportSnapshot) => void }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <section aria-labelledby="report-tab-heading" className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h2 id="report-tab-heading" className="heading-accent text-lg font-semibold text-brand-ink">
          Weekly leadership report
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-700">
          Builds a one-page snapshot from today's data: KPI status (original target first, plus any accepted re-forecast),
          the top 3 changes, campaign results, risks and early-warning signals, and the decisions needed from leadership.
          Every number comes from the same calculations as the other tabs. Save it to keep a frozen copy.
        </p>
        <div className="mt-4">
          <GenerateReportButton onOpen={onOpen} />
        </div>
        <p className="mt-3 text-xs text-slate-500">Illustrative · synthetic internal data.</p>
      </section>
      <ReportsHistory onOpen={onOpen} />
    </div>
  )
}
