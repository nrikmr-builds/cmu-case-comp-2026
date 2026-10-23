import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { getKpi } from '../data/productMetrics'
import { useCampaigns } from '../lib/campaignStore'
import { formatValue } from '../lib/metrics'
import { againstReforecast, END_LABEL, proposalCaveat, reforecastLabel, useReforecast, type ReforecastEnd } from '../lib/reforecastStore'
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
  // Conservative by default: the low end assumes only half the planned uplift until the pilot is significant.
  const [end, setEnd] = useState<ReforecastEnd>('low')
  const [custom, setCustom] = useState(0)
  const kpi = getKpi('checking-new-accounts')

  const toggle = (id: string) =>
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const basis = `${n(p.headlineProjected)} (last-7-day pace) + ${n(p.countedIncremental)} incremental Q3 openings from ${p.included.length} campaign${p.included.length === 1 ? '' : 's'}${p.overlapRemoved ? `, overlap removed ${n(p.overlapRemoved)}` : ''}`
  const proposedTarget = end === 'low' ? p.low : end === 'high' ? p.high : custom
  const reasonFor = (e: ReforecastEnd) =>
    e === 'low'
      ? `Low end: assumes 50% of planned uplift until the pilot is significant. ${n(p.headlineProjected)} + 50% × ${n(p.countedIncremental)} = ${n(p.low)}.`
      : e === 'high'
        ? `High end: assumes 100% of planned uplift lands in Q3, which no campaign has proven yet. ${n(p.headlineProjected)} + ${n(p.countedIncremental)} = ${n(p.high)}.`
        : `Custom value chosen by the product owner; planner range ${n(p.low)}–${n(p.high)}.`
  const choose = (e: ReforecastEnd) => {
    setEnd(e)
    setReason(reasonFor(e))
  }

  return (
    <SectionCard
      id="planner-heading"
      title="Scenario Planner · Q3 Openings"
      source="internal"
      description="Tick the acquisition campaigns you'd run. Each adds only its incremental Q3 openings; seeded campaigns are already in the actual and are left out. Campaigns aimed at the same segment are not added twice."
    >
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th scope="col" className="py-2 pr-3 font-medium">Include</th>
              <th scope="col" className="py-2 pr-3 font-medium">Campaign</th>
              <th scope="col" className="py-2 pr-3 font-medium">Segment</th>
              <th scope="col" className="py-2 text-right font-medium">Incremental Q3 openings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
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
                  <span className="block text-xs font-normal text-muted">{c.origin}</span>
                </th>
                <td className="py-2 pr-3 text-body">{c.segmentLabel}</td>
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
      <p className="mt-2 text-xs text-muted">
        Overlap removed: <strong>{n(p.overlapRemoved)}</strong> = {n(p.grossIncremental)} included − {n(p.countedIncremental)} counted
        {p.overlaps.length > 0 &&
          ` (${p.overlaps.map((o) => `${o.segmentLabel}: keep ${n(o.kept)}, drop ${o.dropped.map(n).join(' + ')}`).join('; ')})`}
        . Same segment → only the larger campaign counts. Campaign effects aren't additive across segments either; treat the landing as an upper bound.
      </p>

      <div className="mt-4 rounded-sm border border-line bg-surface-subtle p-4">
        {reforecast && reforecast.kpiId === kpi.id ? (
          <AcceptedReforecast onClear={clear} />
        ) : !proposing ? (
          <button
            type="button"
            onClick={() => {
              setEnd('low')
              setCustom(p.low)
              setReason(reasonFor('low'))
              setProposing(true)
            }}
            className="btn btn-primary"
          >
            Propose re-forecast
          </button>
        ) : (
          <div className="space-y-2">
            <fieldset>
              <legend className="text-sm font-medium text-body">
                Which end of the range {n(p.low)}–{n(p.high)}?
              </legend>
              <div className="mt-1 flex flex-wrap gap-3 text-sm">
                {(['low', 'high', 'custom'] as const).map((e) => (
                  <label key={e} className="inline-flex items-center gap-1.5">
                    <input type="radio" name="reforecast-end" checked={end === e} onChange={() => choose(e)} className="accent-brand-blue" />
                    {e === 'low' ? `Low (default) · ${n(p.low)}` : e === 'high' ? `High · ${n(p.high)}` : 'Custom'}
                  </label>
                ))}
                {end === 'custom' && (
                  <input
                    type="number"
                    min={kpi.actual}
                    value={custom}
                    onChange={(ev) => setCustom(Math.max(0, Math.round(Number(ev.target.value) || 0)))}
                    aria-label="Custom re-forecast target"
                    className="field h-8 w-28"
                  />
                )}
              </div>
            </fieldset>
            <p className="text-sm text-body">
              Proposed Q3 target: <strong>{n(proposedTarget)}</strong> ({END_LABEL[end]}; original {n(kpi.target)} stays on record). Illustrative.
            </p>
            <label className="block text-sm">
              <span className="font-medium text-body">Reason</span>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="field mt-1 block w-full" />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  accept({ kpiId: kpi.id, target: proposedTarget, reason, acceptedAt: new Date().toISOString(), basis, end, range: { low: p.low, high: p.high } })
                  setProposing(false)
                }}
                className="btn btn-primary"
              >
                <Check className="h-4 w-4" aria-hidden /> Accept re-forecast
              </button>
              <button type="button" onClick={() => setProposing(false)} className="btn btn-secondary">
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
    <div className="space-y-1 text-sm text-body">
      <p className="font-semibold text-brand-ink">
        Original target {n(kpi.target)} · {reforecastLabel(reforecast)}: {n(reforecast.target)} ({END_LABEL[reforecast.end]} of {n(reforecast.range.low)}–
        {n(reforecast.range.high)})
      </p>
      <p className="flex flex-wrap items-center gap-1">
        Re-forecast still needs {r.multiple.toFixed(2)}× the recent pace: ({n(reforecast.target)} − {n(kpi.actual)}) ÷{' '}
        {r.daysLeft.toFixed(1)} = {r.requiredPerDay.toFixed(1)}/day vs. {r.recentPerDay.toFixed(1)}/day recent <StatusBadge status={r.status} />
      </p>
      <p className="text-xs font-medium text-body">{proposalCaveat(r.originalStatus)}</p>
      <p className="text-xs text-muted">Reason: {reforecast.reason}</p>
      <p className="text-xs text-muted">Basis: {reforecast.basis}</p>
      <button type="button" onClick={onClear} className="btn btn-secondary btn-sm mt-1">
        <X className="h-3.5 w-3.5" aria-hidden /> Withdraw re-forecast
      </button>
    </div>
  )
}

function Box({ label, value, note, strong = false }: { label: string; value: string; note: string; strong?: boolean }) {
  return (
    <div className={`rounded-sm border p-3 ${strong ? 'border-brand-blue/30 bg-info-soft' : 'border-line bg-white'}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-brand-ink">{value}</p>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </div>
  )
}
