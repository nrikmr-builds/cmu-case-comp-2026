import { Megaphone } from 'lucide-react'
import type { RiskSegment } from '../data/checkingHealth'
import { formatValue } from '../lib/metrics'
import SectionCard from './SectionCard'

interface Props {
  segments: RiskSegment[]
  onDesignCampaign?: (riskId: string) => void
}

export default function RiskSegments({ segments, onDesignCampaign }: Props) {
  return (
    <SectionCard
      id="risk-segments-heading"
      title="Drop-Off Risk Segments"
      source="internal"
      description="Groups of existing customers showing drop-off risk. Segments can overlap."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {segments.map((s) => (
          <article key={s.id} id={`risk-${s.id}`} className="scroll-mt-24 rounded-sm border border-line p-4 target:ring-2 target:ring-brand-orange">
            <div className="flex items-start justify-between gap-3">
              <h4 className="font-semibold text-brand-ink">{s.name}</h4>
              <p className="text-right">
                <span className="block text-lg font-semibold tabular-nums text-brand-ink">{formatValue(s.eligibleCustomers, 'accounts')}</span>
                <span className="text-xs text-muted">customers</span>
              </p>
            </div>
            <p className="mt-2 text-sm text-body">
              <span className="font-medium">Why it matters:</span> {s.whyRelevant}
            </p>
            <p className="mt-1 text-sm text-caution">
              <span className="font-medium">Consideration:</span> {s.consideration}
            </p>
            {onDesignCampaign && (
              <button
                type="button"
                onClick={() => onDesignCampaign(s.id)}
                className="btn btn-secondary btn-sm mt-3"
                aria-label={`Design retention campaign for ${s.name}`}
              >
                <Megaphone className="h-3.5 w-3.5" aria-hidden />
                Design campaign
              </button>
            )}
          </article>
        ))}
      </div>
    </SectionCard>
  )
}
