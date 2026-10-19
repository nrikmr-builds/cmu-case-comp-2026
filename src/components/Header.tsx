import { BarChart3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { reportingPeriod } from '../data/productMetrics'

export default function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold text-brand-navy">
          <BarChart3 className="h-6 w-6 text-brand-orange" aria-hidden />
          PNC Product Intelligence Hub
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">Synthetic data</span>
          <span className="font-medium text-slate-600">{reportingPeriod.quarter}</span>
        </div>
      </div>
    </header>
  )
}
