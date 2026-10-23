import type { SavingsLinkGroup } from '../data/checkingHealth'
import { formatMultiple, formatUsd, getExternalSavingsShare, getSavingsToCheckingRatio } from '../lib/checkingHealth'
import { formatPercent, formatValue } from '../lib/metrics'
import SectionCard from './SectionCard'

interface Props {
  groups: SavingsLinkGroup[]
  /** Open checking accounts (health mix), to reconcile customers with accounts. */
  openAccounts: number
}

export default function CrossProductSignal({ groups, openAccounts }: Props) {
  const noSavings = groups.find((g) => g.id === 'no-pnc-savings')
  const totalCustomers = groups.reduce((sum, g) => sum + g.customers, 0)
  const accounts = (n: number) => formatValue(n, 'accounts')

  return (
    <SectionCard
      id="cross-product-heading"
      title="Cross-Product Signal · Savings vs. Checking"
      source="internal"
      description="Checking customers (people, not accounts) split by whether they also hold PNC savings. Recurring transfers to an outside savings account suggest their savings live at another institution."
    >
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="py-2 pr-4 font-medium">Group</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Checking customers</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Avg. checking</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Avg. PNC savings</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Savings ÷ checking</th>
              <th scope="col" className="py-2 text-right font-medium">Sending to outside savings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groups.map((g) => (
              <tr key={g.id}>
                <th scope="row" className="py-3 pr-4 font-medium text-brand-ink">{g.label}</th>
                <td className="py-3 pr-4 text-right tabular-nums">{formatValue(g.customers, 'accounts')}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{formatUsd(g.avgCheckingBalance)}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{formatUsd(g.avgPncSavingsBalance)}</td>
                <td className="py-3 pr-4 text-right font-semibold tabular-nums">{formatMultiple(getSavingsToCheckingRatio(g))}</td>
                <td className="py-3 text-right tabular-nums">
                  {formatValue(g.recurringExternalSavingsTransfers, 'accounts')}
                  <span className="ml-2 text-xs text-slate-500">{formatPercent(getExternalSavingsShare(g))}</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-200 text-brand-ink">
            <tr>
              <th scope="row" className="py-3 pr-4 font-semibold">All checking customers</th>
              <td className="py-3 pr-4 text-right font-semibold tabular-nums">{accounts(totalCustomers)}</td>
              <td colSpan={4} className="py-3 text-xs text-slate-500">
                They hold the {accounts(openAccounts)} open checking accounts in the health mix above. Some customers hold
                more than one account, so {accounts(openAccounts)} accounts − {accounts(totalCustomers)} customers ={' '}
                {accounts(openAccounts - totalCustomers)} extra accounts held by multi-account customers.
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {noSavings && (
        <p className="mt-4 rounded-md bg-orange-50 p-4 text-sm text-slate-800">
          <span className="font-semibold">Insight:</span> {formatValue(noSavings.recurringExternalSavingsTransfers, 'accounts')}{' '}
          checking customers with no PNC savings send money to savings elsewhere every month. This mirrors the open question
          above about savings-only customers, in reverse: here PNC holds the paycheck, and another institution holds the
          savings.
        </p>
      )}
    </SectionCard>
  )
}
