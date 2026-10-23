import {
  activationFunnel,
  checkingTerms,
  currentQuarterHealth,
  dropOffSignals,
  feeCohorts,
  healthMixHistory,
  riskSegments,
  pncComparisonRow,
  savingsLink,
} from '../data/checkingHealth'
import { presetForSource } from '../data/campaignPresets'
import { marketSignals } from '../data/marketSignals'
import { getKpi } from '../data/productMetrics'
import { getHealthTotal } from '../lib/checkingHealth'
import type { SavedCampaign } from '../lib/campaignStore'
import AccountHealthMix from './AccountHealthMix'
import CampaignCenter from './CampaignCenter'
import CampaignTracker from './CampaignTracker'
import ScenarioPlanner from './ScenarioPlanner'
import NextBestAction from './NextBestAction'
import ActivationFunnel from './ActivationFunnel'
import CrossProductSignal from './CrossProductSignal'
import EarlyWarningSignals from './EarlyWarningSignals'
import FeeTriggerView from './FeeTriggerView'
import MarketSignals from './MarketSignals'
import RiskSegments from './RiskSegments'

/** Checking-only sections for the Diagnose, Act and Market tabs (loaded on demand: charts and the builder are heavy). */
interface Props {
  tab: 'diagnose' | 'act' | 'market'
  quarter: string
  /** Opens the Promotion Builder for a preset. */
  onDesign: (presetId: string) => void
  onEditCampaign: (campaign: SavedCampaign) => void
}

export default function CheckingHealthSections({ tab, quarter, onDesign, onEditCampaign }: Props) {
  const feeGroup = feeCohorts.find((c) => c.id === 'first-fee')
  const baseline = feeCohorts.find((c) => c.id === 'no-fee')

  if (tab === 'act') {
    return (
      <div className="space-y-6">
        <CampaignCenter onDesign={onDesign} />
        <CampaignTracker onEdit={onEditCampaign} />
        <ScenarioPlanner />
        <NextBestAction />
      </div>
    )
  }
  if (tab === 'market') return <MarketSignals signals={marketSignals} pncRow={pncComparisonRow} />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="heading-accent text-lg font-semibold text-brand-ink">Retention &amp; Account Health</h2>
        <p className="mt-1 text-sm text-muted">
          Opening an account is only the start: do accounts become primary, and which early signals come before a drop-off?
        </p>
      </div>
      {/* Paired side by side on wide screens so the Diagnose tab stays within about 6 screens. */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        <ActivationFunnel channels={activationFunnel} quarter={quarter} />
        <AccountHealthMix
          history={healthMixHistory}
          accountsWithDirectDeposit={currentQuarterHealth.accountsWithDirectDeposit}
          openedThisQuarter={getKpi('checking-new-accounts').actual}
          closedThisQuarter={currentQuarterHealth.closedThisQuarter}
          newlyDormantThisQuarter={currentQuarterHealth.newlyDormantThisQuarter}
        />
      </div>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        <EarlyWarningSignals signals={dropOffSignals} />
        <RiskSegments
          segments={riskSegments}
          onDesignCampaign={(id) => {
            const preset = presetForSource('risk', id)
            if (preset) onDesign(preset.id)
          }}
        />
      </div>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        {feeGroup && baseline && (
          <FeeTriggerView feeGroup={feeGroup} baseline={baseline} monthlyFee={checkingTerms.monthlyMaintenanceFee} />
        )}
        <CrossProductSignal groups={savingsLink} openAccounts={getHealthTotal(healthMixHistory[healthMixHistory.length - 1])} />
      </div>
    </div>
  )
}
