import { Navigate, Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import OpportunityInsights from './pages/OpportunityInsights'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {/* Pages own their width so their hero band can span the screen. */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/d/:slug" element={<DashboardPage />} />
          <Route path="/opportunities/:productId" element={<OpportunityInsights />} />
          <Route path="/opportunities/:productId/:tab" element={<OpportunityInsights />} />
          <Route path="/cd-opportunities" element={<Navigate to="/opportunities/cd" replace />} />
        </Routes>
      </main>
      {/* Trust guard: this is a concept, not a PNC service. Quiet, on every page. */}
      <footer className="border-t border-line bg-white">
        <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-muted sm:px-6">
          Concept prototype for a case competition · Not an official PNC product · Illustrative data.
        </p>
      </footer>
    </div>
  )
}
