// Scenario planner: where Q3 openings land if chosen acquisition campaigns run, without double counting
// campaigns aimed at the same segment. Seeds are excluded (their openings are already in the actual).
import { campaignPresets } from '../data/campaignPresets'
import { getKpi } from '../data/productMetrics'
import { computeEconomics, inputsFromPreset, type CampaignInputs } from './campaignEconomics'
import type { SavedCampaign } from './campaignStore'
import { getHeadlineProjection } from './dailyTracking'

/** Acquisition presets the planner always offers. */
const ACQUISITION_PRESET_IDS = campaignPresets.filter((p) => p.kind === 'acquisition').map((p) => p.id)

export interface PlannerCandidate {
  id: string
  name: string
  /** "Preset (default settings)" or the saved campaign's status. */
  origin: string
  /** Target segment id: campaigns sharing it overlap. */
  segmentId: string
  segmentLabel: string
  /** Incremental openings that land in Q3. */
  q3Incremental: number
}

function segmentOf(inputs: CampaignInputs): string {
  return campaignPresets.find((p) => p.id === inputs.presetId)?.source.id ?? inputs.presetId
}

export function getPlannerCandidates(saved: SavedCampaign[]): PlannerCandidate[] {
  const presets = ACQUISITION_PRESET_IDS.map((id) => {
    const inputs = inputsFromPreset(id)
    return {
      id: `preset:${id}`,
      name: inputs.name,
      origin: 'Preset (default settings)',
      segmentId: segmentOf(inputs),
      segmentLabel: inputs.sourceLabel,
      q3Incremental: computeEconomics(inputs).timing.q3,
    }
  })
  const savedAcq = saved
    .filter((c) => c.status !== 'completed' && c.inputs.outcome === 'openings')
    .map((c) => ({
      id: c.id,
      name: c.inputs.name,
      origin: `Saved · ${c.status === 'live' ? 'Live' : 'Draft'}`,
      segmentId: segmentOf(c.inputs),
      segmentLabel: c.inputs.sourceLabel,
      q3Incremental: computeEconomics(c.inputs).timing.q3,
    }))
  return [...presets, ...savedAcq]
}

export interface PlannerResult {
  included: PlannerCandidate[]
  /** Σ q3Incremental of everything included. */
  grossIncremental: number
  /** For each segment, only the largest included campaign counts. */
  countedIncremental: number
  overlapRemoved: number
  /** Segments with more than one included campaign, for the formula line. */
  overlaps: { segmentLabel: string; kept: number; dropped: number[] }[]
  headlineProjected: number
  referenceProjected: number
  /** headline pace projection + counted incremental. */
  landing: number
  referenceLanding: number
  /** headline + 50% / 100% of counted incremental (the uplift itself is an assumption). */
  low: number
  high: number
  target: number
}

export function computePlanner(candidates: PlannerCandidate[], includedIds: Set<string>): PlannerResult {
  const kpi = getKpi('checking-new-accounts')
  const { projection, average } = getHeadlineProjection(kpi)
  const included = candidates.filter((c) => includedIds.has(c.id))
  const bySegment = new Map<string, PlannerCandidate[]>()
  for (const c of included) bySegment.set(c.segmentId, [...(bySegment.get(c.segmentId) ?? []), c])
  const overlaps: PlannerResult['overlaps'] = []
  let counted = 0
  for (const group of bySegment.values()) {
    const sorted = [...group].sort((a, b) => b.q3Incremental - a.q3Incremental)
    counted += sorted[0].q3Incremental
    if (sorted.length > 1) overlaps.push({ segmentLabel: sorted[0].segmentLabel, kept: sorted[0].q3Incremental, dropped: sorted.slice(1).map((c) => c.q3Incremental) })
  }
  const gross = included.reduce((s, c) => s + c.q3Incremental, 0)
  const headlineProjected = Math.round(projection.projected)
  const referenceProjected = Math.round(average.projected)
  return {
    included,
    grossIncremental: gross,
    countedIncremental: counted,
    overlapRemoved: gross - counted,
    overlaps,
    headlineProjected,
    referenceProjected,
    landing: headlineProjected + counted,
    referenceLanding: referenceProjected + counted,
    low: headlineProjected + Math.round(counted * 0.5),
    high: headlineProjected + counted,
    target: kpi.target,
  }
}

/** The planner with every candidate included: the default used by the report and the tour. */
export function defaultPlanner(saved: SavedCampaign[]): PlannerResult {
  const candidates = getPlannerCandidates(saved)
  return computePlanner(candidates, new Set(candidates.map((c) => c.id)))
}
