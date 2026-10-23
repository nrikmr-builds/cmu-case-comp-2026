import { AlertTriangle, ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { pncComparisonRow } from '../data/checkingHealth'
import { campaignPresets, OUTREACH_CHANNELS, type CampaignKind, type CampaignOutcome, type OpeningChannel } from '../data/campaignPresets'
import { marketSignals } from '../data/marketSignals'
import {
  computeEconomics,
  feeForgivenessMaxima,
  getAudienceSource,
  inputsFromPreset,
  OUTCOME_LABELS,
  primacyRateFor,
  rateBasis,
  type CampaignInputs,
  channelCost,
} from '../lib/campaignEconomics'
import { formatSignedCount, formatUsd } from '../lib/checkingHealth'
import { CONTACT_CAP_DAYS } from '../lib/guardrails'
import { CAMPAIGN_STATUSES, useCampaigns, type CampaignStatus, type SavedCampaign } from '../lib/campaignStore'
import { formatValue } from '../lib/metrics'
import SourceBadge from './SourceBadge'

const STEPS = ['Audience', 'Offer', 'Economics', 'Review & save'] as const

const accounts = (n: number) => formatValue(n, 'accounts')
const pct = (x: number) => `${(x * 100).toFixed(1)}%`
const money = (n: number) => (!Number.isFinite(n) ? 'n/a (no incremental)' : Math.abs(n) < 100 ? `$${n.toFixed(2)}` : formatUsd(n))
const months = (n: number) => (Number.isFinite(n) ? `${n.toFixed(1)} months` : 'Never')
const input = 'field'
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

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
  const dialogRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const preset = campaignPresets.find((p) => p.id === inputs.presetId) ?? campaignPresets[0]
  const source = getAudienceSource(preset)
  const basis = rateBasis(preset)
  const e = computeEconomics(inputs)
  const isAcq = inputs.outcome === 'openings'
  const outcome = OUTCOME_LABELS[inputs.outcome]

  useEffect(() => {
    headingRef.current?.focus()
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose()
      // Keep Tab inside the dialog.
      if (ev.key !== 'Tab' || !dialogRef.current) return
      const items = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (ev.shiftKey && (active === first || active === headingRef.current || !dialogRef.current.contains(active))) {
        ev.preventDefault()
        last.focus()
      } else if (!ev.shiftKey && (active === last || !dialogRef.current.contains(active))) {
        ev.preventDefault()
        first.focus()
      }
    }
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
  const rateInput = (value: number, onChange: (rate: number) => void) => (
    <span className="flex items-center gap-1">
      <input
        type="number"
        min={0}
        max={100}
        step={0.1}
        value={Number((value * 100).toFixed(1))}
        onChange={(ev) => onChange(Math.min(100, num(ev.target.value)) / 100)}
        className={`${input} w-24`}
      />
      %
    </span>
  )

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="builder-heading" className="fixed inset-0 z-50 animate-sheet overflow-y-auto bg-surface">
      <div className="sticky top-0 z-10 border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-semibold text-muted">Promotion Builder</p>
            <h2 id="builder-heading" ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-brand-ink outline-none">
              {inputs.name}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <KindBadge kind={inputs.kind} outcome={inputs.outcome} />
            <SourceBadge kind="internal" />
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              <X className="h-4 w-4" aria-hidden />
              Close
            </button>
          </div>
        </div>
        <ol className="relative mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
          {STEPS.map((label, i) => (
            <li key={label} className="shrink-0">
              <button
                type="button"
                onClick={() => setStep(i)}
                aria-current={i === step ? 'step' : undefined}
                data-ui="tab"
                className="tab py-2 text-ink"
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
              <p className="text-sm text-body">
                Pre-filled from <strong>{source.label}</strong> ({accounts(source.size)} {isAcq ? 'eligible customers' : 'customers'}).
              </p>
              {source.guardrails ? (
                <p className="text-xs text-muted">
                  After guardrails: {accounts(source.guardrails.total)} in the segment − {accounts(source.guardrails.suppressed)} hardship or open
                  complaint (R0) − {accounts(source.guardrails.recentlyContacted)} contacted in the last {CONTACT_CAP_DAYS} days (R1) ={' '}
                  <strong>{accounts(source.guardrails.eligible)}</strong> eligible. The same rules as next best action.
                </p>
              ) : (
                <p className="text-xs text-muted">
                  Guardrails apply at send time: no offers to customers in hardship or with an open complaint, and at most 1 offer per{' '}
                  {CONTACT_CAP_DAYS} days.
                </p>
              )}
              <KindExplainer outcome={inputs.outcome} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Audience size" note={`Default ${accounts(source.size)} from the segment`}>
                  <input type="number" min={0} value={inputs.audience} onChange={(ev) => set({ audience: num(ev.target.value) })} className={`${input} w-32`} />
                </Field>
                <Field label="Holdout (control group)" note="Not contacted; the campaign's effect is measured against it">
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
                {inputs.kind === 'retention' && (
                  <Field label="Fee waiver" note="Waive the next $12 monthly fee for everyone treated">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={inputs.offer.waiveFirstFee} onChange={(ev) => setOffer({ waiveFirstFee: ev.target.checked })} className="h-4 w-4 accent-brand-blue" />
                      Waive first fee
                    </label>
                  </Field>
                )}
                <Field label="Other cost per resulting account ($/yr)" note="e.g. a savings rate boost or staff time">
                  <input type="number" min={0} value={inputs.offer.perAccountCostUsd} onChange={(ev) => setOffer({ perAccountCostUsd: num(ev.target.value) })} className={`${input} w-28`} />
                </Field>
                <Field label="Campaign length (days)" note="Starts the day after the internal as-of date (Sep 13)">
                  <input type="number" min={1} value={inputs.offer.durationDays} onChange={(ev) => setOffer({ durationDays: num(ev.target.value, 1) })} className={`${input} w-28`} />
                </Field>
                {isAcq && (
                  <Field label="Where accounts get opened" note="Sets the funnel primacy rate">
                    <select value={inputs.offer.openingChannel} onChange={(ev) => setOffer({ openingChannel: ev.target.value as OpeningChannel })} className={input}>
                      {(['digital', 'branch', 'blended'] as const).map((c) => (
                        <option key={c} value={c}>
                          {c[0].toUpperCase() + c.slice(1)} · {pct(primacyRateFor(c).rate)} reach primary
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>
              <Field label="Offer details">
                <input type="text" value={inputs.offer.extra} onChange={(ev) => setOffer({ extra: ev.target.value })} className={`${input} w-full`} />
              </Field>
              <fieldset>
                <legend className="text-sm font-medium text-body">Outreach channels</legend>
                <div className="mt-1 flex flex-wrap gap-3">
                  {OUTREACH_CHANNELS.map((c) => (
                    <label key={c.id} className="inline-flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={inputs.offer.channels.includes(c.id)}
                        onChange={(ev) =>
                          setOffer({ channels: ev.target.checked ? [...inputs.offer.channels, c.id] : inputs.offer.channels.filter((x) => x !== c.id) })
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
              <KindExplainer outcome={inputs.outcome} />
              <div className="grid gap-4 sm:grid-cols-2">
                {isAcq && (
                  <Field label="Baseline rate (no campaign)" note={`What the holdout is expected to do. Default ${pct(basis.baseline?.rate ?? 0)} = ${basis.baseline?.basis ?? ''}`}>
                    {rateInput(inputs.baselineRate, (r) => set({ baselineRate: r }))}
                  </Field>
                )}
                <Field
                  label={isAcq ? 'Campaign rate' : inputs.outcome === 'savings-accounts' ? 'Take-up rate' : inputs.outcome === 'activations' ? 'Activation rate' : 'Save rate'}
                  note={`Default ${pct(basis.rate)}. ${basis.basis}`}
                >
                  {rateInput(inputs.rate, (r) => set({ rate: r }))}
                  {source.history && isAcq && (
                    <span className="mt-1 block text-xs text-muted">
                      History: last qtr {pct(source.history.last.rate)} · range {pct(source.history.min)}–{pct(source.history.max)}
                    </span>
                  )}
                  {e.rateWarning && (
                    <span className="mt-1 flex items-start gap-1 text-xs font-medium text-caution">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      {e.rateWarning}
                    </span>
                  )}
                </Field>
                {inputs.outcome === 'savings-accounts' ? (
                  <>
                    <Field label="Average savings balance ($)" note="Illustrative; default = existing Avg. PNC savings for customers who have it">
                      <input type="number" min={0} value={inputs.avgBalanceUsd} onChange={(ev) => set({ avgBalanceUsd: num(ev.target.value) })} className={`${input} w-28`} />
                    </Field>
                    <Field label="Annual value per $1 of deposits" note="Illustrative deposit spread">
                      {rateInput(inputs.depositSpread, (r) => set({ depositSpread: r }))}
                    </Field>
                  </>
                ) : (
                  <Field
                    label={`Annual value per ${inputs.outcome === 'closures-avoided' ? 'saved' : 'primary'} account ($)`}
                    note="Illustrative assumption"
                  >
                    <input type="number" min={0} value={inputs.annualValuePerAccount} onChange={(ev) => set({ annualValuePerAccount: num(ev.target.value) })} className={`${input} w-28`} />
                  </Field>
                )}
                <Field label="Messages per person">
                  <input type="number" min={0} value={inputs.messagesPerPerson} onChange={(ev) => set({ messagesPerPerson: num(ev.target.value) })} className={`${input} w-20`} />
                </Field>
                <fieldset>
                  <legend className="text-sm font-medium text-body">Cost per message ($)</legend>
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
              <ul className="space-y-1 text-sm text-body">
                <li>
                  <strong>{KIND_LABEL[inputs.kind]}</strong> · {inputs.sourceLabel} · {accounts(e.treated)} treated + {accounts(e.holdout)} holdout
                </li>
                <li>Offer: {inputs.offer.extra || '—'}</li>
                <li>
                  Expected: <strong>{accounts(e.results.total)}</strong> {outcome.noun}
                  {isAcq && <> (of which <strong>{accounts(e.results.incremental)}</strong> incremental)</>} · {accounts(e.timing.q3)} counted in Q3
                </li>
                <li>
                  Cost {formatUsd(e.costs.total)}
                  {e.costPerIncrementalPrimary !== undefined && isAcq && <> · {money(e.costPerIncrementalPrimary)} per incremental primary account</>}
                  {!isAcq && <> · {money(e.costPerResult)} per {outcome.noun.replace(/s$/, '')}</>} · payback {months(e.paybackMonths)}
                </li>
              </ul>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSaved(saveCampaign(inputs, status, saved?.id ?? campaign?.id))}
                  className="btn btn-primary"
                >
                  <Check className="h-4 w-4" aria-hidden />
                  {saved || campaign ? 'Save changes' : 'Save campaign'}
                </button>
                {saved && (
                  <span role="status" className="text-sm font-medium text-positive">
                    Saved as {CAMPAIGN_STATUSES.find((s) => s.id === saved.status)?.label}. It appears in the Campaign Tracker.
                  </span>
                )}
              </div>
            </Panel>
          )}

          <div className="flex justify-between">
            <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="btn btn-secondary">
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back
            </button>
            {step < STEPS.length - 1 && (
              <button type="button" onClick={() => setStep((s) => s + 1)} className="btn btn-primary">
                Next: {STEPS[step + 1]} <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>

        <aside aria-label="Live summary" className="h-fit space-y-2 card p-4 text-sm lg:sticky lg:top-32">
          <h3 className="font-semibold text-brand-ink">Live summary</h3>
          <KindBadge kind={inputs.kind} outcome={inputs.outcome} />
          <Summary label={outcome.title} value={accounts(e.results.total)} />
          {isAcq && <Summary label="of which incremental" value={accounts(e.results.incremental)} />}
          {e.primary && <Summary label={isAcq ? 'Incremental primary' : 'Expected primary'} value={accounts(e.primary.incremental)} />}
          <Summary label="Total cost" value={formatUsd(e.costs.total)} />
          {isAcq && e.costPerIncrementalPrimary !== undefined ? (
            <Summary label="Cost per incremental primary" value={money(e.costPerIncrementalPrimary)} strong />
          ) : (
            <Summary label={`Cost per ${outcome.noun.replace(/s$/, '')}`} value={money(e.costPerResult)} />
          )}
          <ImpactSummary e={e} />
          {e.rateWarning && <p className="text-xs font-medium text-caution">{e.rateWarning}</p>}
        </aside>
      </div>
    </div>
  )
}

function ImpactSummary({ e }: { e: ReturnType<typeof computeEconomics> }) {
  switch (e.impact.kind) {
    case 'openings':
      return <Summary label={`Of the ${accounts(e.impact.gap)} gap (Q3)`} value={pct(e.impact.closesShare)} />
    case 'net-change':
      return (
        <Summary
          label="Net account change"
          value={`Q3 ${formatSignedCount(e.impact.netNow)} → ${formatSignedCount(e.impact.netQ3After)} · 90 days +${accounts(e.impact.next90)}`}
        />
      )
    case 'activation':
      return <Summary label="Primacy lift (Q3)" value={`+${e.impact.primacyLiftPts.toFixed(2)} pts`} />
    case 'cross-sell':
      return <Summary label="Savings deposits captured" value={formatUsd(e.impact.deposits)} />
  }
}

export function EconomicsTable({ inputs }: { inputs: CampaignInputs }) {
  const e = computeEconomics(inputs)
  const isAcq = inputs.outcome === 'openings'
  const outcome = OUTCOME_LABELS[inputs.outcome]
  const rows: [string, string, ReactNode, boolean?][] = []

  if (isAcq) {
    rows.push(
      ['Total openings (treated)', accounts(e.results.total), `${accounts(e.treated)} treated × ${pct(inputs.rate)} campaign rate`],
      ['  of which would open anyway', accounts(e.results.baseline), `${accounts(e.treated)} × ${pct(inputs.baselineRate)} baseline (business as usual, already in the pace)`],
      ['  of which incremental', accounts(e.results.incremental), `${accounts(e.results.total)} − ${accounts(e.results.baseline)}. Only these count toward the gap`, true],
    )
    if (e.primary)
      rows.push(
        ['Primary accounts (all openings)', accounts(e.primary.total), `${accounts(e.results.total)} × ${pct(e.primary.rate)} ${e.primary.basis}`],
        ['Incremental primary accounts', accounts(e.primary.incremental), `${accounts(e.results.incremental)} × ${pct(e.primary.rate)}`, true],
      )
  } else {
    rows.push([outcome.title, accounts(e.results.total), `${accounts(e.treated)} treated × ${pct(inputs.rate)} (measured against the holdout, so all of it is incremental)`, true])
    if (e.primary)
      rows.push(['Expected to become primary', accounts(e.primary.total), `${accounts(e.results.total)} × ${pct(e.primary.rate)} ${e.primary.basis}`])
  }

  rows.push(
    ['Accounts earning the bonus', accounts(e.qualifying), e.qualifyingBasis],
    ['Bonus cost', formatUsd(e.costs.bonus), `$${inputs.offer.bonusUsd} × ${accounts(e.qualifying)}${isAcq ? ' (paid even on accounts that would have opened anyway)' : ''}`],
    ['Channel cost', formatUsd(e.costs.channel), channelCost(inputs, e.treated).basis],
  )
  if (e.costs.feeWaiver > 0) rows.push(['Fees waived (revenue given up)', formatUsd(e.costs.feeWaiver), `${accounts(e.treated)} treated × $12`])
  if (e.costs.perAccount > 0)
    rows.push(['Other per-account cost', formatUsd(e.costs.perAccount), `${accounts(e.results.total)} × $${inputs.offer.perAccountCostUsd}`])
  rows.push(['Total cost', formatUsd(e.costs.total), 'Sum of the costs above'])

  if (isAcq) {
    rows.push(
      ['Cost per opening (all)', money(e.costPerResult), `${formatUsd(e.costs.total)} ÷ ${accounts(e.results.total)}`],
      ['Cost per incremental opening', money(e.costPerIncremental), `${formatUsd(e.costs.total)} ÷ ${accounts(e.results.incremental)}`],
    )
    if (e.costPerPrimary !== undefined && e.primary)
      rows.push(['Cost per primary account (all)', money(e.costPerPrimary), `${formatUsd(e.costs.total)} ÷ ${accounts(e.primary.total)}`])
    if (e.costPerIncrementalPrimary !== undefined && e.primary)
      rows.push([
        'Cost per INCREMENTAL primary account',
        money(e.costPerIncrementalPrimary),
        `${formatUsd(e.costs.total)} ÷ ${accounts(e.primary.incremental)}: the true price of the campaign's effect`,
        true,
      ])
  } else {
    rows.push([`Cost per ${outcome.noun.replace(/s$/, '')}`, money(e.costPerResult), `${formatUsd(e.costs.total)} ÷ ${accounts(e.results.total)}`])
  }

  rows.push(
    ['Annual value', formatUsd(e.annualValue), `${e.valueBasis} (illustrative)`],
    ['Payback', months(e.paybackMonths), `${formatUsd(e.costs.total)} ÷ (${formatUsd(e.annualValue)} ÷ 12)`],
    [
      'Timing',
      `${accounts(e.timing.q3)} Q3 · ${accounts(e.timing.later)} later`,
      `${e.timing.basis}${isAcq ? ' (incremental openings only)' : ''}`,
    ],
  )
  switch (e.impact.kind) {
    case 'openings':
      rows.push([
        'Closes of the openings gap (Q3)',
        pct(e.impact.closesShare),
        `${accounts(e.timing.q3)} incremental Q3 openings ÷ ${accounts(e.impact.gap)} needed ${e.impact.gapBasis} (${accounts(e.impact.gapAverage)} at the quarter-average pace)`,
        true,
      ])
      break
    case 'net-change':
      rows.push([
        'Net account change',
        `Q3 ${formatSignedCount(e.impact.netNow)} → ${formatSignedCount(e.impact.netQ3After)} · next 90 days: +${accounts(e.impact.next90)}`,
        `Q3: ${formatSignedCount(e.impact.netNow)} + ${accounts(e.timing.q3)} closures avoided in Q3. Next 90 days: all saves whose closure would fall within 90 days.`,
        true,
      ])
      break
    case 'activation':
      rows.push([
        'Primacy lift (Q3)',
        `+${e.impact.primacyLiftPts.toFixed(2)} pts`,
        `${accounts(e.timing.q3)} activated in Q3 × ${pct(e.primary?.rate ?? 0)} → ${accounts(e.impact.primaryQ3)} primary ÷ ${accounts(e.impact.openAccounts)} open accounts. Doesn't change net account change.`,
        true,
      ])
      break
    case 'cross-sell':
      rows.push([
        'Savings deposits captured',
        formatUsd(e.impact.deposits),
        `${accounts(e.results.total)} accounts × $${inputs.avgBalanceUsd.toLocaleString('en-US')} (${formatUsd(e.impact.depositsQ3)} in Q3). Doesn't touch the openings gap or net account change.`,
        true,
      ])
      break
  }

  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <caption className="mb-2 text-left text-xs text-muted">Illustrative economics. Formula shown for every line.</caption>
        <tbody className="divide-y divide-line">
          {rows.map(([label, value, formula, strong]) => (
            <tr key={label} className={`align-top ${strong ? 'bg-accent-soft/60' : ''}`}>
              <th scope="row" className={`py-2 pr-4 font-medium whitespace-pre-wrap text-brand-ink ${strong ? 'font-semibold' : ''}`}>{label}</th>
              <td className="py-2 pr-4 text-right font-semibold whitespace-nowrap tabular-nums">{value}</td>
              <td className="py-2 text-xs text-muted">{formula}</td>
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
    <p className="rounded-sm bg-surface-subtle p-3 text-xs text-muted">
      <span className="font-semibold text-body">Full-audience reference (before holdout):</span> max waived revenue ={' '}
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
      <h4 className="text-sm font-medium text-body">
        Compared with competitor offers: your bonus ranks {rank} of {rows.length}
      </h4>
      <div className="relative mt-2 max-h-72 overflow-auto rounded-sm border border-line">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="sticky top-0 bg-surface-subtle text-muted">
            <tr>
              <th scope="col" className="px-2 py-1.5 font-medium">Offer</th>
              <th scope="col" className="px-2 py-1.5 text-right font-medium">Top bonus</th>
              <th scope="col" className="px-2 py-1.5 font-medium">Requirement</th>
              <th scope="col" className="px-2 py-1.5 font-medium">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, i) => (
              <tr key={`${r.name}-${i}`} className={r.kind === 'yours' ? 'bg-accent-soft font-semibold' : r.kind === 'pnc' ? 'bg-surface-subtle' : ''}>
                <th scope="row" className="px-2 py-1.5 font-medium text-brand-ink">{r.name}</th>
                <td className="px-2 py-1.5 text-right tabular-nums">{formatUsd(r.bonus)}</td>
                <td className="px-2 py-1.5 text-muted">{r.requirement}</td>
                <td className="px-2 py-1.5">
                  {r.kind === 'external' && 'url' in r ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline">
                      Sourced<span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    <span className="text-muted">{r.kind === 'pnc' ? 'Internal · Illustrative' : 'Draft'}</span>
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

const KIND_LABEL: Record<CampaignKind, string> = { acquisition: 'Acquisition', retention: 'Retention', 'cross-sell': 'Cross-sell · deepening' }

export function KindBadge({ kind, outcome }: { kind: CampaignKind; outcome: CampaignOutcome }) {
  const styles: Record<CampaignKind, string> = {
    acquisition: 'bg-info-soft text-brand-blue ring-brand-blue/30',
    retention: 'bg-positive-soft text-positive ring-positive-line',
    'cross-sell': 'bg-plum-soft text-plum ring-plum-line',
  }
  return (
    <span className={`chip max-w-full ring-1 ring-inset ${styles[kind]}`}>
      {KIND_LABEL[kind]} · {OUTCOME_LABELS[outcome].noun}
    </span>
  )
}

function KindExplainer({ outcome }: { outcome: CampaignOutcome }) {
  const text: Record<CampaignOutcome, string> = {
    openings:
      'Acquisition: the baseline rate is what these customers do anyway (already inside the pace). Only incremental openings above it count toward the openings gap; the bonus is still paid on every qualifying opening.',
    'closures-avoided':
      "Retention · closure prevention: results are closures avoided. They count toward net account change in the quarter the closure would have happened (from the signal's lead time), never toward the openings gap.",
    activations: 'Retention · activation: results are accounts activated. They lift activation and primacy, not net account change (these accounts are not closing).',
    'savings-accounts':
      'Cross-sell · deepening: results are new PNC savings accounts and deposits captured. They touch neither the openings gap nor net account change.',
  }
  return <p className="rounded-sm border border-line bg-surface-subtle p-3 text-xs text-muted">{text[outcome]}</p>
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 card p-6">
      <h3 className="text-lg font-semibold text-brand-ink">{title}</h3>
      {children}
    </section>
  )
}

function Field({ label, note, children }: { label: string; note?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-body">{label}</span>
      <span className="mt-1 block">{children}</span>
      {note && <span className="mt-1 block text-xs text-muted">{note}</span>}
    </label>
  )
}

function Formula({ children }: { children: ReactNode }) {
  return <p className="rounded-sm bg-surface-subtle p-3 text-xs text-muted">{children}</p>
}

function Summary({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <p className={`flex justify-between gap-3 ${strong ? 'rounded-sm bg-accent-soft px-1 py-0.5' : ''}`}>
      <span className="text-muted">{label}</span>
      <span className="text-right font-semibold tabular-nums text-brand-ink">{value}</span>
    </p>
  )
}
