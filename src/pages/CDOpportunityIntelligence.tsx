// Owner: Kem (Developer 2). Shows evidence and trade-offs; the decision stays with the Product Owner.
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import AIInsightPanel from '../components/AIInsightPanel'
import GapSummary from '../components/GapSummary'
import SegmentTable from '../components/SegmentTable'
import { cdCustomerSegments } from '../data/cdSegments'
import { cdAcquisitionMetric, reportingPeriod } from '../data/productMetrics'

const baselineRates: Record<string, number> = Object.fromEntries(
  cdCustomerSegments.map((s) => [s.id, s.estimatedConversionRate]),
)

export default function CDOpportunityIntelligence() {
  const { quarter, quarterElapsed } = reportingPeriod
  // The Product Owner's what-if conversion rates. Starts at the shared data; never written back to it.
  const [rates, setRates] = useState(baselineRates)
  const segments = cdCustomerSegments.map((s) => ({ ...s, estimatedConversionRate: rates[s.id] }))

  return (
    <section className="space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1 rounded font-medium text-brand-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to Portfolio
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-brand-navy">CD Opportunity Intelligence</h1>
        <p className="mt-1 text-slate-600">
          Evidence, trade-offs, and open questions behind the CD openings gap for {quarter}. All figures are
          illustrative.
        </p>
      </div>

      <GapSummary kpi={cdAcquisitionMetric} quarter={quarter} quarterElapsed={quarterElapsed} />
      <SegmentTable
        segments={segments}
        baselineRates={baselineRates}
        onRateChange={(id, rate) => setRates((prev) => ({ ...prev, [id]: rate }))}
        onReset={() => setRates(baselineRates)}
      />
      <AIInsightPanel kpi={cdAcquisitionMetric} quarterElapsed={quarterElapsed} segments={segments} />
    </section>
  )
}
