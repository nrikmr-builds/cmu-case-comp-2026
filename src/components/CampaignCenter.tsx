import { Link } from 'react-router-dom'
import { checkingHref } from '../lib/checkingTabs'
import { Megaphone } from 'lucide-react'
import { activationFunnel, checkingTerms, feeCohorts, pncComparisonRow, riskSegments, savingsLink } from '../data/checkingHealth'
import { campaignPresets, TEMPLATE_IDS } from '../data/campaignPresets'
import { marketSignals } from '../data/marketSignals'
import { getKpi, reportingPeriod } from '../data/productMetrics'
import { feeClosureGap, getAudienceSource } from '../lib/campaignEconomics'
import { formatUsd, getExcessFeeClosures, getNeverActivated, getTotalFunnel } from '../lib/checkingHealth'
import { useCampaigns } from '../lib/campaignStore'
import { formatValue, getStatus } from '../lib/metrics'
import { KindBadge } from './PromotionBuilder'
import SectionCard from './SectionCard'

const accounts = (n: number) => formatValue(n, 'accounts')
const pct = (x: number) => `${(x * 100).toFixed(1)}%`

/** Why each template exists, built from the dashboard's own numbers. */
function templateRationale(id: string): string {
  switch (id) {
    case 'primacy-bonus': {
      const bonuses = marketSignals.filter((s) => s.category === 'competitor-promo' && s.offer?.bonusUsd).map((s) => s.offer?.bonusUsd ?? 0)
      const higher = bonuses.filter((b) => b > (pncComparisonRow.bonusUsd ?? 0)).length
      const never = getNeverActivated(getTotalFunnel(activationFunnel))
      return `PNC's ${formatUsd(pncComparisonRow.bonusUsd ?? 0)} / $500 direct-deposit offer (illustrative) is below ${higher} of ${bonuses.length} sourced competitor bonuses, and its low requirement may feed the ${pct(never.share)} of new accounts that never activate.`
    }
    case 'first-fee-forgiveness': {
      const fee = feeCohorts.find((c) => c.id === 'first-fee')
      const none = feeCohorts.find((c) => c.id === 'no-fee')
      const g = feeClosureGap()
      if (!fee || !none) return ''
      const extra = getExcessFeeClosures(fee, none)
      const revenue = fee.accounts * checkingTerms.monthlyMaintenanceFee
      return `First-fee closures ${pct(g.feeRate)} vs. ${pct(g.noFeeRate)}: about ${accounts(extra)} extra closures for ${formatUsd(revenue)} of fees, so ≈ ${formatUsd(revenue / extra)} of fee revenue per extra closed account.`
    }
    case 'savings-bundle': {
      const g = savingsLink.find((x) => x.id === 'no-pnc-savings')
      return `${accounts(g?.recurringExternalSavingsTransfers ?? 0)} checking customers with no PNC savings send money to savings elsewhere: PNC already holds the paycheck while another bank holds the savings.`
    }
    case 'application-rescue': {
      const ref = getAudienceSource(campaignPresets.find((p) => p.id === id)!).history
      const kpi = getKpi('checking-digital-completion')
      const status = getStatus(kpi, reportingPeriod.quarterElapsed)
      return `Fastest in-quarter win: abandoned applications converted at ${ref ? pct(ref.last.rate) : '—'} last quarter. Also works on the Digital Opening Completion KPI (${status === 'watch' ? 'Watch' : status}).`
    }
    case 'activation-nudge': {
      const seg = riskSegments.find((s) => s.id === 'never-activated')
      return `${accounts(seg?.eligibleCustomers ?? 0)} accounts 30–60 days old have never used their debit card; the window to build the habit is closing.`
    }
    default:
      return ''
  }
}

interface Props {
  onDesign: (presetId: string) => void
}

export default function CampaignCenter({ onDesign }: Props) {
  const { campaigns } = useCampaigns()
  const templates = TEMPLATE_IDS.map((id) => campaignPresets.find((p) => p.id === id)).filter((p) => p !== undefined)

  return (
    <SectionCard
      id="campaigns-heading"
      title="Design a Campaign"
      source="internal"
      description="Start from a template, or use “Design campaign” on any segment row or risk card. Acquisition adds new openings (only the uplift over business as usual counts), retention keeps or activates existing accounts, and cross-sell deepens existing customers."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((t) => {
          const source = getAudienceSource(t)
          return (
            <article key={t.id} className="flex flex-col rounded-sm border border-line p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h4 className="font-semibold text-brand-ink">{t.name}</h4>
                <KindBadge kind={t.kind} outcome={t.outcome} />
              </div>
              <p className="mt-1 text-xs text-muted">
                Audience: {source.label} ({accounts(source.size)})
              </p>
              <p className="mt-1 text-sm text-body">{t.offer.extra}</p>
              <p className="mt-2 flex-1 text-xs text-muted">
                <span className="font-medium">Why:</span> {templateRationale(t.id)}
              </p>
              <button
                type="button"
                onClick={() => onDesign(t.id)}
                className="btn btn-secondary mt-3 self-start"
              >
                <Megaphone className="h-4 w-4" aria-hidden />
                Use template
              </button>
            </article>
          )
        })}
      </div>

      <p className="mt-3 text-xs text-muted">
        Campaign effects aren't additive. Audiences and baselines can overlap, so don't sum campaigns to close a gap.
      </p>

      <p className="mt-2 text-sm text-muted">
        Saved campaigns ({campaigns.length}) appear in the{' '}
        <Link to={checkingHref('tracker-heading')} className="font-medium text-brand-blue hover:underline">
          Campaign Tracker
        </Link>{' '}
        below, with seeded examples.
      </p>
    </SectionCard>
  )
}
