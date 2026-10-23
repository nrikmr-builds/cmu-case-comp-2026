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
import { marketSignals } from '../data/marketSignals'
import { getKpi } from '../data/productMetrics'
import { getHealthTotal } from '../lib/checkingHealth'
import AccountHealthMix from './AccountHealthMix'
import ActivationFunnel from './ActivationFunnel'
import CrossProductSignal from './CrossProductSignal'
import EarlyWarningSignals from './EarlyWarningSignals'
import FeeTriggerView from './FeeTriggerView'
import MarketSignals from './MarketSignals'
import RiskSegments from './RiskSegments'

/** Checking-only: do the accounts we open stay, and who is about to drop off? */
export default function CheckingHealthSections({ quarter }: { quarter: string }) {
  const feeGroup = feeCohorts.find((c) => c.id === 'first-fee')
  const baseline = feeCohorts.find((c) => c.id === 'no-fee')

  return (
    <div className="space-y-6">
      <div className="pt-4">
        <h2 className="heading-accent text-2xl font-semibold text-brand-ink">Retention &amp; Account Health</h2>
        <p className="mt-2 max-w-3xl text-slate-600">
          Opening an account is only the start. These views show whether new and existing checking accounts become
          primary, and which early signals come before a customer drops off.
        </p>
      </div>
      <ActivationFunnel channels={activationFunnel} quarter={quarter} />
      <AccountHealthMix
        history={healthMixHistory}
        accountsWithDirectDeposit={currentQuarterHealth.accountsWithDirectDeposit}
        openedThisQuarter={getKpi('checking-new-accounts').actual}
        closedThisQuarter={currentQuarterHealth.closedThisQuarter}
        newlyDormantThisQuarter={currentQuarterHealth.newlyDormantThisQuarter}
      />
      <EarlyWarningSignals signals={dropOffSignals} />
      <RiskSegments segments={riskSegments} />
      {feeGroup && baseline && (
        <FeeTriggerView feeGroup={feeGroup} baseline={baseline} monthlyFee={checkingTerms.monthlyMaintenanceFee} />
      )}
      <CrossProductSignal groups={savingsLink} openAccounts={getHealthTotal(healthMixHistory[healthMixHistory.length - 1])} />
      <MarketSignals signals={marketSignals} pncRow={pncComparisonRow} />
    </div>
  )
}
