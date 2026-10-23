import { Check, ChevronLeft, ChevronRight, Send, ShieldCheck, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { DD_CHANGE_LABEL, NO_SAVINGS_BASE, SUPPRESSION_TEST_ID } from '../data/nbaCustomers'
import { useCampaigns } from '../lib/campaignStore'
import { formatUsd } from '../lib/checkingHealth'
import { formatValue } from '../lib/metrics'
import {
  ACTION_META,
  ACTION_ORDER,
  CONTACT_CAP_DAYS,
  NBA_RULES,
  nbaReconciliation,
  compareArms,
  nbaRecommendations,
  nbaRollup,
  OFFER_ACTIONS,
  RULE_CODES,
  type ActionGroup,
  type NbaAction,
  type NbaRecommendation,
  type RuleCode,
} from '../lib/nextBestAction'
import SectionCard from './SectionCard'

const PAGE_SIZE = 25
const n = (x: number) => formatValue(x, 'accounts')
const usd2 = (x: number) => `$${x.toFixed(2)}`
const pct = (x: number) => `${(x * 100).toFixed(1)}%`
const shortSignal: Record<string, string> = {
  'outbound-competitor-transfers': 'Outbound',
  'bill-pay-moved': 'Bill pay moved',
  'activity-ratio': 'Low activity',
  'balance-trend': 'Balance ↓',
  'fee-events': 'Fee event',
  'digital-disengagement': 'Digital ↓',
  'service-friction': 'Friction',
}

const ACTION_STYLE: Record<NbaAction, string> = {
  service: 'bg-slate-100 text-slate-800',
  wait: 'bg-slate-100 text-slate-600',
  bundle: 'bg-blue-50 text-blue-800',
  fee: 'bg-amber-50 text-amber-800',
  dd: 'bg-green-50 text-green-800',
  none: 'bg-white text-slate-500 ring-1 ring-slate-200',
}

/** Act tab: one recommended action per Direct deposit leaving customer, with reason codes and guardrails. */
export default function NextBestAction() {
  const rollup = nbaRollup()
  const recon = nbaReconciliation()
  const { upsertNbaDrafts } = useCampaigns()
  const [sent, setSent] = useState<{ created: number; updated: number } | null>(null)
  const [action, setAction] = useState<NbaAction | 'all'>('all')
  const [code, setCode] = useState<RuleCode | 'all'>('all')
  const [page, setPage] = useState(0)

  const filtered = nbaRecommendations.filter((r) => (action === 'all' || r.action === action) && (code === 'all' || r.codes.includes(code)))
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const visible = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)
  const test = nbaRecommendations.find((r) => r.customer.id === SUPPRESSION_TEST_ID)
  const testWouldMatch = test ? NBA_RULES.filter((r) => r.code !== 'R0' && r.test?.(test.customer)).map((r) => r.code) : []

  return (
    <SectionCard
      id="nba-heading"
      title={`Personalised next best action · Direct deposit leaving (${n(recon.rows)})`}
      source="internal"
      description="One recommendation per customer, chosen by the ordered rules below (first match wins) and explained by reason codes. Illustrative · synthetic rows: IDs only, no names, no real data."
    >
      <div id="nba-figure" className="space-y-4 bg-white">
        {/* Roll-up */}
        <div>
          <h4 className="text-sm font-semibold text-brand-ink">Roll-up: {n(rollup.total)} customers</h4>
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {ACTION_ORDER.map((a) => (
              <li key={a} className={`rounded-md px-3 py-1.5 text-sm ${ACTION_STYLE[a]}`}>
                <span className="block text-xs">{ACTION_META[a].label}</span>
                <strong className="tabular-nums">{n(rollup.counts[a])}</strong>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-slate-500">
            {ACTION_ORDER.map((a) => n(rollup.counts[a])).join(' + ')} = {n(ACTION_ORDER.reduce((s, a) => s + rollup.counts[a], 0))} rows.
          </p>
          <div className="relative mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th scope="col" className="py-1.5 pr-3 font-medium">Offer group (as a Draft, 10% holdout)</th>
                  <th scope="col" className="py-1.5 pr-3 text-right font-medium">Rows</th>
                  <th scope="col" className="py-1.5 pr-3 text-right font-medium">Treated</th>
                  <th scope="col" className="py-1.5 pr-3 text-right font-medium">Expected results</th>
                  <th scope="col" className="py-1.5 pr-3 text-right font-medium">Cost</th>
                  <th scope="col" className="py-1.5 text-right font-medium">Annual value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {rollup.groups.map((g) => (
                  <tr key={g.action}>
                    <th scope="row" className="py-1.5 pr-3 font-medium text-brand-ink">{ACTION_META[g.action].label}</th>
                    <td className="py-1.5 pr-3 text-right">{n(g.rows)}</td>
                    <td className="py-1.5 pr-3 text-right">{n(g.treated)}</td>
                    <td className="py-1.5 pr-3 text-right">
                      {n(g.economics.results.total)} <span className="text-xs text-slate-500">{g.economics.outcome === 'savings-accounts' ? 'savings accts' : 'saves'}</span>
                    </td>
                    <td className="py-1.5 pr-3 text-right">{formatUsd(g.economics.costs.total)}</td>
                    <td className="py-1.5 text-right">{formatUsd(g.economics.annualValue)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <th scope="row" className="py-1.5 pr-3">Total</th>
                  <td className="py-1.5 pr-3 text-right">{n(rollup.groups.reduce((s, g) => s + g.rows, 0))}</td>
                  <td className="py-1.5 pr-3 text-right">{n(rollup.groups.reduce((s, g) => s + g.treated, 0))}</td>
                  <td className="py-1.5 pr-3 text-right text-xs font-normal text-slate-500">not summed across types</td>
                  <td className="py-1.5 pr-3 text-right">{formatUsd(rollup.cost)}</td>
                  <td className="py-1.5 text-right">{formatUsd(rollup.value)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setSent(upsertNbaDrafts(rollup.groups.map((g) => ({ action: g.action, inputs: g.inputs }))))}
              className="inline-flex items-center gap-1.5 rounded bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
            >
              <Send className="h-4 w-4" aria-hidden /> Send to campaign
            </button>
            <p role="status" className="text-sm text-slate-700">
              {sent
                ? `${sent.created} Draft${sent.created === 1 ? '' : 's'} created, ${sent.updated} updated in the Campaign Tracker (labelled "From next best action").`
                : `Creates ${OFFER_ACTIONS.length} Drafts, one per offer group; clicking again updates them.`}
            </p>
          </div>
        </div>

        <Comparison />

        {/* Rules */}
        <div>
          <h4 className="text-sm font-semibold text-brand-ink">Rules, in order (first match wins)</h4>
          <div className="relative mt-2 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th scope="col" className="py-1.5 pr-3 font-medium">Code</th>
                  <th scope="col" className="py-1.5 pr-3 font-medium">Condition</th>
                  <th scope="col" className="py-1.5 pr-3 font-medium">Action</th>
                  <th scope="col" className="py-1.5 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 align-top">
                {NBA_RULES.map((r) => (
                  <tr key={r.code}>
                    <th scope="row" className="py-1.5 pr-3 font-semibold text-brand-ink">{r.code}</th>
                    <td className="py-1.5 pr-3">{r.condition}</td>
                    <td className="py-1.5 pr-3 font-medium">{r.action}</td>
                    <td className="py-1.5 text-slate-600">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            R5 runs after R2–R4: it checks the chosen offer. Channel = the customer’s preferred channel. Per-customer value and cost use the
            builder templates’ save or take-up rate, $250 account value (or balance × spread) and channel cost.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2 [&>*]:min-w-0">
        <Panel title="Guardrails" icon={<ShieldCheck className="h-4 w-4" aria-hidden />}>
          <p>
            <strong>Inputs used:</strong> direct-deposit change, the 7 other early-warning signals, outbound transfer destination, tenure band,
            balance band, channel preference, PNC savings held, outside-savings transfers, last contact date, hardship and complaint flags.
          </p>
          <p className="mt-1">
            <strong>Never used:</strong> age, gender, race and ethnicity, ZIP code or geography, marital status, or any other protected
            attribute or proxy. The synthetic data has none of these fields. Young Adults targeting stays segment-level and opt-in.
          </p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5">
            <li>Frequency cap: at most 1 offer per {CONTACT_CAP_DAYS} days (R1); {n(rollup.counts.wait)} customers wait.</li>
            <li>Suppression: hardship or an open complaint gets service outreach, not an offer (R0); {n(rollup.counts.service)} customers.</li>
            <li>Every recommendation is explained by its reason codes.</li>
          </ul>
          {test && (
            <p className={`mt-2 flex items-start gap-1.5 rounded border p-2 text-xs ${test.action === 'service' ? 'border-green-200 bg-green-50 text-green-900' : 'border-red-200 bg-red-50 text-red-900'}`}>
              {test.action === 'service' ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> : <X className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />}
              <span>
                <strong>Suppression test · {test.customer.id}:</strong> hardship = {String(test.customer.hardship)}; without R0 it would match{' '}
                {testWouldMatch[0]} first ({ACTION_META.bundle.label}; also {testWouldMatch.slice(1).join(', ')}). Result:{' '}
                <strong>{ACTION_META[test.action].label}</strong>.
              </span>
            </p>
          )}
        </Panel>
        <Panel title="The synthetic rows reconcile">
          <ul className="space-y-0.5">
            <li>Rows: {n(recon.rows)} = the Direct deposit leaving count in the Early-Warning table.</li>
            <li>
              No PNC savings: {n(recon.noSavings)} ÷ {n(recon.rows)} = {pct(recon.noSavings / recon.rows)} vs. {n(NO_SAVINGS_BASE.noSavings)} ÷{' '}
              {n(NO_SAVINGS_BASE.allCustomers)} = {pct(NO_SAVINGS_BASE.noSavings / NO_SAVINGS_BASE.allCustomers)} (Cross-Product table).
            </li>
            <li>
              Sends to outside savings (of no-savings rows): {n(recon.outsideSavings)} ÷ {n(recon.noSavings)} = {pct(recon.outsideSavings / recon.noSavings)} ≥{' '}
              {n(NO_SAVINGS_BASE.outsideSavings)} ÷ {n(NO_SAVINGS_BASE.noSavings)} = {pct(NO_SAVINGS_BASE.outsideSavings / NO_SAVINGS_BASE.noSavings)} base rate.
            </li>
            <li>
              Complaints {n(recon.complaint)} ≤ service friction {n(recon.serviceFriction)}; hardship {n(recon.hardship)}; contacted in the last {CONTACT_CAP_DAYS}{' '}
              days {n(recon.contactedRecently)}.
            </li>
          </ul>
          <details className="mt-1">
            <summary className="cursor-pointer text-xs font-medium text-brand-blue">Signal counts vs. the Early-Warning table</summary>
            <ul className="mt-1 text-xs">
              {recon.signalCounts.map((s) => (
                <li key={s.id}>
                  {s.rows <= s.table ? '✓' : '✗'} {s.name}: {n(s.rows)} ≤ {n(s.table)}
                </li>
              ))}
            </ul>
          </details>
          <details className="mt-1">
            <summary className="cursor-pointer text-xs font-medium text-brand-blue">
              Rows = Draft economics: {rollup.groups.filter((g) => g.equal).length} of {rollup.groups.length} groups equal
            </summary>
            {rollup.groups.map((g) => (
              <GroupCheck key={g.action} g={g} />
            ))}
          </details>
        </Panel>
      </div>

      {/* Table */}
      <div className="mt-4 flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col">
          <span className="text-xs text-slate-600">Recommended action</span>
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value as NbaAction | 'all')
              setPage(0)
            }}
            className="rounded border border-slate-300 px-2 py-1"
          >
            <option value="all">All actions</option>
            {ACTION_ORDER.map((a) => (
              <option key={a} value={a}>
                {ACTION_META[a].label} ({n(rollup.counts[a])})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-slate-600">Reason code</span>
          <select
            value={code}
            onChange={(e) => {
              setCode(e.target.value as RuleCode | 'all')
              setPage(0)
            }}
            className="rounded border border-slate-300 px-2 py-1"
          >
            <option value="all">All codes</option>
            {RULE_CODES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-slate-600">{n(filtered.length)} customers</span>
      </div>
      <div className="relative mt-2 max-h-[20rem] overflow-auto rounded border border-slate-200">
        <table className="w-full min-w-[1100px] text-left text-xs whitespace-nowrap">
          <thead className="sticky top-0 z-[1] border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th scope="col" className="py-1.5 pr-2 pl-2 font-medium">Customer</th>
              <th scope="col" className="py-1.5 pr-2 font-medium">Signals</th>
              <th scope="col" className="py-1.5 pr-2 font-medium">Tenure · balance</th>
              <th scope="col" className="py-1.5 pr-2 font-medium">Channel</th>
              <th scope="col" className="py-1.5 pr-2 font-medium">PNC savings</th>
              <th scope="col" className="py-1.5 pr-2 font-medium">Recommended action</th>
              <th scope="col" className="py-1.5 pr-2 font-medium">Reason codes</th>
              <th scope="col" className="py-1.5 pr-2 text-right font-medium">Expected value vs. cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 align-top">
            {visible.map((r) => (
              <Row key={r.customer.id} r={r} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
        <span>
          Page {current + 1} of {pages} · Illustrative · synthetic
        </span>
        <span className="flex gap-1">
          <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} className="inline-flex items-center rounded border border-slate-300 px-2 py-1 disabled:opacity-40" aria-label="Previous page">
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="inline-flex items-center rounded border border-slate-300 px-2 py-1 disabled:opacity-40" aria-label="Next page">
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </span>
      </div>
    </SectionCard>
  )
}

function Row({ r }: { r: NbaRecommendation }) {
  const c = r.customer
  const flags = [c.hardship && 'Hardship', c.complaint && 'Complaint'].filter(Boolean)
  return (
    <tr>
      <th scope="row" className="py-1 pr-2 pl-2 font-mono font-medium text-brand-ink">
        {c.id}
        {r.holdout && <span className="ml-1 font-sans text-[10px] font-normal text-slate-500">holdout</span>}
      </th>
      <td className="py-1 pr-2">
        DD {DD_CHANGE_LABEL[c.ddChange].toLowerCase()}
        {c.coSignals.length > 0 && (
          <span className="text-slate-500">
            {' · '}
            {c.coSignals.map((s) => (s === 'outbound-competitor-transfers' && c.outboundTo ? `Outbound → ${c.outboundTo}` : shortSignal[s] ?? s)).join(' · ')}
          </span>
        )}
        {flags.length > 0 && <span className="font-medium text-red-700"> · {flags.join(' · ')}</span>}
      </td>
      <td className="py-1 pr-2">
        {c.tenure} · {c.balance}
      </td>
      <td className="py-1 pr-2 capitalize">{c.channel === 'sms' ? 'SMS' : c.channel}</td>
      <td className="py-1 pr-2">{c.hasPncSavings ? 'Yes' : c.sendsToOutsideSavings ? 'No · saves elsewhere' : 'No'}</td>
      <td className="py-1 pr-2">
        <span className={`inline-block rounded px-1.5 py-0.5 font-medium ${ACTION_STYLE[r.action]}`}>{ACTION_META[r.action].label}</span>
        {r.nextEligible && <span className="ml-1 text-slate-500">until {r.nextEligible}</span>}
      </td>
      <td className="py-1 pr-2">
        {r.codes.map((code) => (
          <span key={code} className={`mr-1 ${code === r.matched ? 'font-bold text-brand-ink' : 'text-slate-500'}`} title={code === r.matched ? 'Deciding rule' : 'Also applies'}>
            {code}
          </span>
        ))}
      </td>
      <td className="py-1 pr-2 text-right tabular-nums">
        {r.offer ? (
          <>
            {usd2(r.offer.expectedValue)} vs. {usd2(r.offer.expectedCost)}
            {r.action === 'none' && <span className="ml-1 text-slate-500">({ACTION_META[r.offer.action].short})</span>}
          </>
        ) : (
          '—'
        )}
      </td>
    </tr>
  )
}

function GroupCheck({ g }: { g: ActionGroup }) {
  const fmt = (x: number, f: 'count' | 'usd') =>
    f === 'count' ? n(x) : `$${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return (
    <div className="mt-2">
      <p className="text-xs font-semibold">
        {g.equal ? '✓' : '✗'} {ACTION_META[g.action].label}
      </p>
      <table className="w-full text-xs tabular-nums">
        <tbody>
          {g.check.map((l) => (
            <tr key={l.label}>
              <td className="pr-2">{l.label}</td>
              <td className="pr-2 text-right">{fmt(l.rows, l.format)}</td>
              <td className="pr-2">{Math.abs(l.rows - l.draft) < 0.005 ? '=' : '≠'}</td>
              <td className="pr-2 text-right">{fmt(l.draft, l.format)}</td>
              <td className="text-slate-500">{l.basis}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Panel({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-brand-ink">
        {icon}
        {title}
      </h4>
      {children}
    </div>
  )
}

/** Personalised vs. blanket on the same eligible customers, with the match uplift personalisation must prove. */
function Comparison() {
  const [upliftPct, setUpliftPct] = useState(0)
  const c = compareArms(upliftPct / 100)
  const base = compareArms(0)
  const arms = [c.blanket, c.personalised, c.holdout]
  const best = c.personalised.net > c.blanket.net ? 'personalised' : 'blanket'
  const one = (x: number) => x.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 })
  return (
    <div id="nba-comparison" className="rounded-md border border-slate-200 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h4 className="text-sm font-semibold text-brand-ink">
          Personalised vs. blanket · same {n(c.eligible)} eligible customers (after guardrails), same economics
        </h4>
        <label className="flex items-center gap-2 text-sm">
          <span>
            Match uplift <span className="text-xs text-slate-500">(illustrative; to be measured)</span>
          </span>
          <input
            type="number"
            min={0}
            max={200}
            step={5}
            value={upliftPct}
            onChange={(e) => setUpliftPct(Math.max(0, Math.min(200, Number(e.target.value) || 0)))}
            aria-label="Match uplift, percent"
            className="w-20 rounded border border-slate-300 px-2 py-1 text-right tabular-nums"
          />
          %
        </label>
      </div>
      <div className="relative mt-2 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm tabular-nums">
          <thead className="border-b border-slate-200 text-xs text-slate-500">
            <tr>
              <th scope="col" className="py-1.5 pr-3 font-medium">Arm</th>
              <th scope="col" className="py-1.5 pr-3 text-right font-medium">Contacts</th>
              <th scope="col" className="py-1.5 pr-3 text-right font-medium">Saves (closure prevention)</th>
              <th scope="col" className="py-1.5 pr-3 text-right font-medium">Savings accounts (cross-sell)</th>
              <th scope="col" className="py-1.5 pr-3 text-right font-medium">Total cost</th>
              <th scope="col" className="py-1.5 pr-3 text-right font-medium">Annual value</th>
              <th scope="col" className="py-1.5 text-right font-medium">Net value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {arms.map((a, i) => (
              <tr key={a.label} className={(i === 0 && best === 'blanket') || (i === 1 && best === 'personalised') ? 'font-semibold' : ''}>
                <th scope="row" className="py-1.5 pr-3 font-medium text-brand-ink">
                  ({'abc'[i]}) {a.label}
                  {i === 1 && upliftPct > 0 && <span className="ml-1 text-xs font-normal text-slate-500">at +{upliftPct}% match uplift</span>}
                </th>
                <td className="py-1.5 pr-3 text-right">{n(a.contacts)}</td>
                <td className="py-1.5 pr-3 text-right">{i === 2 ? 'baseline' : one(a.saves)}</td>
                <td className="py-1.5 pr-3 text-right">{i === 2 ? 'baseline' : one(a.savingsAccounts)}</td>
                <td className="py-1.5 pr-3 text-right">{formatUsd(a.cost)}</td>
                <td className="py-1.5 pr-3 text-right">{formatUsd(a.value)}</td>
                <td className="py-1.5 text-right">{formatUsd(a.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-sm text-slate-800">
        <strong>
          Personalisation beats the blanket offer only if matched offers convert at least {Number.isFinite(base.breakEven) ? `${Math.ceil(base.breakEven * 100)}%` : 'n/a'}{' '}
          better.
        </strong>{' '}
        That's what the test must prove. Today every arm uses the same flat save rates, so matching has no modelled benefit yet.
      </p>
      <p className="mt-1 text-xs text-slate-600">
        Break-even = (net(a) + fixed contact costs of (b)) ÷ rate-driven margin of (b) − 1 = ({formatUsd(base.blanket.net)} + {formatUsd(base.fixed)}) ÷{' '}
        {formatUsd(base.margin)} − 1 = {Number.isFinite(base.breakEven) ? pct(base.breakEven) : 'n/a'}. Arms use each customer's preferred channel; (b) skips the{' '}
        {n(base.blanket.contacts - base.personalised.contacts)} R5 customers. Saves and savings accounts are expected values and aren't added together.
      </p>
      <p className="mt-2 text-xs text-slate-700">
        <strong>Test plan:</strong> NBA / Blanket / Holdout at 45% / 45% / 10% of {n(c.plan.eligible)} eligible = {n(c.plan.nba)} / {n(c.plan.blanket)} /{' '}
        {n(c.plan.holdout)}. Primary KPI: 90-day closures avoided. Guardrail KPIs: complaints and opt-outs. Decision rule: roll out NBA if its net
        value per customer beats Blanket's and the interval excludes 0.
      </p>
    </div>
  )
}
