import { Megaphone, Pencil, Trash2 } from 'lucide-react'
import { activationFunnel, checkingTerms, feeCohorts, pncComparisonRow, riskSegments, savingsLink } from '../data/checkingHealth'
import { campaignPresets, TEMPLATE_IDS } from '../data/campaignPresets'
import { marketSignals } from '../data/marketSignals'
import { getKpi, reportingPeriod } from '../data/productMetrics'
import { computeEconomics, feeClosureGap, getAudienceSource } from '../lib/campaignEconomics'
import { formatUsd, getExcessFeeClosures, getNeverActivated, getTotalFunnel } from '../lib/checkingHealth'
import { CAMPAIGN_STATUSES, useCampaigns, type CampaignStatus, type SavedCampaign } from '../lib/campaignStore'
import { formatValue, getStatus } from '../lib/metrics'
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
  onEdit: (campaign: SavedCampaign) => void
}

export default function CampaignCenter({ onDesign, onEdit }: Props) {
  const { campaigns, setStatus, deleteCampaign } = useCampaigns()
  const templates = TEMPLATE_IDS.map((id) => campaignPresets.find((p) => p.id === id)).filter((p) => p !== undefined)

  return (
    <SectionCard
      id="campaigns-heading"
      title="Design a Campaign"
      source="internal"
      description="Start from a template, or use “Design campaign” on any segment row or risk card. Acquisition campaigns add new openings; retention campaigns save existing accounts."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((t) => {
          const source = getAudienceSource(t)
          return (
            <article key={t.id} className="flex flex-col rounded-lg border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-brand-ink">{t.name}</h4>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${t.kind === 'acquisition' ? 'bg-blue-50 text-brand-blue' : 'bg-green-50 text-green-800'}`}>
                  {t.kind === 'acquisition' ? 'Acquisition' : 'Retention'}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Audience: {source.label} ({accounts(source.size)})
              </p>
              <p className="mt-1 text-sm text-slate-700">{t.offer.extra}</p>
              <p className="mt-2 flex-1 text-xs text-slate-600">
                <span className="font-medium">Why:</span> {templateRationale(t.id)}
              </p>
              <button
                type="button"
                onClick={() => onDesign(t.id)}
                className="mt-3 inline-flex items-center gap-1 self-start rounded bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
              >
                <Megaphone className="h-4 w-4" aria-hidden />
                Use template
              </button>
            </article>
          )
        })}
      </div>

      <h4 className="mt-6 text-sm font-semibold text-brand-ink">Saved campaigns ({campaigns.length})</h4>
      {campaigns.length === 0 ? (
        <p className="mt-1 text-sm text-slate-500">None yet. Saved campaigns appear here and in the Campaign Tracker.</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="py-2 pr-3 font-medium">Campaign</th>
                <th scope="col" className="py-2 pr-3 font-medium">Type</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Treated</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Expected</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Cost</th>
                <th scope="col" className="py-2 pr-3 font-medium">Status</th>
                <th scope="col" className="py-2 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.map((c) => {
                const e = computeEconomics(c.inputs)
                return (
                  <tr key={c.id} className="align-top">
                    <th scope="row" className="py-2 pr-3 font-medium text-brand-ink">
                      {c.inputs.name}
                      <span className="block text-xs font-normal text-slate-500">{c.inputs.sourceLabel}</span>
                    </th>
                    <td className="py-2 pr-3">{c.inputs.kind === 'acquisition' ? 'Acquisition' : 'Retention'}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{accounts(e.treated)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {accounts(e.outcomes)} {c.inputs.kind === 'acquisition' ? 'openings' : 'saved'}
                      <span className="block text-xs text-slate-500">{accounts(e.timing.q3)} in Q3</span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatUsd(e.costs.total)}</td>
                    <td className="py-2 pr-3">
                      <select
                        value={c.status}
                        onChange={(ev) => setStatus(c.id, ev.target.value as CampaignStatus)}
                        aria-label={`Status of ${c.inputs.name}`}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        {CAMPAIGN_STATUSES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 whitespace-nowrap">
                      <button type="button" onClick={() => onEdit(c)} className="mr-1 inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs text-brand-blue hover:bg-slate-50" aria-label={`Edit ${c.inputs.name}`}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                      </button>
                      <button type="button" onClick={() => deleteCampaign(c.id)} className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs text-brand-blue hover:bg-slate-50" aria-label={`Delete ${c.inputs.name}`}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}
