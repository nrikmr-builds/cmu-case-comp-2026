import { activationFunnel, dropOffSignals } from '../data/checkingHealth'
import { marketSignals, summaryCitations } from '../data/marketSignals'
import { formatMultiple, getNeverActivated, getStrongestSignal, getTotalFunnel } from '../lib/checkingHealth'
import { formatPercent, formatValue } from '../lib/metrics'
import { SourceLink } from './MarketSignals'

/** Extra AI summary sentences that join our retention data with sourced market facts. */
export default function CheckingSummaryAddendum() {
  const neverActivated = getNeverActivated(getTotalFunnel(activationFunnel))
  const strongest = getStrongestSignal(dropOffSignals)
  const citations = summaryCitations.flatMap(({ signalId, text }) => {
    const signal = marketSignals.find((s) => s.id === signalId)
    return signal ? [{ signal, text }] : []
  })

  return (
    <>
      Beyond openings, {formatPercent(neverActivated.share)} of this quarter's new accounts have not activated yet, and
      the strongest early-warning signal is <em>{strongest.name.toLowerCase()}</em> ({formatMultiple(strongest.lift)} lift,{' '}
      {formatValue(strongest.flaggedAccounts, 'accounts')} accounts flagged).{' '}
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
