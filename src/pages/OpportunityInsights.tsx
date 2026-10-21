// Owner: Kem (Developer 2). Shows evidence and trade-offs; the decision stays with the Product Owner.
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import AIInsightPanel from '../components/AIInsightPanel'
import GapSummary from '../components/GapSummary'
import PageHero from '../components/PageHero'
import SegmentTable from '../components/SegmentTable'
import { getOpportunity } from '../data/opportunities'
import { getKpi, reportingPeriod } from '../data/productMetrics'
import { PRODUCT_ICONS } from '../lib/productIcons'
import type { ProductOpportunity } from '../types'

export default function OpportunityInsights() {
  const { productId = '' } = useParams()
  const opportunity = getOpportunity(productId)
  if (!opportunity) return <Navigate to="/" replace />
  // Keyed so slider adjustments reset when switching products.
  return <OpportunityDetail key={opportunity.productId} opportunity={opportunity} />
}

function OpportunityDetail({ opportunity }: { opportunity: ProductOpportunity }) {
  const { quarter, quarterElapsed } = reportingPeriod
  const kpi = getKpi(opportunity.focusKpiId)
  // "New CD Account Openings" already names its product; "New Account Openings" doesn't.
  const kpiName = kpi.label.includes(opportunity.shortName) ? kpi.label : `${opportunity.shortName} ${kpi.label}`
  const baselineRates: Record<string, number> = Object.fromEntries(
    opportunity.segments.map((s) => [s.id, s.estimatedConversionRate]),
  )
  // The Product Owner's what-if conversion rates. Starts at the shared data; never written back to it.
  const [rates, setRates] = useState(baselineRates)
  const segments = opportunity.segments.map((s) => ({ ...s, estimatedConversionRate: rates[s.id] }))

  return (
    <>
      <PageHero
        title={`${opportunity.shortName} Opportunity Intelligence`}
        eyebrow={
          <Link
            to="/"
            className="inline-flex items-center gap-1 rounded text-brand-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to Portfolio
          </Link>
        }
        icon={PRODUCT_ICONS[opportunity.productId]}
      >
        <p className="mt-4 max-w-2xl text-slate-700">
          Evidence, trade-offs, and open questions for {kpiName} in {quarter}. All figures
          are illustrative.
        </p>
      </PageHero>

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <GapSummary kpi={kpi} quarter={quarter} quarterElapsed={quarterElapsed} />
        <SegmentTable
          segments={segments}
          accountNoun={opportunity.accountNoun}
          baselineRates={baselineRates}
          onRateChange={(id, rate) => setRates((prev) => ({ ...prev, [id]: rate }))}
          onReset={() => setRates(baselineRates)}
        />
        <AIInsightPanel
          kpi={kpi}
          quarterElapsed={quarterElapsed}
          segments={segments}
          openQuestions={opportunity.openQuestions}
        />
      </section>
    </>
  )
}
