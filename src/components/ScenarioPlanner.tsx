import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { getKpi } from '../data/productMetrics'
import { useCampaigns } from '../lib/campaignStore'
import { formatValue } from '../lib/metrics'
import { againstReforecast, reforecastLabel, useReforecast } from '../lib/reforecastStore'
import { computePlanner, getPlannerCandidates } from '../lib/scenarioPlanner'
import SectionCard from './SectionCard'
import StatusBadge from './StatusBadge'

const n = (x: number) => formatValue(x, 'accounts')

/** Choose acquisition campaigns, see where Q3 lands, and propose a re-forecast. The original target is never overwritten. */
export default function ScenarioPlanner() {
  const { campaigns } = useCampaigns()
  const candidates = getPlannerCandidates(campaigns)
  // Everything is included unless the product owner unticks it.
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const included = new Set(candidates.filter((c) => !excluded.has(c.id)).map((c) => c.id))
  const p = computePlanner(candidates, included)
  const { reforecast, accept, clear } = useReforecast()
  const [proposing, setProposing] = useState(false)
  const [reason, setReason] = useState('')
  const kpi = getKpi('checking-new-accounts')

  const toggle = (id: string) =>
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const basis = `${n(p.headlineProjected)} (last-7-day pace) + ${n(p.countedIncremental)} incremental Q3 openings from ${p.included.length} campaign${p.included.length === 1 ? '' : 's'}${p.overlapRemoved ? `, overlap removed ${n(p.overlapRemoved)}` : ''}`

  return (
    <SectionCard
      id="planner-heading"
      title="Scenario Planner · Q3 Openings"
      source="internal"
      description="Tick the acquisition campaigns you'd run. Each adds only its incremental Q3 openings; seeded campaigns are already in the actual and are left out. Campaigns aimed at the same segment are not added twice."
    >
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="py-2 pr-3 font-medium">Include</th>
              <th scope="col" className="py-2 pr-3 font-medium">Campaign</th>
              <th scope="col" className="py-2 pr-3 font-medium">Segment</th>
              <th scope="col" className="py-2 text-right font-medium">Incremental Q3 openings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {candidates.map((c) => (
              <tr key={c.id}>
                <td className="py-2 pr-3">
                  <input
                    type="checkbox"
                    checked={included.has(c.id)}
                    onChange={() => toggle(c.id)}
                    aria-label={`Include ${c.name} (${c.origin})`}
                    className="h-4 w-4 accent-brand-blue"
                  />
                </td>
                <th scope="row" className="py-2 pr-3 font-medium text-brand-ink">
                  {c.name}
                  <span className="block text-xs font-normal text-slate-500">{c.origin}</span>
                </th>
                <td className="py-2 pr-3 text-slate-700">{c.segmentLabel}</td>
                <td className="py-2 text-right tabular-nums">{n(c.q3Incremental)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Box label="Q3 landing (headline pace)" value={n(p.landing)} note={`${n(p.headlineProjected)} + ${n(p.countedIncremental)} = ${n(p.landing)} vs. ${n(p.target)} target`} strong />
        <Box label="Range (uplift is an assumption)" value={`${n(p.low)} – ${n(p.high)}`} note={`Low: ${n(p.headlineProjected)} + 50% × ${n(p.countedIncremental)}; high: + 100%`} />
        <Box label="At the reference pace" value={n(p.referenceLanding)} note={`${n(p.referenceProjected)} (quarter-average pace) + ${n(p.countedIncremental)}`} />
      </div>
      <p className="mt-2 text-xs text-slate-600">
        Overlap removed: <strong>{n(p.overlapRemoved)}</strong> = {n(p.grossIncremental)} included − {n(p.countedIncremental)} counted
        {p.overlaps.length > 0 &&
          ` (${p.overlaps.map((o) => `${o.segmentLabel}: keep ${n(o.kept)}, drop ${o.dropped.map(n).join(' + ')}`).join('; ')})`}
        . Same segment → only the larger campaign counts. Campaign effects aren't additive across segments either; treat the landing as an upper bound.
      </p>

      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
        {reforecast && reforecast.kpiId === kpi.id ? (
          <AcceptedReforecast onClear={clear} />
        ) : !proposing ? (
          <button
            type="button"
            onClick={() => {
              setReason(`Recent pace has fallen to the last-7-day level after the summer promotion; the planned campaigns add about ${n(p.countedIncremental)} incremental openings. Basis: ${basis}.`)
              setProposing(true)
            }}
            className="rounded bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue-dark"
          >
            Propose re-forecast
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-slate-700">
              Proposed Q3 target: <strong>{n(p.landing)}</strong> (original {n(kpi.target)} stays on record). Illustrative.
            </p>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Reason</span>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-1 block w-full rounded border border-slate-300 px-2 py-1 text-sm" />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  accept({ kpiId: kpi.id, target: p.landing, reason, acceptedAt: new Date().toISOString(), basis })
                  setProposing(false)
                }}
                className="inline-flex items-center gap-1 rounded bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue-dark"
              >
                <Check className="h-4 w-4" aria-hidden /> Accept re-forecast
              </button>
              <button type="button" onClick={() => setProposing(false)} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function AcceptedReforecast({ onClear }: { onClear: () => void }) {
  const { reforecast } = useReforecast()
  const kpi = getKpi('checking-new-accounts')
  if (!reforecast) return null
  const r = againstReforecast(kpi, reforecast)
  return (
    <div className="space-y-1 text-sm text-slate-700">
      <p className="font-semibold text-brand-ink">
        {reforecastLabel(reforecast)}: {n(reforecast.target)} · original target {n(kpi.target)}
      </p>
      <p className="flex flex-wrap items-center gap-1">
        Against the re-forecast: {Math.round(r.paceRatio * 1000) / 10}% of pace <StatusBadge status={r.status} /> · still needed {n(r.stillNeeded)}
      </p>
      <p className="text-xs text-slate-500">Reason: {reforecast.reason}</p>
      <p className="text-xs text-slate-500">Basis: {reforecast.basis}</p>
      <button type="button" onClick={onClear} className="mt-1 inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs">
        <X className="h-3.5 w-3.5" aria-hidden /> Withdraw re-forecast
      </button>
    </div>
  )
}

function Box({ label, value, note, strong = false }: { label: string; value: string; note: string; strong?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${strong ? 'border-brand-blue/30 bg-blue-50' : 'border-slate-200 bg-white'}`}>
      <p className="text-xs text-slate-600">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-brand-ink">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  )
}
