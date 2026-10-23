import { ArrowRight, Bell, CheckCheck, ChevronDown, ChevronRight, History } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { dropOffSignals } from '../data/checkingHealth'
import { dailyOpenings } from '../data/dailyOpenings'
import { getKpi, reportingPeriod } from '../data/productMetrics'
import { marketSignals } from '../data/marketSignals'
import {
  cumulativeOpenings,
  daysUntil,
  expiryLabel,
  getFlagChanges,
  getWeeklyPace,
  getWindow,
  planDailyPace,
  paceRatioAt,
  statusFromRatio,
  sumDays,
  windowLabel,
} from '../lib/dailyTracking'
import { formatPercent, formatTimestamp, formatValue } from '../lib/metrics'
import { getPaceProjection } from '../lib/projection'
import { getStrongestSignal } from '../lib/checkingHealth'
import { markVisitSeen, useLastVisit, useTriggeredAlerts } from '../lib/trackingStore'
import { seedCampaigns } from '../data/campaignSeeds'
import { liveWindowChange } from '../lib/campaignTracking'
import { useCampaigns } from '../lib/campaignStore'
import AlertRulesEditor from './AlertRulesEditor'
import StatusBadge from './StatusBadge'

/** Competitor offers that end within this many days of their retrieval date. */
const EXPIRING_WITHIN_DAYS = 30
/** Besides the strongest signal (always shown first), how many other signals to list, biggest movers first. */
const OTHER_SIGNALS = 2

