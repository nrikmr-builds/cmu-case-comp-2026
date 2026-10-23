import { UserRound } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import pncLogo from '../assets/pnc-logo-white.svg'
import DataFreshness from './DataFreshness'
import { opportunities } from '../data/opportunities'
import { products, reportingPeriod } from '../data/productMetrics'
import { getStatus } from '../lib/metrics'

const hasAtRiskKpi = (productId: string) =>
  products
    .find((p) => p.id === productId)
    ?.kpis.some((kpi) => getStatus(kpi, reportingPeriod.quarterElapsed) === 'at-risk')

const NAV_ITEMS = [
  { to: '/', label: 'Portfolio Overview', atRisk: false },
  ...opportunities.map((o) => ({
    to: `/opportunities/${o.productId}`,
    label: `${o.shortName} Insights`,
    atRisk: hasAtRiskKpi(o.productId),
  })),
]

/** Two-tier dark header modeled on pnc.com. */
export default function Header() {
  return (
    <header>
      <div className="bg-brand-slate">
        <div className="mx-auto flex max-w-7xl items-stretch justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-stretch gap-6">
            <Link to="/" className="flex items-center py-3" aria-label="PNC Product Intelligence Hub home">
              <img src={pncLogo} alt="PNC" className="h-6 w-auto" />
            </Link>
            {/* Styled like the active segment tab on pnc.com. */}
            <span className="hidden items-center border-t-[3px] border-brand-orange bg-brand-charcoal px-4 text-xs font-semibold tracking-wider text-white uppercase sm:flex">
              Product Intelligence Hub
            </span>
          </div>
          <div className="flex items-center gap-4 py-2">
            <span className="hidden text-xs font-semibold tracking-wider text-slate-200 uppercase md:inline">
              {reportingPeriod.quarter}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-white px-2.5 py-1 text-[11px] font-semibold tracking-wider text-brand-ink uppercase">
              <UserRound className="h-3.5 w-3.5" aria-hidden />
              Product Owner
            </span>
          </div>
        </div>
      </div>

      <nav aria-label="Main" className="bg-brand-charcoal">
        <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
          {NAV_ITEMS.map(({ to, label, atRisk }) => (
            <li key={to} className="shrink-0">
              <NavLink
                to={to}
                end
                className={({ isActive }) =>
                  `flex items-center gap-1.5 border-b-[3px] px-3 py-3 text-xs font-semibold tracking-wider whitespace-nowrap text-white uppercase focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white ${
                    isActive ? 'border-brand-orange' : 'border-transparent hover:border-white/40'
                  }`
                }
              >
                {label}
                {/* Label lives on the dot, so the tab's own name stays "Checking Insights". */}
                {atRisk && <span role="img" aria-label="At risk" title="Has an at-risk KPI" className="h-2 w-2 rounded-full bg-red-500" />}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <DataFreshness />
    </header>
  )
}
