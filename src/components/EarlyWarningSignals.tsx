import type { DropOffSignal } from '../data/checkingHealth'
import { formatLeadTime, formatMultiple, getStrongestSignal } from '../lib/checkingHealth'
import { formatValue } from '../lib/metrics'
import SectionCard from './SectionCard'

export default function EarlyWarningSignals({ signals }: { signals: DropOffSignal[] }) {
  const strongest = getStrongestSignal(signals)
  const maxLift = strongest.lift

  return (
    <SectionCard
      id="signals-heading"
      title="Early-Warning Drop-Off Signals"
      source="internal"
      description="Behaviors that tend to show up before a checking account closes or goes dormant. Accounts can trigger more than one signal."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="py-2 pr-4 font-medium">Signal</th>
              <th scope="col" className="py-2 pr-4 font-medium">How it's measured</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Flagged this quarter</th>
              <th scope="col" className="py-2 pr-4 font-medium">Typical lead time</th>
              <th scope="col" className="w-40 py-2 font-medium">Lift</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {signals.map((s) => (
              <tr key={s.id} id={`signal-${s.id}`} className="scroll-mt-24 align-top target:bg-orange-50">
                <th scope="row" className="py-3 pr-4 font-medium text-brand-ink">
                  {s.name}
                  {s.id === strongest.id && (
                    <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">Strongest</span>
                  )}
                </th>
                <td className="py-3 pr-4 text-slate-700">{s.measure}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{formatValue(s.flaggedAccounts, 'accounts')}</td>
                <td className="py-3 pr-4 whitespace-nowrap text-slate-700">{formatLeadTime(s.leadDays)}</td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                      <div className="h-full rounded-full bg-brand-blue" style={{ width: `${(s.lift / maxLift) * 100}%` }} />
                    </div>
                    <span className="w-10 text-right font-semibold tabular-nums text-brand-ink">{formatMultiple(s.lift)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Lift = drop-off rate of flagged accounts ÷ drop-off rate of unflagged accounts. Illustrative: these multiples are
        placeholders until a model is fit on real account history, and a high lift shows association, not cause.
      </p>
    </SectionCard>
  )
}
