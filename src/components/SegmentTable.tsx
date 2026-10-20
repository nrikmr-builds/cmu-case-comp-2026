import { formatPercent, formatValue, getPotentialAccounts } from '../lib/metrics'
import type { CustomerSegment } from '../types'

interface Props {
  segments: CustomerSegment[]
}

export default function SegmentTable({ segments }: Props) {
  const totalEligible = segments.reduce((sum, s) => sum + s.eligibleCustomers, 0)
  const totalPotential = segments.reduce((sum, s) => sum + getPotentialAccounts(s), 0)
  const accounts = (n: number) => formatValue(n, 'accounts')

  return (
    <section aria-labelledby="segments-heading" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 id="segments-heading" className="text-lg font-semibold text-brand-navy">
        Customer Segments · Opportunity
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Illustrative figures. Potential accounts = eligible customers × estimated conversion rate.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="py-2 pr-4 font-medium">Segment</th>
              <th scope="col" className="py-2 pr-4 font-medium">Why they might open a CD</th>
              <th scope="col" className="py-2 pr-4 font-medium">Consideration</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Eligible</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Est. Conversion</th>
              <th scope="col" className="py-2 text-right font-medium">Potential Accounts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {segments.map((s) => (
              <tr key={s.id} className="align-top">
                <th scope="row" className="py-3 pr-4 font-medium text-brand-navy">{s.name}</th>
                <td className="py-3 pr-4 text-slate-700">{s.whyRelevant}</td>
                <td className="py-3 pr-4 text-amber-800">{s.consideration}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{accounts(s.eligibleCustomers)}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{formatPercent(s.estimatedConversionRate)}</td>
                <td className="py-3 text-right font-semibold tabular-nums text-brand-navy">{accounts(getPotentialAccounts(s))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-200 font-semibold text-brand-navy">
            <tr>
              <th scope="row" className="py-3 pr-4">Total</th>
              <td colSpan={2} />
              <td className="py-3 pr-4 text-right tabular-nums">{accounts(totalEligible)}</td>
              <td />
              <td className="py-3 text-right tabular-nums">{accounts(totalPotential)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
