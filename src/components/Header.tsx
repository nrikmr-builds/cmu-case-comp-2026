import { Bell, Plus, UserRound } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import pncLogo from '../assets/pnc-logo-white.svg'
import DashboardSwitcher from './DashboardSwitcher'
import { NewDashboardHost } from './DashboardEditor'
import DataFreshness from './DataFreshness'
import GuidedTour from './GuidedTour'
import HeaderSettings from './HeaderSettings'
import { opportunities } from '../data/opportunities'
import { products, reportingPeriod } from '../data/productMetrics'
import { getStatus } from '../lib/metrics'
import { useTriggeredAlerts } from '../lib/trackingStore'
import { createDialog, dashboardPath, useDashboards } from '../lib/dashboards'
import { useCurrentDashboard } from '../lib/useCurrentDashboard'

const hasAtRiskKpi = (productId: string) =>
  products
    .find((p) => p.id === productId)
    ?.kpis.some((kpi) => getStatus(kpi, reportingPeriod.quarterElapsed) === 'at-risk')

// "Dashboards" (first) opens the current dashboard; the switcher is how you change dashboards.
const NAV_ITEMS = [
  ...opportunities.map((o) => ({
    to: `/opportunities/${o.productId}`,
    label: `${o.shortName} Insights`,
    atRisk: hasAtRiskKpi(o.productId),
    // Alert rules only watch checking data today.
    hasAlerts: o.productId === 'checking',
  })),
]

/** Two-tier dark header modeled on pnc.com. */
export default function Header() {
  const alertCount = useTriggeredAlerts().length
  const { pathname } = useLocation()
  const current = useCurrentDashboard()
  const { state } = useDashboards()
  const onDashboard = pathname === '/' || pathname.startsWith('/d/')
  return (
    <header>
      <div className="on-dark bg-brand-slate">
        <div className="mx-auto flex max-w-7xl items-stretch justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-stretch gap-6">
            <Link to="/" className="flex items-center py-3" aria-label="PNC Product Intelligence Hub home">
              <img src={pncLogo} alt="PNC" className="h-6 w-auto" />
            </Link>
            {/* Styled like the active segment tab on pnc.com. */}
            <span className="hidden items-center border-t-[3px] border-brand-orange bg-brand-charcoal px-4 text-xs font-semibold text-white sm:flex">
              Product Intelligence Hub
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2 py-2 sm:gap-4">
            <div className="flex min-w-0 items-center gap-1.5">
              <DashboardSwitcher />
              <button
                type="button"
                onClick={() => createDialog.open()}
                title="New dashboard"
                aria-label="New dashboard"
                className="btn btn-secondary btn-sm btn-icon shrink-0"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <span className="hidden text-xs font-semibold text-line md:inline">
              {reportingPeriod.quarter}
            </span>
            <span className="hidden items-center gap-1.5 rounded-sm bg-white px-2.5 py-1 text-xs font-semibold text-brand-ink sm:inline-flex">
              <UserRound className="h-3.5 w-3.5" aria-hidden />
              Product Owner
            </span>
            <HeaderSettings />
          </div>
        </div>
      </div>

      <nav aria-label="Main" className="bg-brand-charcoal">
        <ul className="relative mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
          <li className="shrink-0">
            <Link
              to={dashboardPath(current, state)}
              aria-current={onDashboard ? 'page' : undefined}
              className="tab text-white focus-visible:outline-white"
            >
              Dashboards
            </Link>
          </li>
          {NAV_ITEMS.map(({ to, label, atRisk, hasAlerts }) => (
            <li key={to} className="shrink-0">
              <NavLink to={to} className="tab text-white focus-visible:outline-white">
                {label}
                {/* Label lives on the dot, so the tab's own name stays "Checking Insights". */}
                {atRisk && <span role="img" aria-label="At risk" title="Has an at-risk KPI" className="h-2 w-2 rounded-full bg-critical" />}
                {hasAlerts && alertCount > 0 && (
                  <span
                    className="inline-flex items-center gap-0.5 rounded-full bg-critical px-1.5 py-0.5 text-xs leading-none font-semibold text-white"
                    title={`${alertCount} alert${alertCount === 1 ? '' : 's'} triggered`}
                  >
                    <Bell className="h-3 w-3" aria-hidden />
                    {alertCount}
                    <span className="sr-only"> alert{alertCount === 1 ? '' : 's'} triggered</span>
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <DataFreshness />
      <GuidedTour />
      <NewDashboardHost />
    </header>
  )
}
