// Owner: Kem (Developer 2). Shows evidence and trade-offs; the decision stays with the Product Owner.
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import AIInsightPanel from '../components/AIInsightPanel'
import CheckingHealthSections from '../components/CheckingHealthSections'
import CheckingSummaryAddendum from '../components/CheckingSummaryAddendum'
import DailyOpeningsTrend from '../components/DailyOpeningsTrend'
import PromotionBuilder from '../components/PromotionBuilder'
import GapSummary from '../components/GapSummary'
import PageHero from '../components/PageHero'
import SegmentTable from '../components/SegmentTable'
import SinceLastVisit from '../components/SinceLastVisit'
import { presetForSource } from '../data/campaignPresets'
import { getOpportunity } from '../data/opportunities'
import { getKpi, reportingPeriod } from '../data/productMetrics'
import { segmentHistory } from '../data/segmentHistory'
import { PRODUCT_ICONS } from '../lib/productIcons'
import { getRateReference } from '../lib/segmentHistory'
import type { SavedCampaign } from '../lib/campaignStore'
import type { ProductOpportunity } from '../types'

export default function OpportunityInsights() {
  const { productId = '' } = useParams()
  const { hash } = useLocation()
  const opportunity = getOpportunity(productId)
  // Client-side navigation doesn't scroll to #anchors on its own (e.g. a home page KPI linking to its segment).
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' })
  }, [hash, productId])
  if (!opportunity) return <Navigate to="/" replace />
  // Keyed so slider adjustments reset when switching products.
  return <OpportunityDetail key={opportunity.productId} opportunity={opportunity} />
}

function OpportunityDetail({ opportunity }: { opportunity: ProductOpportunity }) {
  const { quarter } = reportingPeriod
  const kpi = getKpi(opportunity.focusKpiId)
  // "New CD Account Openings" already names its product; "New Account Openings" doesn't.
  const kpiName = kpi.label.includes(opportunity.shortName) ? kpi.label : `${opportunity.shortName} ${kpi.label}`
  // Sliders start (and reset) at each segment's last-quarter rate, so the default scenario is history,
  // not an assumption. Segments without history fall back to the planning rate in opportunities.ts.
  const baselineRates: Record<string, number> = Object.fromEntries(
    opportunity.segments.map((s) => [s.id, getRateReference(segmentHistory[s.id])?.last.rate ?? s.estimatedConversionRate]),
  )
  // The Product Owner's what-if conversion rates. Starts at the shared data; never written back to it.
  const [rates, setRates] = useState(baselineRates)
  // Promotion Builder (checking only): a preset to start from, or a saved campaign to edit.
  const [builder, setBuilder] = useState<{ presetId?: string; campaign?: SavedCampaign } | null>(null)
  const isChecking = opportunity.productId === 'checking'
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
        {opportunity.productId === 'checking' && <SinceLastVisit />}
        <GapSummary kpi={kpi} period={reportingPeriod} />
        {opportunity.productId === 'checking' && <DailyOpeningsTrend />}
        <SegmentTable
          segments={segments}
          accountNoun={opportunity.accountNoun}
          baselineRates={baselineRates}
          history={segmentHistory}
          onRateChange={(id, rate) => setRates((prev) => ({ ...prev, [id]: rate }))}
          onReset={() => setRates(baselineRates)}
          onDesignCampaign={
            isChecking
              ? (segmentId) => {
                  const preset = presetForSource('segment', segmentId)
                  if (preset) setBuilder({ presetId: preset.id })
                }
              : undefined
          }
        />
        <AIInsightPanel
          kpi={kpi}
          period={reportingPeriod}
          segments={segments}
          history={segmentHistory}
          scenarioAdjusted={segments.some((s) => s.estimatedConversionRate !== baselineRates[s.id])}
          openQuestions={opportunity.openQuestions}
          addendum={opportunity.productId === 'checking' ? <CheckingSummaryAddendum /> : undefined}
        />
        {isChecking && (
          <CheckingHealthSections
            quarter={quarter}
            onDesign={(presetId) => setBuilder({ presetId })}
            onEditCampaign={(campaign) => setBuilder({ campaign })}
          />
        )}
      </section>
      {builder && (
        <PromotionBuilder
          key={builder.campaign?.id ?? builder.presetId}
          presetId={builder.presetId}
          campaign={builder.campaign}
          onClose={() => setBuilder(null)}
        />
      )}
    </>
  )
}
