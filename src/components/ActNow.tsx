import { ArrowRight, Bell, Megaphone, ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { seedCampaigns } from '../data/campaignSeeds'
import { dropOffSignals, riskSegments, riskSegmentSignal } from '../data/checkingHealth'
import { seedLift } from '../lib/campaignTracking'
import { useCampaigns } from '../lib/campaignStore'
import { rankRiskSegments } from '../lib/checkingHealth'
import { checkingHref } from '../lib/checkingTabs'
import { formatValue } from '../lib/metrics'
import { useTriggeredAlerts } from '../lib/trackingStore'

const accounts = (n: number) => formatValue(n, 'accounts')
const linkClass = 'inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue'

/** Today tab: the three things that need a decision now, each linking to the tab where you act on it. */
export default function ActNow() {
  const alerts = useTriggeredAlerts()
  const top = rankRiskSegments(riskSegments, dropOffSignals, riskSegmentSignal)
  const liveSeeds = seedCampaigns.filter((c) => c.status === 'live').map((c) => ({ c, lift: seedLift(c) }))
  const liveSaved = useCampaigns().campaigns.filter((c) => c.status === 'live')

  return (
    <section aria-labelledby="act-now-heading" className="rounded-md border border-brand-orange/40 bg-orange-50/40 p-5 shadow-sm">
      <h2 id="act-now-heading" className="heading-accent scroll-mt-24 text-lg font-semibold text-brand-ink">
        Act now
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Box icon={<Bell className="h-4 w-4" aria-hidden />} title={`Triggered alerts (${alerts.length})`}>
          {alerts.length === 0 ? (
            <p className="text-slate-600">No alerts triggered.</p>
          ) : (
            <ul className="space-y-1.5">
              {alerts.map((a) => (
                <li key={a.rule.id} className="text-red-800">
                  <strong>{a.title}</strong>
                  <span className="block text-xs text-slate-600">{a.evidence}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to={checkingHref('since-heading')} className={`mt-2 ${linkClass}`}>
            Alert details and rules <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Box>

        <Box icon={<ShieldAlert className="h-4 w-4" aria-hidden />} title="Top 3 risk segments (size × lift)">
          <ol className="list-decimal space-y-1.5 pl-4">
            {top.map(({ segment, signal, lift, score }) => (
              <li key={segment.id}>
                <Link to={checkingHref(`risk-${segment.id}`)} className="font-medium text-brand-blue hover:underline">
                  {segment.name}
                </Link>
                <span className="block text-xs text-slate-600">
                  {accounts(segment.eligibleCustomers)} × {lift.toFixed(1)}× lift ({signal?.name ?? 'no linked signal'}) = {accounts(Math.round(score))}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-slate-500">Lift borrowed from each segment's closest early-warning signal (illustrative mapping).</p>
        </Box>

        <Box icon={<Megaphone className="h-4 w-4" aria-hidden />} title={`Live campaigns (${liveSeeds.length + liveSaved.length})`}>
          {liveSeeds.length + liveSaved.length === 0 ? (
            <p className="text-slate-600">No live campaigns.</p>
          ) : (
            <ul className="space-y-1.5">
              {liveSeeds.map(({ c, lift }) => (
                <li key={c.id}>
                  <strong>{c.name}</strong>: <span className="font-medium">{lift.label}</span>
                  <span className="block text-xs text-slate-600">
                    {lift.uplift >= 0 ? '+' : '−'}
                    {Math.abs(lift.uplift * 100).toFixed(1)} pp after {lift.daysRun} days
                  </span>
                </li>
              ))}
              {liveSaved.map((c) => (
                <li key={c.id} className="text-xs text-slate-600">
                  {c.inputs.name}: Live, no results feed yet
                </li>
              ))}
            </ul>
          )}
          <Link to={checkingHref('tracker-heading')} className={`mt-2 ${linkClass}`}>
            Open the Campaign Tracker <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Box>
      </div>
    </section>
  )
}

function Box({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
      <h3 className="flex items-center gap-1.5 font-semibold text-brand-ink">
        {icon}
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </div>
  )
}
