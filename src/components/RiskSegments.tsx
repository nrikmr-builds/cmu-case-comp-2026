import type { RiskSegment } from '../data/checkingHealth'
import { formatValue } from '../lib/metrics'
import SectionCard from './SectionCard'

export default function RiskSegments({ segments }: { segments: RiskSegment[] }) {
  return (
    <SectionCard
      id="risk-segments-heading"
      title="Drop-Off Risk Segments"
      source="internal"
      description="Groups of existing customers showing drop-off risk. Segments can overlap."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {segments.map((s) => (
          <article key={s.id} id={`risk-${s.id}`} className="scroll-mt-24 rounded-lg border border-slate-200 p-4 target:ring-2 target:ring-brand-orange">
            <div className="flex items-start justify-between gap-3">
              <h4 className="font-semibold text-brand-ink">{s.name}</h4>
              <p className="text-right">
                <span className="block text-xl font-semibold tabular-nums text-brand-ink">{formatValue(s.eligibleCustomers, 'accounts')}</span>
                <span className="text-xs text-slate-500">customers</span>
              </p>
            </div>
            <p className="mt-2 text-sm text-slate-700">
              <span className="font-medium">Why it matters:</span> {s.whyRelevant}
            </p>
            <p className="mt-1 text-sm text-amber-800">
              <span className="font-medium">Consideration:</span> {s.consideration}
            </p>
          </article>
        ))}
      </div>
    </SectionCard>
  )
}
