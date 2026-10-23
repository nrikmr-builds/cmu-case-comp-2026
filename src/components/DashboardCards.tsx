// Cards for user dashboards. Every card reuses an existing component or calculation; nothing here invents a metric.
// A request the data layer can't answer becomes a labelled placeholder with no numbers.
import { ArrowRight, Bell, Database, Megaphone, Target, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { marketSignals } from '../data/marketSignals'
import { opportunities } from '../data/opportunities'
import { getKpi, products, reportingPeriod } from '../data/productMetrics'
import { useCampaigns } from '../lib/campaignStore'
import { getTotals } from '../lib/campaignTracking'
import { checkingHref } from '../lib/checkingTabs'
import { cardTitle, type DashboardCard } from '../lib/dashboards'
import { daysUntil, expiryLabel } from '../lib/dailyTracking'
import { formatPercent, formatValue, getAttainment, getPaceRatio, getStatus } from '../lib/metrics'
import { ACTION_META, ACTION_ORDER, compareArms, nbaRollup } from '../lib/nextBestAction'
import { formatDate } from '../lib/projection'
import { defaultPlanner } from '../lib/scenarioPlanner'
import { useTriggeredAlerts } from '../lib/trackingStore'
import type { KpiStatus, ProductId } from '../types'
import { TrackerTotals } from './CampaignTracker'
import DailyOpeningsTrend from './DailyOpeningsTrend'
import GapSummary from './GapSummary'
import KPIProgressBar from './KPIProgressBar'
import ProductCard from './ProductCard'
import SinceLastVisit from './SinceLastVisit'
import StatusBadge from './StatusBadge'

const n = (x: number) => formatValue(x, 'accounts')
const INTERNAL = `Internal · Illustrative · refreshed ${formatDate(reportingPeriod.internalAsOf)}`
const externalRetrieved = marketSignals.map((s) => s.retrievedOn).sort().at(-1)
const productPath = (p: ProductId) => `/opportunities/${p}`

interface Props {
  card: DashboardCard
  /** Optional status filter: KPI and product cards show only these statuses. */
  filter?: KpiStatus[]
  /** A saved or generated view of the dashboard narrows product cards to these KPIs. */
  onlyKpiIds?: string[]
  onReport: () => void
}

export default function DashboardCardView({ card, filter, onlyKpiIds, onReport }: Props) {
  switch (card.type) {
    case 'kpi':
      return <KpiCard kpiId={card.kpiId ?? ''} />
    case 'product': {
      const product = products.find((p) => p.id === card.productId)
      if (!product) return null
      const kpis = product.kpis
        .filter((k) => !filter || filter.includes(getStatus(k, reportingPeriod.quarterElapsed)))
        .filter((k) => !onlyKpiIds || onlyKpiIds.includes(k.id))
      if (kpis.length === 0)
        return (
          <Shell card={card} source={INTERNAL}>
            <p className="text-sm text-muted">No {product.name} KPIs match this view.</p>
          </Shell>
        )
      return (
        <div className="space-y-1">
          <ProductCard product={{ ...product, kpis }} quarterElapsed={reportingPeriod.quarterElapsed} detailPath={productPath(product.id)} />
          <SourceLine text={INTERNAL} />
        </div>
      )
    }
    case 'what-changed':
      return (
        <div className="space-y-1">
          <SinceLastVisit compact />
          <SourceLine text={INTERNAL} />
        </div>
      )
    case 'gap': {
      const opp = opportunities.find((o) => o.productId === card.productId)
      if (!opp) return null
      return (
        <div className="space-y-1">
          <GapSummary kpi={getKpi(opp.focusKpiId)} period={reportingPeriod} headingId={`gap-heading-${opp.productId}`} />
          <SourceLine text={INTERNAL} link={{ to: card.productId === 'checking' ? checkingHref('gap-heading') : productPath(opp.productId), label: `Open ${opp.shortName} insights` }} />
        </div>
      )
    }
    case 'daily':
      return (
        <div className="space-y-1">
          <DailyOpeningsTrend />
          <SourceLine text={INTERNAL} link={{ to: checkingHref('daily-heading'), label: 'Open Checking · Today' }} />
        </div>
      )
    case 'alerts':
      return <AlertsCard card={card} />
    case 'tracker':
      return <TrackerCard card={card} />
    case 'planner':
      return <PlannerCard card={card} />
    case 'nba':
      return <NbaCard card={card} />
    case 'offers':
      return <OffersCard card={card} />
    case 'report':
      return (
        <Shell card={card} source={INTERNAL}>
          <p className="text-sm text-body">One click builds a leadership report that covers only this dashboard’s cards and KPIs.</p>
          <button type="button" onClick={onReport} className="btn btn-primary mt-3">
            Generate weekly report
          </button>
        </Shell>
      )
    case 'placeholder':
      return (
        <Shell card={card} source="No data source yet" icon={<Database className="h-4 w-4" aria-hidden />}>
          <p className="rounded-sm border border-dashed border-line-strong bg-surface-subtle p-3 text-sm text-body">
            <strong>Needs a data source:</strong> in production the AI writes this query once, then it’s approved and refreshed on schedule.
          </p>
          <p className="mt-2 text-xs text-muted">Requested: “{card.request}”. No numbers are shown until an approved source exists.</p>
        </Shell>
      )
  }
}

function SourceLine({ text, link }: { text: string; link?: { to: string; label: string } }) {
  return (
    <p className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted">
      <span>Source · {text}</span>
      {link && (
        <Link to={link.to} className="inline-flex items-center gap-1 font-medium text-brand-blue hover:underline">
          {link.label} <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      )}
    </p>
  )
}

function Shell({ card, source, icon, link, children }: { card: DashboardCard; source: string; icon?: ReactNode; link?: { to: string; label: string }; children: ReactNode }) {
  return (
    <section className="flex h-full flex-col card p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-brand-ink">
        {icon}
        {cardTitle(card)}
      </h3>
      <div className="mt-2 flex-1">{children}</div>
      <div className="mt-3 border-t border-line pt-2">
        <SourceLine text={source} link={link} />
      </div>
    </section>
  )
}

function KpiCard({ kpiId }: { kpiId: string }) {
  const kpi = products.flatMap((p) => p.kpis).find((k) => k.id === kpiId)
  if (!kpi) return null
  const q = reportingPeriod.quarterElapsed
  const status = getStatus(kpi, q)
  const card: DashboardCard = { id: `kpi:${kpiId}`, type: 'kpi', kpiId }
  return (
    <Shell card={card} source={INTERNAL} icon={<Target className="h-4 w-4" aria-hidden />} link={{ to: kpi.productId === 'checking' ? '/opportunities/checking/today' : productPath(kpi.productId), label: 'Open insights' }}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xl font-semibold tabular-nums text-brand-ink">{formatValue(kpi.actual, kpi.unit)}</p>
        <StatusBadge status={status} />
      </div>
      <p className="text-xs text-muted">
        Target {formatValue(kpi.target, kpi.unit)} · {formatPercent(getPaceRatio(kpi, q))} of {kpi.kind === 'rate' ? 'target' : 'expected pace'}
      </p>
      <div className="mt-2">
        <KPIProgressBar attainment={getAttainment(kpi)} status={status} label={`${kpi.label} progress toward target`} />
      </div>
    </Shell>
  )
}

function AlertsCard({ card }: { card: DashboardCard }) {
  const alerts = useTriggeredAlerts()
  return (
    <Shell card={card} source={INTERNAL} icon={<Bell className="h-4 w-4" aria-hidden />} link={{ to: checkingHref('since-heading'), label: 'Alert rules' }}>
      {alerts.length === 0 ? (
        <p className="text-sm text-muted">No alerts triggered.</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {alerts.map((a) => (
            <li key={a.rule.id} className="text-critical">
              <strong>{a.title}</strong>
              <span className="block text-xs text-muted">{a.evidence}</span>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  )
}

function TrackerCard({ card }: { card: DashboardCard }) {
  const { campaigns } = useCampaigns()
  return (
    <Shell card={card} source={INTERNAL} icon={<Megaphone className="h-4 w-4" aria-hidden />} link={{ to: checkingHref('tracker-heading'), label: 'Open the Campaign Tracker' }}>
      <TrackerTotals totals={getTotals(campaigns)} />
    </Shell>
  )
}

function PlannerCard({ card }: { card: DashboardCard }) {
  const { campaigns } = useCampaigns()
  const p = defaultPlanner(campaigns)
  return (
    <Shell card={card} source={INTERNAL} link={{ to: checkingHref('planner-heading'), label: 'Open the Scenario Planner' }}>
      <p className="text-sm text-body">
        Q3 openings land at <strong>{n(p.landing)}</strong> at the headline pace ({n(p.headlineProjected)} + {n(p.countedIncremental)} incremental from{' '}
        {p.included.length} campaigns) vs. the {n(p.target)} target.
      </p>
      <p className="mt-1 text-xs text-muted">
        Range {n(p.low)}–{n(p.high)} (uplift is an assumption) · at the reference pace {n(p.referenceLanding)}.
      </p>
    </Shell>
  )
}

function NbaCard({ card }: { card: DashboardCard }) {
  const r = nbaRollup()
  const be = compareArms(0).breakEven
  return (
    <Shell card={card} source={INTERNAL} icon={<Users className="h-4 w-4" aria-hidden />} link={{ to: checkingHref('nba-heading'), label: 'Open next best action' }}>
      <p className="text-sm text-body">{n(r.total)} direct-deposit-leaving customers, one explained action each:</p>
      <ul className="mt-1 grid grid-cols-2 gap-x-3 text-xs text-body">
        {ACTION_ORDER.map((a) => (
          <li key={a} className="flex justify-between">
            <span>{ACTION_META[a].short}</span>
            <span className="tabular-nums">{n(r.counts[a])}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">Personalisation beats the blanket offer only if matched offers convert at least {Math.ceil(be * 100)}% better.</p>
    </Shell>
  )
}

function OffersCard({ card }: { card: DashboardCard }) {
  const ending = marketSignals
    .map((s) => ({ s, left: daysUntil(s.offer?.expires, s.retrievedOn) }))
    .filter((x): x is { s: (typeof marketSignals)[number]; left: number } => x.left !== undefined && x.left >= 0 && x.left <= 30)
    .sort((a, b) => a.left - b.left)
  return (
    <Shell card={card} source={`External · sourced · retrieved ${externalRetrieved ? formatDate(externalRetrieved) : '—'}`} link={{ to: checkingHref('offers-heading'), label: 'Open Checking · Market' }}>
      {ending.length === 0 ? (
        <p className="text-sm text-muted">No competitor offers end within 30 days.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {ending.map(({ s, left }) => (
            <li key={s.id}>
              <strong>{s.competitor ?? s.source}</strong>: {expiryLabel(left, s.retrievedOn)}
            </li>
          ))}
        </ul>
      )}
    </Shell>
  )
}
