import { Navigate, Route, Routes } from 'react-router-dom'
import pncLogo from './assets/pnc-logo-white.svg'
import Header from './components/Header'
import OpportunityInsights from './pages/OpportunityInsights'
import PortfolioOverview from './pages/PortfolioOverview'

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {/* Pages own their width so their hero band can span the screen. */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<PortfolioOverview />} />
          <Route path="/opportunities/:productId" element={<OpportunityInsights />} />
          <Route path="/cd-opportunities" element={<Navigate to="/opportunities/cd" replace />} />
        </Routes>
      </main>
      <footer className="pnc-pattern-dark bg-brand-ink">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-200 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <img src={pncLogo} alt="PNC" className="h-5 w-auto self-start sm:self-auto" />
          <p>Product Intelligence Hub prototype · All figures are synthetic and illustrative.</p>
        </div>
      </footer>
    </div>
  )
}
