import { Link } from 'react-router-dom'
import pncLogo from '../assets/pnc-logo.svg'
import { reportingPeriod } from '../data/productMetrics'

export default function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3 font-semibold text-brand-navy">
          <img src={pncLogo} alt="PNC" className="h-7 w-auto" />
          <span className="h-6 w-px bg-slate-300" aria-hidden />
          <span className="whitespace-nowrap">Product Intelligence Hub</span>
        </Link>
        <span className="hidden whitespace-nowrap text-sm font-medium text-slate-600 sm:inline">{reportingPeriod.quarter}</span>
      </div>
    </header>
  )
}
