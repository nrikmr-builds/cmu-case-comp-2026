// One-click weekly report. A report is a SNAPSHOT: every number is turned into text when it's generated, so a
// saved report reopens exactly as it was, even if the data or campaigns change later.
import { activationFunnel, checkingTerms, currentQuarterHealth, dropOffSignals, feeCohorts, healthMixHistory } from '../data/checkingHealth'
import { campaignAssumptions } from '../data/campaignPresets'
import { seedCampaigns } from '../data/campaignSeeds'
import { DAYS_WITH_DATA, dayToIso } from '../data/dailyOpenings'
import { marketSignals } from '../data/marketSignals'
import { getKpi, products, reportingPeriod } from '../data/productMetrics'
import { computeEconomics, feeClosureGap, inputsFromPreset, OUTCOME_LABELS } from './campaignEconomics'
import type { SavedCampaign } from './campaignStore'
import { getTotals, getTrackedCampaigns } from './campaignTracking'
import {
  formatPercent1,
  formatSignedCount,
  formatUsd,
  getDormancyRate,
  getExcessFeeClosures,
  getNetAccountChange,
  getNeverActivated,
  getPrimacyRate,
  getStrongestSignal,
} from './checkingHealth'
import {
  cumulativeOpenings,
  daysUntil,
  evaluateRule,
  expiryLabel,
  getFlagChanges,
  getHeadlineProjection,
  getWeeklyPace,
  getWindow,
  paceRatioAt,
  shortDate,
  type AlertRule,
} from './dailyTracking'
import { formatPercent, formatValue, getStatus } from './metrics'
import { formatDate } from './projection'

const accounts = (n: number) => formatValue(n, 'accounts')
const money = (n: number) => (!Number.isFinite(n) ? 'n/a' : formatUsd(n))
const STATUS_TEXT = { 'on-track': 'On Track', watch: 'Watch', 'at-risk': 'At Risk' } as const

export interface ReportDecision {
  title: string
  evidence: string
  /** Editable before export. */
  text: string
  /** Computed proposal from the data layer; editable before export. */
  proposed: string
}

export interface ReportSnapshot {
  id: string
  /** ISO timestamp the report was generated. */
  generatedAt: string
  internalAsOf: string
  quarter: string
  headline: { text: string; reference: string }
  /** vsExpected: counts/deposits = actual ÷ expected by now; rates = actual ÷ target. ofTarget: actual ÷ full target (counts/deposits only). */
  kpis: { product: string; label: string; target: string; actual: string; vsExpected: string; ofTarget: string; status: string; change: string }[]
  changes: string[]
  campaigns: { name: string; status: string; type: string; result: string; liftLabel: string; costPerIncrementalPrimary: string; note: string }[]
  totals: { label: string; value: string }[]
  feasibility: { text: string; unlikely: boolean }
  risks: string[]
  decisions: ReportDecision[]
}

