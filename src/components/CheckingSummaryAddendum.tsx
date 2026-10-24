import { activationFunnel, currentQuarterHealth, dropOffSignals } from '../data/checkingHealth'
import { getKpi } from '../data/productMetrics'
import { getWeeklyPace } from '../lib/dailyTracking'
import { marketSignals, summaryCitations } from '../data/marketSignals'
import {
  formatMultiple,
  formatSignedCount,
  getNetAccountChange,
  getNeverActivated,
  getStrongestSignal,
  getTotalFunnel,
} from '../lib/checkingHealth'
import { formatPercent, formatValue } from '../lib/metrics'
import { SourceLink } from './MarketSignals'

/** Extra AI summary sentences that join our retention data with sourced market facts. */
export default function CheckingSummaryAddendum() {
  const neverActivated = getNeverActivated(getTotalFunnel(activationFunnel))
  const strongest = getStrongestSignal(dropOffSignals)
  const opened = getKpi('checking-new-accounts').actual
  const closed = currentQuarterHealth.closedThisQuarter
  const netChange = getNetAccountChange(opened, closed)
  const citations = summaryCitations.flatMap(({ signalId, text }) => {
    const signal = marketSignals.find((s) => s.id === signalId)
    return signal ? [{ signal, text }] : []
  })

  const weekly = getWeeklyPace()
  return (
    <>
      Openings stepped down after the illustrative summer promotion ended on Jul 31: the last 7 days averaged{' '}
      {Math.round(weekly.weekPerDay)}/day ({formatValue(weekly.weekTotal, 'accounts')} ÷ 7) against{' '}
      {Math.round(weekly.quarterPerDay)}/day for the quarter. Beyond openings, {formatPercent(neverActivated.share)} of this quarter's new accounts have not activated yet, and
      the strongest early-warning signal is <em>{strongest.name.toLowerCase()}</em> ({formatMultiple(strongest.lift)} lift,{' '}
      {formatValue(strongest.flaggedAccounts, 'accounts')} accounts flagged). Closures also outpaced openings, so open
      accounts changed by {formatSignedCount(netChange)} this quarter ({formatValue(opened, 'accounts')} opened −{' '}
      {formatValue(closed, 'accounts')} closed).{' '}
      {citations.length > 0 && (
        <>
          Outside PNC,{' '}
          {citations.map(({ signal, text }, i) => (
            <span key={signal.id}>
              {i > 0 && ', and '}
              {text} (<SourceLink signal={signal} />)
            </span>
          ))}
          .{' '}
        </>
      )}
      Open question: is direct deposit leaving for early-pay features, for sign-up bonuses, or for reasons our data can't
      see? Validate before acting.
    </>
  )
}
