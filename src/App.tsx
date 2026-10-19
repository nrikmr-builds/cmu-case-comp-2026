import { Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import CDOpportunityIntelligence from './pages/CDOpportunityIntelligence'
import PortfolioOverview from './pages/PortfolioOverview'

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Routes>
          <Route path="/" element={<PortfolioOverview />} />
          <Route path="/cd-opportunities" element={<CDOpportunityIntelligence />} />
        </Routes>
      </main>
    </div>
  )
}
