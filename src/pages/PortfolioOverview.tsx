// Owner: Nripesh (Developer 1). Placeholder until the landing page is built.
import { Link } from 'react-router-dom'

export default function PortfolioOverview() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-brand-navy">Portfolio Overview</h1>
      <p className="text-slate-600">Placeholder: product cards, KPIs, and status go here.</p>
      <Link to="/cd-opportunities" className="font-medium text-brand-blue underline">
        Go to CD Opportunity Intelligence
      </Link>
    </section>
  )
}