const accounts = (n: number) => formatValue(n, 'accounts')
const signedPct = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1)}%`

interface Props {
  /** Home page: a short summary that links to the Checking page. */
  compact?: boolean
}

/** What moved in the data since the Product Owner last looked, plus any triggered alerts. */
export default function SinceLastVisit({ compact = false }: Props) {
  const lastVisit = useLastVisit()
  const alerts = useTriggeredAlerts()
  const [showRules, setShowRules] = useState(false)
  const w = getWindow(lastVisit)

  const opened = cumulativeOpenings(w.toDay) - cumulativeOpenings(w.fromDay)
  const branch = sumDays(dailyOpenings.map((d) => d.branch), w.fromDay, w.toDay)
  const digital = sumDays(dailyOpenings.map((d) => d.digital), w.fromDay, w.toDay)
  const paceBefore = paceRatioAt(w.fromDay)
  const paceNow = paceRatioAt(w.toDay)
  const statusBefore = statusFromRatio(paceBefore)
  const statusNow = statusFromRatio(paceNow)
  const strongestId = getStrongestSignal(dropOffSignals).id
  const flagChanges = getFlagChanges(w)
  const flagMovers = [
    ...flagChanges.filter((f) => f.id === strongestId),
    ...flagChanges
      .filter((f) => f.id !== strongestId)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, OTHER_SIGNALS),
  ]
  const weekly = getWeeklyPace()
  const liveSeeds = seedCampaigns.filter((c) => c.status === 'live').map((c) => ({ c, ...liveWindowChange(c, w) }))
  const liveSaved = useCampaigns().campaigns.filter((c) => c.status === 'live')
  const required = getPaceProjection(getKpi('checking-new-accounts'), reportingPeriod).requiredDailyRate
  const expiring = marketSignals
    .map((s) => ({ s, left: daysUntil(s.offer?.expires, s.retrievedOn) }))
    .filter((x): x is { s: (typeof marketSignals)[number]; left: number } => x.left !== undefined && x.left <= EXPIRING_WITHIN_DAYS)
    .sort((a, b) => a.left - b.left)

  const heading = w.firstVisit
    ? `First visit: last ${w.days} days of data (${windowLabel(w)})`
    : `Since your last visit on ${formatTimestamp(w.lastVisitAt ?? '')}: ${w.days} day${w.days === 1 ? '' : 's'} of data (${windowLabel(w)})`

  if (compact) {
    return (
      <section aria-labelledby="since-compact-heading" className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="since-compact-heading" className="flex items-center gap-1.5 text-sm font-semibold text-brand-ink">
            <History className="h-4 w-4" aria-hidden />
            What changed · Checking
          </h2>
          <span className="text-xs text-slate-500">{heading}</span>
        </div>
        <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm text-slate-700 sm:grid-cols-2">
          <li>
            +{accounts(opened)} openings; pace {formatPercent(paceBefore)} → {formatPercent(paceNow)}
          </li>
          <li>
            {flagMovers[0] && (
              <>
                {flagMovers[0].name}: {accounts(flagMovers[0].current)} new flags ({signedPct(flagMovers[0].change)})
              </>
            )}
          </li>
          <li>
            {expiring.length} competitor offer{expiring.length === 1 ? '' : 's'} ending within {EXPIRING_WITHIN_DAYS} days
          </li>
          <li className={alerts.length ? 'font-medium text-red-700' : ''}>
            {alerts.length} alert{alerts.length === 1 ? '' : 's'} triggered
          </li>
        </ul>
        <Link
          to="/opportunities/checking#since-heading"
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        >
          See details on Checking Insights
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>
    )
  }

  return (
    <section aria-labelledby="since-heading" className="scroll-mt-24 rounded-md border border-brand-blue/30 bg-blue-50/40 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="since-heading" className="flex items-center gap-1.5 text-lg font-semibold text-brand-ink">
            <History className="h-5 w-5" aria-hidden />
            Since your last visit
          </h2>
          <p className="text-xs text-slate-600">
            {heading}. Internal data runs through Sep 12, so a real day away maps to a day of data.
          </p>
        </div>
        <button
          type="button"
          onClick={() => markVisitSeen()}
          className="inline-flex items-center gap-1 rounded border border-brand-blue bg-white px-3 py-1.5 text-sm font-medium text-brand-blue hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        >
          <CheckCheck className="h-4 w-4" aria-hidden />
          Mark as seen
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Item title="Openings">
          <p>
            <strong>+{accounts(opened)}</strong> new accounts ({accounts(branch)} branch · {accounts(digital)} digital)
          </p>
          <p className="mt-1">
            Pace {formatPercent(paceBefore)} → <strong>{formatPercent(paceNow)}</strong> of expected
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-1">
            Status <StatusBadge status={statusBefore} /> → <StatusBadge status={statusNow} />
            {statusBefore === statusNow && <span className="text-xs text-slate-500">(no change)</span>}
          </p>
          <p className="mt-2 border-t border-slate-100 pt-2">
            This week <strong>{Math.round(weekly.weekPerDay)}/day</strong> ({accounts(weekly.weekTotal)} ÷ 7) vs.{' '}
            {Math.round(weekly.quarterPerDay)}/day quarter average:{' '}
            <span className={weekly.slowing ? 'font-medium text-red-700' : 'font-medium text-green-700'}>
              {weekly.slowing ? 'slowing' : 'speeding up'}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            For reference: plan pace {Math.round(planDailyPace())}/day; required from here {Math.round(required)}/day to hit
            target.
          </p>
        </Item>

        <Item title="Early-warning flags">
          <ul className="space-y-1">
            {flagMovers.map((f) => (
              <li key={f.id}>
                {f.name}
                {f.id === strongestId && (
                  <span className="ml-1 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-800">Strongest</span>
                )}
                : <strong>{accounts(f.current)}</strong> new{' '}
                <span className={f.change > 0 ? 'text-red-700' : 'text-green-700'}>({signedPct(f.change)})</span>
                <span className="block text-xs text-slate-500">
                  vs. {accounts(f.previous)} in the {w.days} day{w.days === 1 ? '' : 's'} before
                </span>
              </li>
            ))}
          </ul>
        </Item>

        <Item title="Competitor offers ending soon">
          {expiring.length === 0 ? (
            <p>None within {EXPIRING_WITHIN_DAYS} days.</p>
          ) : (
            <ul className="space-y-1">
              {expiring.map(({ s, left }) => (
                <li key={s.id}>
                  <strong>{s.competitor ?? s.source}</strong>: {expiryLabel(left, s.retrievedOn)}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-xs text-slate-500">Counted from each offer's retrieval date (external), not Sep 12.</p>
        </Item>

        <Item title="Alerts & campaigns">
          {alerts.length === 0 ? (
            <p>No alerts triggered.</p>
          ) : (
            <ul className="space-y-1">
              {alerts.map((a) => (
                <li key={a.rule.id} className="text-red-800">
                  <Bell className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                  <strong>{a.title}</strong>
                  <span className="block text-xs text-slate-600">{a.evidence}</span>
                </li>
              ))}
            </ul>
          )}
          <h4 className="mt-2 text-xs font-semibold text-slate-500">Live campaigns</h4>
          {liveSeeds.length + liveSaved.length === 0 ? (
            <p className="text-xs text-slate-500">No live campaigns.</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {liveSeeds.map(({ c, newTreatedOpenings, lift }) => (
                <li key={c.id}>
                  <strong>{c.name}</strong>: +{accounts(newTreatedOpenings)} treated openings in this window; uplift so far{' '}
                  {lift.uplift >= 0 ? '+' : '−'}
                  {Math.abs(lift.uplift * 100).toFixed(1)} pp ({lift.daysRun} days) ·{' '}
                  <span className="font-medium">{lift.label}</span>
                </li>
              ))}
              {liveSaved.map((c) => (
                <li key={c.id} className="text-xs text-slate-500">
                  {c.inputs.name}: Live, no results feed yet
                </li>
              ))}
            </ul>
          )}
          <a href="#tracker-heading" className="mt-1 inline-block text-xs font-medium text-brand-blue hover:underline">
            Open the Campaign Tracker
          </a>
        </Item>
      </div>

      <button
        type="button"
        onClick={() => setShowRules((v) => !v)}
        aria-expanded={showRules}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
      >
        {showRules ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
        Manage alert rules
      </button>
      {showRules && (
        <div className="mt-3">
          <AlertRulesEditor />
        </div>
      )}
    </section>
  )
}

function Item({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
      <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">{title}</h3>
      {children}
    </div>
  )
}
