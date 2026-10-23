import { AlertTriangle, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { summerMath } from '../data/campaignSeeds'
import { dayToIso } from '../data/dailyOpenings'
import { OUTCOME_LABELS } from '../lib/campaignEconomics'
import { CAMPAIGN_STATUSES, useCampaigns, type CampaignStatus, type SavedCampaign } from '../lib/campaignStore'
import { getTotals, getTrackedCampaigns, MIN_DAYS, MIN_HOLDOUT, type Lift, type OverlapEntry, type OverlapUnit, type TrackedCampaign } from '../lib/campaignTracking'
import { CHART_COLORS } from '../lib/chartColors'
import { formatSignedCount, formatUsd } from '../lib/checkingHealth'
import { shortDate } from '../lib/dailyTracking'
import { formatValue } from '../lib/metrics'
import { FunnelTable } from './ActivationFunnel'
import { KindBadge } from './PromotionBuilder'
import SectionCard from './SectionCard'

const accounts = (n: number) => formatValue(n, 'accounts')
const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`
const pp = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(2)} pp`
const money = (n: number) => (!Number.isFinite(n) ? 'n/a' : Math.abs(n) < 100 ? `$${n.toFixed(2)}` : formatUsd(n))

const STATUS_STYLES: Record<TrackedCampaign['status'], string> = {
  live: 'bg-green-100 text-green-800',
  completed: 'bg-slate-200 text-slate-700',
  draft: 'bg-amber-50 text-amber-800',
}

export default function CampaignTracker({ onEdit }: { onEdit: (campaign: SavedCampaign) => void }) {
  const { campaigns, setStatus, deleteCampaign } = useCampaigns()
  const tracked = getTrackedCampaigns(campaigns)
  const totals = getTotals(campaigns)
  const order: Record<TrackedCampaign['status'], number> = { live: 0, draft: 1, completed: 2 }

  return (
    <SectionCard
      id="tracker-heading"
      title="Campaign Tracker"
      source="internal"
      description="Every campaign with its status, lift against the holdout, funnel, and spend. Seeded campaigns are illustrative and carved out of the existing 7,600 openings; campaigns you save in the builder show their plan until results arrive."
    >
      <Totals totals={totals} />

      <ul className="mt-6 space-y-4">
        {[...tracked].sort((a, b) => order[a.status] - order[b.status]).map((t) => (
          <li key={t.id}>
            {t.status === 'completed' && t.actual ? (
              // Finished campaigns collapse to one line so the Act tab stays short; Expand shows the full card.
              <CollapsedCompleted t={t}>
                <CampaignCard t={t} onStatus={() => {}} onDelete={() => {}} onEdit={onEdit} />
              </CollapsedCompleted>
            ) : (
              <CampaignCard
                t={t}
                saved={t.origin === 'builder' ? campaigns.find((c) => c.id === t.id) : undefined}
                onStatus={(s) => setStatus(t.id, s)}
                onDelete={() => deleteCampaign(t.id)}
                onEdit={onEdit}
              />
            )}
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}

function Totals({ totals }: { totals: ReturnType<typeof getTotals> }) {
  const a = totals.acquisition
  return (
    <section aria-labelledby="totals-heading" className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <h4 id="totals-heading" className="text-sm font-semibold text-brand-ink">Totals by type (never summed across types)</h4>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <TotalBox title="Acquisition · openings">
          <p>
            Delivered so far: <strong>{accounts(a.delivered)}</strong> incremental openings (seeds, already inside the 7,600 actual).
          </p>
          <p className="mt-1">
            Plan: <strong>{accounts(a.planQ3)}</strong> incremental Q3 openings vs. <strong>{accounts(a.gap)}</strong> needed beyond the
            last-7-day pace ({accounts(a.gapAverage)} at the quarter-average pace).
          </p>
        </TotalBox>
        <TotalBox title="Closure prevention · net account change">
          {totals.closure.count === 0 ? (
            <p className="text-slate-500">No closure-prevention campaigns saved yet.</p>
          ) : (
            <p>
              Q3: <strong>{formatSignedCount(totals.closure.netNow ?? 0)} → {formatSignedCount((totals.closure.netNow ?? 0) + totals.closure.q3)}</strong> ·
              next 90 days: <strong>+{accounts(totals.closure.next90)}</strong> ({totals.closure.count} planned
              {totals.closure.counted < totals.closure.count ? `, ${totals.closure.counted} counted after overlap` : ''})
            </p>
          )}
        </TotalBox>
        <TotalBox title="Activation · primacy">
          {totals.activation.count === 0 ? (
            <p className="text-slate-500">No activation campaigns saved yet.</p>
          ) : (
            <p>
              <strong>{accounts(totals.activation.activated)}</strong> accounts activated · primacy +{totals.activation.liftPts.toFixed(2)} pts in Q3
            </p>
          )}
        </TotalBox>
        <TotalBox title="Cross-sell · deposits">
          {totals.crossSell.count === 0 ? (
            <p className="text-slate-500">No cross-sell campaigns saved yet.</p>
          ) : (
            <p>
              <strong>{formatUsd(totals.crossSell.deposits)}</strong> savings deposits captured ({totals.crossSell.count} planned
              {totals.crossSell.counted < totals.crossSell.count ? `, ${totals.crossSell.counted} counted after overlap` : ''})
            </p>
          )}
        </TotalBox>
      </div>
      <OverlapNote overlaps={totals.overlaps} />

      <div className={`mt-4 rounded-md border p-3 text-sm ${a.unlikely ? 'border-red-200 bg-red-50 text-red-900' : 'border-slate-200 bg-white text-slate-800'}`}>
        <p>
          <strong>Feasibility:</strong> if every acquisition campaign in the plan runs: about <strong>{accounts(a.planQ3)}</strong> incremental
          Q3 openings vs. <strong>{accounts(a.gap)}</strong> needed, so <strong>{pct(a.share, 0)}</strong> of the gap.
        </p>
        {a.unlikely && (
          <p className="mt-1 flex items-start gap-1.5 font-semibold">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Target unlikely without new levers: consider re-forecasting.
          </p>
        )}
        <p className="mt-2 text-xs text-slate-600">
          Plan ={' '}
          {a.plan.map((p, i) => (
            <span key={p.name}>
              {i > 0 && ' + '}
              {p.name} {accounts(p.q3Incremental)} ({p.from === 'saved' ? p.status : 'preset default, not saved'})
            </span>
          ))}{' '}
          = {accounts(a.planQ3)}. {accounts(a.planQ3)} ÷ {accounts(a.gap)} = {pct(a.share, 1)}. Seeded campaigns are excluded: their
          openings are already in the actual.
        </p>
      </div>
      <p className="mt-2 text-xs text-slate-500">Campaign effects aren't additive. Audiences and baselines can overlap.</p>
    </section>
  )
}

/** Overlapping campaigns on a segment reach the same customers: only the one with the higher net value counts. */
function OverlapNote({ overlaps }: { overlaps: OverlapEntry[] }) {
  if (overlaps.length === 0) return null
  const detail = (u: OverlapUnit) =>
    [u.saves > 0 && `${accounts(u.saves)} saves`, u.savingsAccounts > 0 && `${accounts(u.savingsAccounts)} savings accounts`].filter(Boolean).join(' + ') || 'no results'
  return (
    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
      {overlaps.map((o) => (
        <p key={o.kept.name + o.segmentLabel}>
          <strong>Overlap removed ({o.segmentLabel}):</strong> kept {o.kept.name}, net {formatUsd(o.kept.net)} ({detail(o.kept)}); dropped{' '}
          {o.dropped.map((d) => `${d.name}, net ${formatUsd(d.net)} (${detail(d)})`).join('; ')}. Same segment = same customers, so only the
          higher net value (annual value − cost) counts in the totals above.
        </p>
      ))}
    </div>
  )
}

function CollapsedCompleted({ t, children }: { t: TrackedCampaign; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const a = t.actual
  if (open || !a) {
    return (
      <div>
        {children}
        <button type="button" onClick={() => setOpen(false)} aria-expanded="true" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline">
          <ChevronUp className="h-3.5 w-3.5" aria-hidden /> Collapse
        </button>
      </div>
    )
  }
  return (
    <article className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm">
      <p className="text-slate-700">
        <strong className="text-brand-ink">{t.name}</strong> · Completed · {a.lift.label} · {accounts(a.lift.incremental)} incremental ·{' '}
        {money(a.costPerIncrementalPrimary)} per incr. primary
      </p>
      <button type="button" onClick={() => setOpen(true)} aria-expanded="false" className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs font-medium text-brand-blue hover:bg-slate-50">
        <ChevronDown className="h-3.5 w-3.5" aria-hidden /> Expand
      </button>
    </article>
  )
}

function TotalBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
      <h5 className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">{title}</h5>
      {children}
    </div>
  )
}

interface CardProps {
  t: TrackedCampaign
  saved?: SavedCampaign
  onStatus: (s: CampaignStatus) => void
  onDelete: () => void
  onEdit: (c: SavedCampaign) => void
}

function CampaignCard({ t, saved, onStatus, onDelete, onEdit }: CardProps) {
  const kind = t.inputs?.kind ?? 'acquisition'
  const outcome = t.inputs?.outcome ?? 'openings'
  return (
    <article className="rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="flex flex-wrap items-center gap-2 font-semibold text-brand-ink">
            {t.name}
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[t.status]}`}>
              {CAMPAIGN_STATUSES.find((s) => s.id === t.status)?.label}
            </span>
            {t.origin === 'seed' && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Illustrative seed</span>}
            {saved?.nba && <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-800 ring-1 ring-orange-200">From next best action</span>}
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            {t.actual ? `${t.actual.dates} · ` : ''}
            {t.seed ? `${accounts(t.seed.audience)} audience (${accounts(t.seed.audience - t.seed.holdout)} treated + ${accounts(t.seed.holdout)} holdout) · ${t.seed.offer}` : `${t.inputs?.sourceLabel} · ${accounts(t.plan?.treated ?? 0)} treated + ${accounts(t.plan?.holdout ?? 0)} holdout`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <KindBadge kind={kind} outcome={outcome} />
          {saved && (
            <>
              <select value={saved.status} onChange={(ev) => onStatus(ev.target.value as CampaignStatus)} aria-label={`Status of ${t.name}`} className="rounded border border-slate-300 px-2 py-1 text-xs">
                {CAMPAIGN_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => onEdit(saved)} className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs text-brand-blue hover:bg-slate-50" aria-label={`Edit ${t.name}`}>
                <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
              </button>
              <button type="button" onClick={onDelete} className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs text-brand-blue hover:bg-slate-50" aria-label={`Delete ${t.name}`}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      {t.actual && t.seed ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <LiftTable lift={t.actual.lift} />
            <Sparkline rows={t.seed.treatedDaily} />
          </div>
          {t.seed.id === 'seed-summer-switch' && (
            <p className="rounded-md bg-slate-50 p-3 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">Derivation:</span> July openings {accounts(summerMath.julyOpenings)}; post-promotion run
              rate = {accounts(summerMath.postOpenings)} ÷ {summerMath.postDays} days = {summerMath.postRunRate.toFixed(1)}/day; incremental by run rate ={' '}
              {accounts(summerMath.julyOpenings)} − {summerMath.postRunRate.toFixed(1)} × {summerMath.julyDays} = {summerMath.incrementalByRunRate.toFixed(1)}. Measured
              against the holdout: {accounts(t.actual.lift.incremental)} (whole-account rounding of the holdout's {accounts(t.actual.lift.holdoutOpenings)}{' '}
              openings). {t.seed.derivation}
            </p>
          )}
          {t.seed.id !== 'seed-summer-switch' && <p className="text-xs text-slate-500">{t.seed.derivation}</p>}
          <div>
            <h5 className="text-sm font-medium text-slate-700">Funnel for this campaign's treated openings</h5>
            <div className="mt-2">
              <FunnelTable
                channels={t.actual.funnel.channels}
                maturing={{
                  activated: t.actual.funnel.activation.maturing,
                  primary: t.actual.funnel.primary.maturing,
                  metBonus: t.seed.costs.bonusUsd > 0 ? t.actual.funnel.metBonus.maturing : undefined,
                }}
                bonusRow={
                  t.seed.costs.bonusUsd > 0
                    ? { label: 'Met bonus requirement (60 days)', byChannel: t.actual.funnel.metBonus.byChannel, total: t.actual.funnel.metBonus.soFar }
                    : undefined
                }
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              At maturity: activated {accounts(t.actual.funnel.activation.atMaturity)}
              {t.seed.costs.bonusUsd > 0 && <>, met bonus requirement {accounts(t.actual.funnel.metBonus.atMaturity)}</>}, primary{' '}
              {accounts(t.actual.funnel.primary.atMaturity)}. Never activated after 30 days: {accounts(t.actual.funnel.neverActivated)} (not maturing).
            </p>
          </div>
          <SpendAndPlan t={t} />
        </div>
      ) : (
        <PlanOnly t={t} />
      )}
    </article>
  )
}

function LiftTable({ lift }: { lift: Lift }) {
  const tone = lift.label === 'Significant' ? 'bg-green-100 text-green-800' : lift.label === 'Too early' ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-800'
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h5 className="text-sm font-medium text-slate-700">Lift vs. holdout</h5>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>{lift.label}</span>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
        <Metric label="Treated rate" value={pct(lift.treatedRate, 2)} note={`${accounts(lift.treatedOpenings)} ÷ ${accounts(lift.treatedN)}`} />
        <Metric label="Holdout rate" value={pct(lift.holdoutRate, 2)} note={`${accounts(lift.holdoutOpenings)} ÷ ${accounts(lift.holdoutN)}`} />
        <Metric label="Uplift" value={pp(lift.uplift)} note="treated − holdout" />
        <Metric label="95% interval" value={`${pp(lift.ci[0])} to ${pp(lift.ci[1])}`} note={`± 1.96 × SE (${(lift.standardError * 100).toFixed(2)} pp)`} />
        <Metric label="Incremental openings" value={accounts(lift.incremental)} note={`${accounts(lift.treatedN)} × uplift`} />
        <Metric label="Days of results" value={`${lift.daysRun}`} note={`holdout ${accounts(lift.holdoutN)}`} />
      </dl>
      <p className="mt-2 text-xs text-slate-500">
        SE = √(p₁(1−p₁)/n₁ + p₂(1−p₂)/n₂). "Too early" if the holdout is under {MIN_HOLDOUT} people or fewer than {MIN_DAYS} days have passed;
        "Not yet significant" if the interval includes 0.
      </p>
    </div>
  )
}

function Sparkline({ rows }: { rows: { day: number; branch: number; digital: number }[] }) {
  const data = rows.map((r) => ({ day: r.day, openings: r.branch + r.digital }))
  return (
    <div>
      <h5 className="text-sm font-medium text-slate-700">Daily treated openings</h5>
      <div className="mt-2 h-20" role="img" aria-label="Daily treated openings for this campaign">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="day" hide />
            <Tooltip formatter={(v) => [accounts(Number(v)), 'Treated openings']} labelFormatter={(d) => shortDate(dayToIso(Number(d)))} />
            <Bar dataKey="openings" fill={CHART_COLORS.branch} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-slate-500">
        {shortDate(dayToIso(rows[0]?.day ?? 1))} → {shortDate(dayToIso(rows[rows.length - 1]?.day ?? 1))}
      </p>
    </div>
  )
}

function SpendAndPlan({ t }: { t: TrackedCampaign }) {
  const a = t.actual
  if (!a) return null
  const p = a.projection
  const ended = p.factor === 1
  const dash = '—'
  // Columns: plan pro-rated to date | actual to date | full plan | projected full campaign (end + maturity).
  const rows: [string, string, string, string, string, string][] = [
    [
      'Incremental openings',
      a.planToDate ? accounts(a.planToDate.incremental) : dash,
      accounts(a.lift.incremental),
      t.plan ? accounts(t.plan.results.incremental) : dash,
      accounts(p.incremental),
      `Plan to date = full plan × ${a.lift.daysRun} ÷ ${p.campaignDays} days. Projected = actual × ${p.campaignDays} ÷ ${a.lift.daysRun}${ended ? ' (ended: same as actual)' : ''}.`,
    ],
    [
      'Cost',
      dash,
      formatUsd(a.spend.toDate),
      t.plan ? formatUsd(t.plan.costs.total) : dash,
      formatUsd(a.spend.projected),
      `To date: channel ${formatUsd(a.spend.channel)} + bonuses ${formatUsd(a.spend.bonusToDate)} (accounts that met the requirement so far) + per-opening ${formatUsd(a.spend.perOpeningToDate)}. Projected: channel + bonuses ${formatUsd(a.spend.bonusProjected)} + per-opening ${formatUsd(a.spend.perOpeningProjected)} (${accounts(p.openings)} openings).`,
    ],
    [
      'Cost per incremental primary',
      dash,
      dash,
      t.plan?.costPerIncrementalPrimary !== undefined ? money(t.plan.costPerIncrementalPrimary) : dash,
      money(a.costPerIncrementalPrimary),
      `Both at campaign end and account maturity. Projected = ${formatUsd(a.spend.projected)} ÷ ${accounts(p.incrementalPrimary)} (${accounts(p.incremental)} incremental × ${pct(a.lift.treatedOpenings ? a.funnel.primary.atMaturity / a.lift.treatedOpenings : 0)} primary at maturity).`,
    ],
  ]
  return (
    <div>
      <h5 className="text-sm font-medium text-slate-700">{t.plan ? 'Planned vs. actual (same time basis)' : 'Actual (no builder plan: seeded before the builder existed)'}</h5>
      <div className="relative mt-2 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="py-1.5 pr-3 font-medium">Measure</th>
              <th scope="col" className="py-1.5 pr-3 text-right font-medium">Plan to date</th>
              <th scope="col" className="py-1.5 pr-3 text-right font-medium">Actual to date</th>
              <th scope="col" className="py-1.5 pr-3 text-right font-medium">Full plan</th>
              <th scope="col" className="py-1.5 pr-3 text-right font-medium">Projected (end + maturity)</th>
              <th scope="col" className="py-1.5 font-medium">How</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(([label, planToDate, actual, plan, projected, how]) => (
              <tr key={label} className="align-top">
                <th scope="row" className="py-1.5 pr-3 font-medium text-brand-ink">{label}</th>
                <td className="py-1.5 pr-3 text-right tabular-nums">{planToDate}</td>
                <td className="py-1.5 pr-3 text-right font-semibold tabular-nums">{actual}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{plan}</td>
                <td className="py-1.5 pr-3 text-right font-semibold tabular-nums">{projected}</td>
                <td className="py-1.5 text-xs text-slate-500">{how}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {t.status === 'live' && (
        <p className="mt-1 text-xs text-slate-500">
          Live: {a.lift.daysRun} of {p.campaignDays} days run; most accounts are still inside their 30/60/90-day windows.
        </p>
      )}
    </div>
  )
}

function PlanOnly({ t }: { t: TrackedCampaign }) {
  const e = t.plan
  if (!e || !t.inputs) return null
  const outcome = OUTCOME_LABELS[t.inputs.outcome]
  return (
    <div className="relative mt-3 overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="py-1.5 pr-3 font-medium">Measure</th>
            <th scope="col" className="py-1.5 pr-3 text-right font-medium">Planned</th>
            <th scope="col" className="py-1.5 font-medium">Actual</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          <tr>
            <th scope="row" className="py-1.5 pr-3 font-medium text-brand-ink">{t.inputs.outcome === 'openings' ? 'Incremental openings' : outcome.title}</th>
            <td className="py-1.5 pr-3 text-right tabular-nums">
              {accounts(e.results.incremental)} ({accounts(e.timing.q3)} in Q3)
            </td>
            <td rowSpan={3} className="py-1.5 align-top text-xs text-slate-500">
              No results yet. This prototype has no live feed for campaigns created here; Live and Completed builder campaigns show their plan.
            </td>
          </tr>
          <tr>
            <th scope="row" className="py-1.5 pr-3 font-medium text-brand-ink">Cost</th>
            <td className="py-1.5 pr-3 text-right tabular-nums">{formatUsd(e.costs.total)}</td>
          </tr>
          <tr>
            <th scope="row" className="py-1.5 pr-3 font-medium text-brand-ink">
              {e.costPerIncrementalPrimary !== undefined ? 'Cost per incremental primary' : `Cost per ${outcome.noun.replace(/s$/, '')}`}
            </th>
            <td className="py-1.5 pr-3 text-right tabular-nums">{money(e.costPerIncrementalPrimary ?? e.costPerResult)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-semibold tabular-nums text-brand-ink">{value}</dd>
      <dd className="text-xs text-slate-500">{note}</dd>
    </div>
  )
}
