import { AlertTriangle, ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { pncComparisonRow } from '../data/checkingHealth'
import { campaignPresets, OUTREACH_CHANNELS, type OpeningChannel } from '../data/campaignPresets'
import { marketSignals } from '../data/marketSignals'
import {
  computeEconomics,
  defaultRate,
  feeForgivenessMaxima,
  getAudienceSource,
  inputsFromPreset,
  primacyRateFor,
  type CampaignInputs,
} from '../lib/campaignEconomics'
import { formatSignedCount, formatUsd } from '../lib/checkingHealth'
import { CAMPAIGN_STATUSES, useCampaigns, type CampaignStatus, type SavedCampaign } from '../lib/campaignStore'
import { formatValue } from '../lib/metrics'
import SourceBadge from './SourceBadge'

const STEPS = ['Audience', 'Offer', 'Economics', 'Review & save'] as const

const accounts = (n: number) => formatValue(n, 'accounts')
const pct = (x: number) => `${(x * 100).toFixed(1)}%`
const money = (n: number) => (Math.abs(n) < 100 ? `$${n.toFixed(2)}` : formatUsd(n))
const input =
  'rounded border border-slate-300 px-2 py-1 text-sm tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-blue'

interface Props {
  /** Start a new campaign from this preset… */
  presetId?: string
  /** …or edit a saved one. */
  campaign?: SavedCampaign
  onClose: () => void
}

/** Full-screen, 4-step campaign builder. Every number is computed by lib/campaignEconomics.ts. */
export default function PromotionBuilder({ presetId, campaign, onClose }: Props) {
  const [inputs, setInputs] = useState<CampaignInputs>(() => campaign?.inputs ?? inputsFromPreset(presetId ?? campaignPresets[0].id))
  const [status, setStatus] = useState<CampaignStatus>(campaign?.status ?? 'draft')
  const [step, setStep] = useState(0)
  const [saved, setSaved] = useState<SavedCampaign | null>(null)
  const { saveCampaign } = useCampaigns()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const preset = campaignPresets.find((p) => p.id === inputs.presetId) ?? campaignPresets[0]
  const source = getAudienceSource(preset)
  const e = computeEconomics(inputs)
  const isAcq = inputs.kind === 'acquisition'
  const outcomeNoun = isAcq ? 'new openings' : 'accounts saved'

  useEffect(() => {
    headingRef.current?.focus()
    const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const set = (patch: Partial<CampaignInputs>) => setInputs((prev) => ({ ...prev, ...patch }))
  const setOffer = (patch: Partial<CampaignInputs['offer']>) => setInputs((prev) => ({ ...prev, offer: { ...prev.offer, ...patch } }))
  const num = (v: string, min = 0) => Math.max(min, Number(v) || 0)

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="builder-heading" className="fixed inset-0 z-50 overflow-y-auto bg-surface">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Promotion Builder</p>
            <h2 id="builder-heading" ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-brand-ink outline-none">
              {inputs.name}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <KindBadge kind={inputs.kind} />
            <SourceBadge kind="internal" />
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
            >
              <X className="h-4 w-4" aria-hidden />
              Close
            </button>
          </div>
        </div>
        <ol className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
          {STEPS.map((label, i) => (
            <li key={label} className="shrink-0">
              <button
                type="button"
                onClick={() => setStep(i)}
                aria-current={i === step ? 'step' : undefined}
                className={`rounded-full px-3 py-1 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-blue ${
                  i === step ? 'bg-brand-ink text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {i + 1}. {label}
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          {step === 0 && (
            <Panel title="1. Audience">
              <p className="text-sm text-slate-700">
                Pre-filled from <strong>{source.label}</strong> ({accounts(source.size)} {isAcq ? 'eligible customers' : 'customers'}).
              </p>
              <KindExplainer kind={inputs.kind} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Audience size" note={`Default ${accounts(source.size)} from the segment`}>
                  <input type="number" min={0} value={inputs.audience} onChange={(ev) => set({ audience: num(ev.target.value) })} className={`${input} w-32`} />
                </Field>
                <Field label="Holdout (control group)" note="Not contacted, so results can be compared against it">
                  <span className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={Math.round(inputs.holdoutShare * 100)}
                      onChange={(ev) => set({ holdoutShare: Math.min(50, num(ev.target.value)) / 100 })}
                      className={`${input} w-20`}
                    />
                    %
                  </span>
                </Field>
              </div>
              <Formula>
                Treated = {accounts(inputs.audience)} × (1 − {pct(inputs.holdoutShare)}) = <strong>{accounts(e.treated)}</strong> · Holdout ={' '}
                {accounts(e.holdout)}. Expected results use the treated group only.
              </Formula>
            </Panel>
          )}

          {step === 1 && (
            <Panel title="2. Offer">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Bonus ($)" note="Paid to each account that meets the requirement">
                  <input type="number" min={0} value={inputs.offer.bonusUsd} onChange={(ev) => setOffer({ bonusUsd: num(ev.target.value) })} className={`${input} w-28`} />
                </Field>
                <Field label="Direct-deposit requirement ($)" note="0 = none">
                  <input type="number" min={0} value={inputs.offer.directDepositUsd} onChange={(ev) => setOffer({ directDepositUsd: num(ev.target.value) })} className={`${input} w-28`} />
                </Field>
                <Field label="Debit purchases required" note="0 = none">
                  <input type="number" min={0} value={inputs.offer.debitPurchases} onChange={(ev) => setOffer({ debitPurchases: num(ev.target.value) })} className={`${input} w-28`} />
                </Field>
                <Field label="Days to meet the requirement">
                  <input type="number" min={1} value={inputs.offer.requirementDays} onChange={(ev) => setOffer({ requirementDays: num(ev.target.value, 1) })} className={`${input} w-28`} />
                </Field>
                {!isAcq && (
                  <Field label="Fee waiver" note="Waive the next $12 monthly fee for everyone treated">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={inputs.offer.waiveFirstFee} onChange={(ev) => setOffer({ waiveFirstFee: ev.target.checked })} className="h-4 w-4 accent-brand-blue" />
                      Waive first fee
                    </label>
                  </Field>
                )}
                <Field label={`Other cost per ${isAcq ? 'opened' : 'saved'} account ($/yr)`} note="e.g. a savings rate boost">
                  <input type="number" min={0} value={inputs.offer.perAccountCostUsd} onChange={(ev) => setOffer({ perAccountCostUsd: num(ev.target.value) })} className={`${input} w-28`} />
                </Field>
                <Field label="Campaign length (days)" note="Starts the day after the internal as-of date (Sep 13)">
                  <input type="number" min={1} value={inputs.offer.durationDays} onChange={(ev) => setOffer({ durationDays: num(ev.target.value, 1) })} className={`${input} w-28`} />
                </Field>
                {isAcq && (
                  <Field label="Where accounts get opened" note="Sets the funnel primacy rate">
                    <select value={inputs.offer.openingChannel} onChange={(ev) => setOffer({ openingChannel: ev.target.value as OpeningChannel })} className={input}>
                      {(['digital', 'branch', 'blended'] as const).map((c) => {
                        const r = primacyRateFor(c)
                        return (
                          <option key={c} value={c}>
                            {c[0].toUpperCase() + c.slice(1)} · {pct(r.rate)} reach primary
                          </option>
                        )
                      })}
                    </select>
                  </Field>
                )}
              </div>
              <Field label="Offer details">
                <input type="text" value={inputs.offer.extra} onChange={(ev) => setOffer({ extra: ev.target.value })} className={`${input} w-full`} />
              </Field>
              <fieldset>
                <legend className="text-sm font-medium text-slate-700">Outreach channels</legend>
                <div className="mt-1 flex flex-wrap gap-3">
                  {OUTREACH_CHANNELS.map((c) => (
                    <label key={c.id} className="inline-flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={inputs.offer.channels.includes(c.id)}
                        onChange={(ev) =>
                          setOffer({
                            channels: ev.target.checked ? [...inputs.offer.channels, c.id] : inputs.offer.channels.filter((x) => x !== c.id),
                          })
                        }
                        className="h-4 w-4 accent-brand-blue"
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <OfferComparison bonus={inputs.offer.bonusUsd} directDeposit={inputs.offer.directDepositUsd} days={inputs.offer.requirementDays} />
            </Panel>
          )}

          {step === 2 && (
            <Panel title="3. Economics">
              <KindExplainer kind={inputs.kind} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={isAcq ? 'Conversion rate' : 'Save rate'} note={defaultRate(preset).basis + ` · default ${pct(defaultRate(preset).rate)}`}>
                  <span className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={Number((inputs.rate * 100).toFixed(1))}
                      onChange={(ev) => set({ rate: Math.min(100, num(ev.target.value)) / 100 })}
                      className={`${input} w-24`}
                    />
                    %
                  </span>
                  {source.history && isAcq && (
                    <span className="mt-1 block text-xs text-slate-500">
                      History: last qtr {pct(source.history.last.rate)} · range {pct(source.history.min)}–{pct(source.history.max)}
                    </span>
                  )}
                  {e.rateWarning && (
                    <span className="mt-1 flex items-start gap-1 text-xs font-medium text-amber-800">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      {e.rateWarning}
                    </span>
                  )}
                </Field>
                <Field label={`Annual value per ${isAcq ? 'primary' : 'saved'} account ($)`} note="Illustrative assumption">
                  <input type="number" min={0} value={inputs.annualValuePerAccount} onChange={(ev) => set({ annualValuePerAccount: num(ev.target.value) })} className={`${input} w-28`} />
                </Field>
                <Field label="Messages per person">
                  <input type="number" min={0} value={inputs.messagesPerPerson} onChange={(ev) => set({ messagesPerPerson: num(ev.target.value) })} className={`${input} w-20`} />
                </Field>
                <fieldset>
                  <legend className="text-sm font-medium text-slate-700">Cost per message ($)</legend>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {OUTREACH_CHANNELS.filter((c) => inputs.offer.channels.includes(c.id)).map((c) => (
                      <label key={c.id} className="inline-flex items-center gap-1 text-xs">
                        {c.label}
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={inputs.costPerMessage[c.id]}
                          onChange={(ev) => set({ costPerMessage: { ...inputs.costPerMessage, [c.id]: num(ev.target.value) } })}
                          className={`${input} w-20`}
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
              <EconomicsTable inputs={inputs} />
              {preset.id === 'first-fee-forgiveness' && <FeeMaxima audience={inputs.audience} />}
            </Panel>
          )}

          {step === 3 && (
            <Panel title="4. Review & save">
              <Field label="Campaign name">
                <input type="text" value={inputs.name} onChange={(ev) => set({ name: ev.target.value })} className={`${input} w-full max-w-md`} />
              </Field>
              <Field label="Status">
                <select value={status} onChange={(ev) => setStatus(ev.target.value as CampaignStatus)} className={input}>
                  {CAMPAIGN_STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <ul className="space-y-1 text-sm text-slate-700">
                <li>
                  <strong>{inputs.kind === 'acquisition' ? 'Acquisition' : 'Retention'}</strong> · {inputs.sourceLabel} · {accounts(e.treated)} treated +{' '}
                  {accounts(e.holdout)} holdout
                </li>
                <li>Offer: {inputs.offer.extra || '—'}</li>
                <li>
                  Expected: <strong>{accounts(e.outcomes)}</strong> {outcomeNoun} ({accounts(e.timing.q3)} in Q3 · {accounts(e.timing.q4)} in Q4)
                  {e.primary !== undefined && <> · {accounts(e.primary)} primary</>}
                </li>
                <li>
                  Cost {formatUsd(e.costs.total)} · {money(e.costPerOutcome)} per {isAcq ? 'account' : 'saved account'}
                  {e.costPerPrimary !== undefined && <> · {money(e.costPerPrimary)} per primary account</>} · payback{' '}
                  {Number.isFinite(e.paybackMonths) ? `${e.paybackMonths.toFixed(1)} months` : 'never'}
                </li>
              </ul>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSaved(saveCampaign(inputs, status, saved?.id ?? campaign?.id))}
                  className="inline-flex items-center gap-1.5 rounded bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
                >
                  <Check className="h-4 w-4" aria-hidden />
                  {saved || campaign ? 'Save changes' : 'Save campaign'}
                </button>
                {saved && (
                  <span role="status" className="text-sm font-medium text-green-700">
                    Saved as {CAMPAIGN_STATUSES.find((s) => s.id === saved.status)?.label}. It appears under Saved campaigns.
                  </span>
                )}
              </div>
            </Panel>
          )}

          <div className="flex justify-between">
            <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-40">
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back
            </button>
            {step < STEPS.length - 1 && (
              <button type="button" onClick={() => setStep((s) => s + 1)} className="inline-flex items-center gap-1 rounded bg-brand-ink px-3 py-1.5 text-sm font-medium text-white">
                Next: {STEPS[step + 1]} <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>

        <aside aria-label="Live summary" className="h-fit space-y-2 rounded-md border border-slate-200 bg-white p-4 text-sm shadow-sm lg:sticky lg:top-32">
          <h3 className="font-semibold text-brand-ink">Live summary</h3>
          <KindBadge kind={inputs.kind} />
          <Summary label={isAcq ? 'New openings' : 'Accounts saved'} value={accounts(e.outcomes)} />
          {e.primary !== undefined && <Summary label="Primary accounts" value={accounts(e.primary)} />}
          <Summary label="Total cost" value={formatUsd(e.costs.total)} />
          {e.costPerPrimary !== undefined ? (
            <Summary label="Cost per primary account" value={money(e.costPerPrimary)} />
          ) : (
            <Summary label="Cost per saved account" value={money(e.costPerOutcome)} />
          )}
          <Summary label="Lands in Q3 / Q4" value={`${accounts(e.timing.q3)} / ${accounts(e.timing.q4)}`} />
          {e.impact.kind === 'acquisition' ? (
            <Summary label={`Of the ${accounts(e.impact.incrementalGap)} openings gap`} value={pct(e.impact.closesShare)} />
          ) : (
            <Summary label="Net account change" value={`${formatSignedCount(e.impact.netChangeNow)} → ${formatSignedCount(Math.round(e.impact.netChangeAfter))}`} />
          )}
          {e.rateWarning && <p className="text-xs font-medium text-amber-800">{e.rateWarning}</p>}
        </aside>
      </div>
    </div>
  )
}

function EconomicsTable({ inputs }: { inputs: CampaignInputs }) {
  const e = computeEconomics(inputs)
  const isAcq = inputs.kind === 'acquisition'
  const perPerson = inputs.offer.channels.reduce((s, c) => s + inputs.costPerMessage[c], 0) * inputs.messagesPerPerson
  const rows: [string, string, ReactNode][] = [
    [isAcq ? 'Expected new openings' : 'Expected accounts saved', accounts(e.outcomes), `${accounts(e.treated)} treated × ${pct(inputs.rate)}`],
  ]
  if (isAcq && e.primary !== undefined && e.primacyRate !== undefined) {
    rows.push(['Expected primary accounts', accounts(e.primary), `${accounts(e.outcomes)} × ${pct(e.primacyRate)} funnel primacy (${inputs.offer.openingChannel})`])
  }
  rows.push(
    ['Accounts earning the bonus', accounts(e.qualifying), e.qualifyingBasis],
    ['Bonus cost', formatUsd(e.costs.bonus), `$${inputs.offer.bonusUsd} × ${accounts(e.qualifying)}`],
    ['Channel cost', formatUsd(e.costs.channel), `${accounts(e.treated)} treated × $${perPerson.toFixed(2)} per person (${inputs.offer.channels.join(' + ') || 'none'} × ${inputs.messagesPerPerson})`],
  )
  if (e.costs.feeWaiver > 0) rows.push(['Fees waived (revenue given up)', formatUsd(e.costs.feeWaiver), `${accounts(e.treated)} treated × $12`])
  if (e.costs.perAccount > 0)
    rows.push(['Other per-account cost', formatUsd(e.costs.perAccount), `${accounts(e.outcomes)} × $${inputs.offer.perAccountCostUsd}`])
  rows.push(
    ['Total cost', formatUsd(e.costs.total), 'Sum of the costs above'],
    [isAcq ? 'Cost per new account' : 'Cost per saved account', money(e.costPerOutcome), `${formatUsd(e.costs.total)} ÷ ${accounts(e.outcomes)}`],
  )
  if (e.costPerPrimary !== undefined && e.primary !== undefined)
    rows.push(['Cost per primary account', money(e.costPerPrimary), `${formatUsd(e.costs.total)} ÷ ${accounts(e.primary)}`])
  rows.push(
    ['Annual value', formatUsd(e.annualValue), `${accounts(e.valueAccounts)} ${isAcq ? 'primary' : 'saved'} × $${inputs.annualValuePerAccount} (illustrative)`],
    ['Payback', Number.isFinite(e.paybackMonths) ? `${e.paybackMonths.toFixed(1)} months` : 'Never', `${formatUsd(e.costs.total)} ÷ (${formatUsd(e.annualValue)} ÷ 12)`],
    ['Break-even value per account', money(e.breakEvenValuePerAccount), `Annual value each ${isAcq ? 'primary' : 'saved'} account must reach to repay cost in a year`],
    [
      'Timing',
      `${accounts(e.timing.q3)} Q3 · ${accounts(e.timing.q4)} Q4`,
      `${inputs.offer.durationDays}-day campaign, ${e.timing.q3DaysAvailable.toFixed(1)} days left in Q3 → ${pct(e.timing.q3Share)} lands in Q3`,
    ],
  )
  if (e.impact.kind === 'acquisition') {
    rows.push(['Closes of the incremental openings gap', pct(e.impact.closesShare), `${accounts(e.timing.q3)} Q3 openings ÷ ${accounts(e.impact.incrementalGap)} (Q3 part only)`])
  } else {
    rows.push(
      [
        'Net account change (Q3)',
        `${formatSignedCount(e.impact.netChangeNow)} → ${formatSignedCount(Math.round(e.impact.netChangeAfter))}`,
        `${formatSignedCount(e.impact.netChangeNow)} + ${accounts(e.timing.q3)} saved in Q3. Retention never counts toward the openings gap.`,
      ],
      ['Primacy rate lift (at most)', `+${e.impact.primacyLiftPts.toFixed(2)} pts`, `${accounts(e.timing.q3)} ÷ ${accounts(e.impact.openAccounts)} open accounts, if every saved account stays Primary`],
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <caption className="mb-2 text-left text-xs text-slate-500">Illustrative economics. Formula shown for every line.</caption>
        <tbody className="divide-y divide-slate-100">
          {rows.map(([label, value, formula]) => (
            <tr key={label} className="align-top">
              <th scope="row" className="py-2 pr-4 font-medium text-brand-ink">{label}</th>
              <td className="py-2 pr-4 text-right font-semibold whitespace-nowrap tabular-nums">{value}</td>
              <td className="py-2 text-xs text-slate-500">{formula}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FeeMaxima({ audience }: { audience: number }) {
  const m = feeForgivenessMaxima(audience)
  return (
    <p className="rounded-md bg-slate-50 p-3 text-xs text-slate-600">
      <span className="font-semibold text-slate-700">Full-audience reference (before holdout):</span> max waived revenue ={' '}
      {accounts(audience)} × $12 = <strong>{formatUsd(m.maxWaivedRevenue)}</strong>; closures avoided if the waiver removed the whole
      fee effect = {accounts(audience)} × ({pct(m.feeRate)} − {pct(m.noFeeRate)}) ≈ <strong>{accounts(Math.round(m.closuresAvoidedMax))}</strong>.
    </p>
  )
}

/** Your offer next to sourced competitor offers and PNC's current (illustrative) offer. */
function OfferComparison({ bonus, directDeposit, days }: { bonus: number; directDeposit: number; days: number }) {
  const rows = [
    { name: 'Your offer', bonus, requirement: `${directDeposit ? `$${directDeposit.toLocaleString('en-US')} direct deposit` : 'No direct deposit'} · ${days} days`, kind: 'yours' as const },
    { name: pncComparisonRow.name, bonus: pncComparisonRow.bonusUsd ?? 0, requirement: pncComparisonRow.requirement, kind: 'pnc' as const },
    ...marketSignals
      .filter((s) => s.category === 'competitor-promo' && s.offer?.bonusUsd)
      .map((s) => ({ name: s.competitor ?? s.source, bonus: s.offer?.bonusUsd ?? 0, requirement: s.offer?.requirement ?? '', kind: 'external' as const, url: s.sourceUrl })),
  ].sort((a, b) => b.bonus - a.bonus)
  const rank = rows.findIndex((r) => r.kind === 'yours') + 1

  return (
    <div>
      <h4 className="text-sm font-medium text-slate-700">
        Compared with competitor offers: your bonus ranks {rank} of {rows.length}
      </h4>
      <div className="mt-2 max-h-72 overflow-auto rounded border border-slate-200">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="sticky top-0 bg-slate-50 text-slate-500">
            <tr>
              <th scope="col" className="px-2 py-1.5 font-medium">Offer</th>
              <th scope="col" className="px-2 py-1.5 text-right font-medium">Top bonus</th>
              <th scope="col" className="px-2 py-1.5 font-medium">Requirement</th>
              <th scope="col" className="px-2 py-1.5 font-medium">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <tr key={`${r.name}-${i}`} className={r.kind === 'yours' ? 'bg-orange-50 font-semibold' : r.kind === 'pnc' ? 'bg-slate-50' : ''}>
                <th scope="row" className="px-2 py-1.5 font-medium text-brand-ink">{r.name}</th>
                <td className="px-2 py-1.5 text-right tabular-nums">{formatUsd(r.bonus)}</td>
                <td className="px-2 py-1.5 text-slate-600">{r.requirement}</td>
                <td className="px-2 py-1.5">
                  {r.kind === 'external' && 'url' in r ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline">
                      Sourced<span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    <span className="text-slate-500">{r.kind === 'pnc' ? 'Internal · Illustrative' : 'Draft'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KindBadge({ kind }: { kind: CampaignInputs['kind'] }) {
  return kind === 'acquisition' ? (
    <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-brand-blue ring-1 ring-brand-blue/30 ring-inset">
      Acquisition · new openings
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-800 ring-1 ring-green-300 ring-inset">
      Retention · accounts saved
    </span>
  )
}

function KindExplainer({ kind }: { kind: CampaignInputs['kind'] }) {
  return (
    <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
      {kind === 'acquisition'
        ? 'Acquisition campaign: results are NEW openings and count toward the incremental openings gap (beyond current pace).'
        : 'Retention campaign: results are accounts SAVED. They improve net account change and primacy, and never count toward the openings gap.'}
    </p>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-brand-ink">{title}</h3>
      {children}
    </section>
  )
}

function Field({ label, note, children }: { label: string; note?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <span className="mt-1 block">{children}</span>
      {note && <span className="mt-1 block text-xs text-slate-500">{note}</span>}
    </label>
  )
}

function Formula({ children }: { children: ReactNode }) {
  return <p className="rounded-md bg-slate-50 p-3 text-xs text-slate-600">{children}</p>
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between gap-3">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold tabular-nums text-brand-ink">{value}</span>
    </p>
  )
}