export function buildWeeklyReport(saved: SavedCampaign[], rules: AlertRule[], now = new Date()): ReportSnapshot {
  const openingsKpi = getKpi('checking-new-accounts')
  const { projection: head, average } = getHeadlineProjection(openingsKpi)
  const weekly = getWeeklyPace()
  const lastWeekDay = DAYS_WITH_DATA - 7
  const week = getWindow(null)

  // 1. KPI table. Only checking openings has daily history; everything else says so instead of inventing values.
  const kpis = products.flatMap((p) =>
    p.kpis.map((k) => {
      const status = getStatus(k, reportingPeriod.quarterElapsed)
      let change = '—, no weekly history'
      let vsExpected = k.kind === 'cumulative' ? formatPercent(k.actual / (k.target * reportingPeriod.quarterElapsed)) : formatPercent(k.actual / k.target)
      if (k.id === openingsKpi.id) {
        const before = cumulativeOpenings(lastWeekDay)
        change = `+${accounts(k.actual - before)} (${accounts(before)} → ${accounts(k.actual)}); pace ${formatPercent(paceRatioAt(lastWeekDay))} → ${formatPercent(paceRatioAt(DAYS_WITH_DATA))}`
        vsExpected = formatPercent(paceRatioAt(DAYS_WITH_DATA))
      }
      return {
        product: p.name,
        label: k.label,
        target: formatValue(k.target, k.unit),
        actual: formatValue(k.actual, k.unit),
        vsExpected,
        ofTarget: k.kind === 'cumulative' ? formatPercent(k.actual / k.target) : '—',
        status: STATUS_TEXT[status],
        change,
      }
    }),
  )

  // 2. Top 3 changes (same logic as the AI summary: conservative headline, business-as-usual caveat).
  const flags = getFlagChanges(week)
  const strongest = getStrongestSignal(dropOffSignals)
  const strongestChange = flags.find((f) => f.id === strongest.id)
  const topOther = flags.filter((f) => f.id !== strongest.id).sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0]
  const first = healthMixHistory[0]
  const last = healthMixHistory[healthMixHistory.length - 1]
  const signed = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1)}%`
  const changes = [
    `Openings slowed: the last 7 days averaged ${Math.round(weekly.weekPerDay)}/day (${accounts(weekly.weekTotal)} ÷ 7) vs. ${Math.round(weekly.quarterPerDay)}/day for the quarter, after the illustrative summer promotion ended Jul 31. At that pace Q3 lands at ${accounts(head.projected)}, ${accounts(head.incrementalNeeded)} short of target.`,
    `Early-warning flags: ${strongest.name.toLowerCase()} (strongest signal, ${strongest.lift.toFixed(1)}× lift) had ${accounts(strongestChange?.current ?? 0)} new flags (${signed(strongestChange?.change ?? 0)} week over week); the biggest mover was ${topOther?.name.toLowerCase()} (${signed(topOther?.change ?? 0)}).`,
    `Account base: ${formatSignedCount(getNetAccountChange(openingsKpi.actual, currentQuarterHealth.closedThisQuarter))} net accounts this quarter (${accounts(openingsKpi.actual)} opened − ${accounts(currentQuarterHealth.closedThisQuarter)} closed); primacy fell from ${formatPercent1(getPrimacyRate(first))} to ${formatPercent1(getPrimacyRate(last))} over 4 quarters while dormancy rose to ${formatPercent1(getDormancyRate(last))}.`,
  ]

  // 3. Campaigns: Live and Completed only, with the corrected (end + maturity) basis.
  const tracked = getTrackedCampaigns(saved).filter((t) => t.status === 'live' || t.status === 'completed')
  const campaigns = tracked.map((t) => {
    const type = t.inputs ? `${t.inputs.kind} · ${OUTCOME_LABELS[t.inputs.outcome].noun}` : 'acquisition · new openings'
    if (t.actual) {
      return {
        name: t.name + (t.origin === 'seed' ? ' (illustrative seed)' : ''),
        status: t.status === 'live' ? 'Live' : 'Completed',
        type,
        result: `${accounts(t.actual.lift.incremental)} incremental openings to date (${accounts(t.actual.projection.incremental)} projected)`,
        liftLabel: `${t.actual.lift.label} (${(t.actual.lift.uplift * 100).toFixed(2)} pp, 95% CI ${(t.actual.lift.ci[0] * 100).toFixed(2)} to ${(t.actual.lift.ci[1] * 100).toFixed(2)} pp)`,
        costPerIncrementalPrimary: money(t.actual.costPerIncrementalPrimary),
        note: 'Projected at campaign end and account maturity',
      }
    }
    const e = t.plan
    return {
      name: t.name,
      status: t.status === 'live' ? 'Live' : 'Completed',
      type,
      result: e ? `Planned: ${accounts(e.results.incremental)} ${t.inputs?.outcome === 'openings' ? 'incremental openings' : OUTCOME_LABELS[t.inputs?.outcome ?? 'openings'].noun} (${accounts(e.timing.q3)} in Q3)` : '—',
      liftLabel: 'No results feed yet',
      costPerIncrementalPrimary: e?.costPerIncrementalPrimary !== undefined ? money(e.costPerIncrementalPrimary) : '—',
      note: e?.costPerIncrementalPrimary !== undefined ? 'Planned (builder)' : `Planned cost ${e ? formatUsd(e.costs.total) : '—'}`,
    }
  })

  const totals = getTotals(saved)
  const a = totals.acquisition
  const totalRows = [
    { label: 'Acquisition', value: `${accounts(a.delivered)} incremental openings delivered (inside the 7,600 actual); plan ${accounts(a.planQ3)} incremental Q3 openings vs. ${accounts(a.gap)} needed` },
    {
      label: 'Closure prevention',
      value: totals.closure.count
        ? `Q3 ${formatSignedCount(totals.closure.netNow ?? 0)} → ${formatSignedCount((totals.closure.netNow ?? 0) + totals.closure.q3)}; next 90 days +${accounts(totals.closure.next90)}`
        : 'None planned',
    },
    { label: 'Activation', value: totals.activation.count ? `${accounts(totals.activation.activated)} activated; primacy +${totals.activation.liftPts.toFixed(2)} pts` : 'None planned' },
    { label: 'Cross-sell', value: totals.crossSell.count ? `${formatUsd(totals.crossSell.deposits)} deposits` : 'None planned' },
  ]
  const feasibility = {
    text: `If every acquisition campaign in the plan runs: about ${accounts(a.planQ3)} incremental Q3 openings vs. ${accounts(a.gap)} needed, so ${formatPercent(a.share)} of the gap.${a.unlikely ? ' Target unlikely without new levers: consider re-forecasting.' : ''}`,
    unlikely: a.unlikely,
  }

  // 4. Risks and early-warning signals.
  const triggered = rules.filter((r) => r.enabled).map(evaluateRule).filter((r) => r.triggered)
  const expiring = marketSignals
    .map((s) => ({ s, left: daysUntil(s.offer?.expires, s.retrievedOn) }))
    .filter((x): x is { s: (typeof marketSignals)[number]; left: number } => x.left !== undefined && x.left >= 0 && x.left <= 30)
    .sort((x, y) => x.left - y.left)
  const risks = [
    ...triggered.map((r) => `Alert: ${r.title}. ${r.evidence}`),
    `Strongest early-warning signal: ${strongest.name} (${accounts(strongest.flaggedAccounts)} flagged this quarter, ${strongest.lift.toFixed(1)}× lift).`,
    ...expiring.map(({ s, left }) => `Competitor offer ending: ${s.competitor ?? s.source}, ${expiryLabel(left, s.retrievedOn)} (external, sourced).`),
  ]

  // 5. Decisions needed from leadership (pre-filled from the data; editable).
  const pilot = seedCampaigns.find((c) => c.id === 'seed-application-rescue-pilot')
  const pilotTracked = getTrackedCampaigns([]).find((t) => t.id === pilot?.id)
  const decideOn = pilot ? shortDate(dayToIso(pilot.endDay + 1)) : '—'
  const fee = feeCohorts.find((c) => c.id === 'first-fee')
  const noFee = feeCohorts.find((c) => c.id === 'no-fee')
  const extra = fee && noFee ? getExcessFeeClosures(fee, noFee) : 0
  const perLost = fee && extra ? (fee.accounts * checkingTerms.monthlyMaintenanceFee) / extra : 0
  const branch = activationFunnel.find((c) => c.channel === 'branch')
  const digital = activationFunnel.find((c) => c.channel === 'digital')
  const g = feeClosureGap()
  const feeTest = inputsFromPreset('first-fee-forgiveness')
  const feeTestCost = computeEconomics(feeTest).costs.total
  const decisions: ReportDecision[] = [
    {
      title: 'Re-forecast the Q3 openings target',
      evidence: `Plan covers about ${accounts(a.planQ3)} of ${accounts(a.gap)} incremental openings needed (${formatPercent(a.share)}).`,
      text: 'Approve a re-forecast of Q3 new checking openings, or name the new levers expected to close the rest.',
      proposed: `Proposed Q3 re-forecast ≈ ${accounts(Math.round(head.projected) + a.planQ3)} = ${accounts(head.projected)} (last-7-day pace) + ${accounts(a.planQ3)} (plan). Campaign effects aren't additive, so treat this as an upper bound.`,
    },
    {
      title: 'Application Rescue full rollout',
      evidence: pilotTracked?.actual
        ? `Pilot is "${pilotTracked.actual.lift.label}": ${(pilotTracked.actual.lift.uplift * 100).toFixed(1)} pp uplift after ${pilotTracked.actual.lift.daysRun} days, 95% CI ${(pilotTracked.actual.lift.ci[0] * 100).toFixed(1)} to ${(pilotTracked.actual.lift.ci[1] * 100).toFixed(1)} pp.`
        : 'Pilot results unavailable.',
      text: `Decide after ${decideOn}, or as soon as the interval excludes 0.`,
      proposed: `Proposed: hold the full rollout; re-read the pilot on ${decideOn}.`,
    },
    {
      title: 'First-fee policy',
      evidence: `First-fee closures ${(g.feeRate * 100).toFixed(1)}% vs. ${(g.noFeeRate * 100).toFixed(1)}%: ${formatUsd(perLost)} of fee revenue per extra closed account vs. ${formatUsd(campaignAssumptions.annualValuePerPrimary)} illustrative account value.`,
      text: 'Approve a First-Fee Forgiveness test on the customers approaching the fee threshold.',
      proposed: `Proposed: approve a ${feeTest.offer.durationDays}-day First-Fee Forgiveness test on ${accounts(feeTest.audience)} accounts (${Math.round(feeTest.holdoutShare * 100)}% holdout), planned cost ${formatUsd(feeTestCost)}.`,
    },
    {
      title: 'Branch scorecard',
      evidence:
        branch && digital
          ? `Branch never-activated ${formatPercent1(getNeverActivated(branch).share)} vs. ${formatPercent1(getNeverActivated(digital).share)} for digital.`
          : '',
      text: 'Add 30-day activation to branch scorecards alongside openings.',
      proposed: 'Proposed: add the 30-day activation rate to the branch scorecard, next to openings.',
    },
  ]

  return {
    id: `report-${now.getTime()}`,
    generatedAt: now.toISOString(),
    internalAsOf: reportingPeriod.internalAsOf,
    quarter: reportingPeriod.quarter,
    headline: {
      text: `At the last-7-day pace (${Math.round(head.paceDailyRate)}/day) Q3 openings land at ${accounts(head.projected)}; ${accounts(head.incrementalNeeded)} more are needed beyond that pace to reach ${accounts(openingsKpi.target)} (required ${head.requiredMultiple.toFixed(1)}× the recent pace).`,
      reference: `Reference, at the quarter-average pace (${Math.round(average.paceDailyRate)}/day): ${accounts(average.projected)} projected, ${accounts(average.incrementalNeeded)} needed. Last-quarter conversion rates are business as usual, already inside the pace.`,
    },
    kpis,
    changes,
    campaigns,
    totals: totalRows,
    feasibility,
    risks,
    decisions,
  }
}

export function reportTitle(r: ReportSnapshot): string {
  return `Weekly report · ${r.quarter} · data as of ${shortDate(r.internalAsOf)}`
}

/** Plain Markdown for the clipboard. */
export function reportToMarkdown(r: ReportSnapshot): string {
  const lines: string[] = [
    `# Checking weekly report (${r.quarter})`,
    `Generated ${new Date(r.generatedAt).toLocaleString('en-US')} · Internal data as of ${formatDate(r.internalAsOf)} · Illustrative`,
    '',
    `**Headline:** ${r.headline.text}`,
    `${r.headline.reference}`,
    '',
    '## 1. KPI status',
    '| Product | KPI | Target | Actual | vs. expected | % of full target | Status | Change vs. last week |',
    '|---|---|---:|---:|---:|---:|---|---|',
    ...r.kpis.map((k) => `| ${k.product} | ${k.label} | ${k.target} | ${k.actual} | ${k.vsExpected} | ${k.ofTarget} | ${k.status} | ${k.change} |`),
    '_vs. expected: counts and deposits = actual ÷ expected by now; rates = actual ÷ target._',
    '',
    '## 2. Top 3 things that changed',
    ...r.changes.map((c, i) => `${i + 1}. ${c}`),
    '',
    '## 3. Campaign results',
    ...(r.campaigns.length
      ? r.campaigns.map((c) => `- **${c.name}** (${c.status}, ${c.type}): ${c.result}. ${c.liftLabel}. Cost per incremental primary ${c.costPerIncrementalPrimary} (${c.note}).`)
      : ['- No Live or Completed campaigns.']),
    ...r.totals.map((t) => `- ${t.label}: ${t.value}`),
    `- ${r.feasibility.text}`,
    '- Campaign effects aren\'t additive; audiences and baselines can overlap.',
    '',
    '## 4. Risks and early-warning signals',
    ...r.risks.map((x) => `- ${x}`),
    '',
    '## 5. Decisions needed from leadership',
    ...r.decisions.map((d, i) => `${i + 1}. **${d.title}.** ${d.text} _Evidence: ${d.evidence}_ ${d.proposed}`),
    '',
    '_All internal figures are synthetic and illustrative. External facts are sourced on the dashboard._',
  ]
  return lines.join('\n')
}

