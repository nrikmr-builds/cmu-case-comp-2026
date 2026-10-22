// Derived checking activation, health, and drop-off figures. Pages read these instead of doing math inline.
import type { ActivationFunnel, DropOffSignal, FeeCohort, HealthMix, SavingsLinkGroup } from '../data/checkingHealth'

export const FUNNEL_STAGES = [
  { key: 'opened', label: 'Opened' },
  { key: 'funded', label: 'Funded' },
  { key: 'activated', label: 'Activated' },
  { key: 'primary', label: 'Primary' },
] as const

export type FunnelStage = (typeof FUNNEL_STAGES)[number]['key']

/** Adds every channel together into one funnel. */
export function getTotalFunnel(channels: ActivationFunnel[]): Record<FunnelStage, number> {
  const sum = (stage: FunnelStage) => channels.reduce((total, c) => total + c[stage], 0)
  return { opened: sum('opened'), funded: sum('funded'), activated: sum('activated'), primary: sum('primary') }
}

/** Share of the previous stage that made it to this one (1 for the first stage). */
export function getStageConversion(funnel: Record<FunnelStage, number>, index: number): number {
  if (index === 0) return 1
  return funnel[FUNNEL_STAGES[index].key] / funnel[FUNNEL_STAGES[index - 1].key]
}

/** Opened but never made a debit card transaction: the "open and drop off" problem. */
export function getNeverActivated(funnel: Pick<ActivationFunnel, 'opened' | 'activated'>) {
  const accounts = funnel.opened - funnel.activated
  return { accounts, share: accounts / funnel.opened }
}

export function getHealthTotal(mix: HealthMix): number {
  return mix.primary + mix.active + mix.slipping + mix.dormant
}

export function getDormancyRate(mix: HealthMix): number {
  return mix.dormant / getHealthTotal(mix)
}

export function getPrimacyRate(accountsWithDirectDeposit: number, mix: HealthMix): number {
  return accountsWithDirectDeposit / getHealthTotal(mix)
}

/** Closed plus newly dormant accounts, as a share of the accounts open at the start of the quarter. */
export function getAttritionRate(closed: number, newlyDormant: number, startOfQuarter: HealthMix): number {
  return (closed + newlyDormant) / getHealthTotal(startOfQuarter)
}

/** The signal that best separates churned from retained accounts. */
export function getStrongestSignal(signals: DropOffSignal[]): DropOffSignal {
  return signals.reduce((best, s) => (s.lift > best.lift ? s : best))
}

export function getClosureRate(cohort: FeeCohort): number {
  return cohort.closedWithin60Days / cohort.accounts
}

/** Closures above what the no-fee group's rate would predict for the fee group. */
export function getExcessFeeClosures(feeGroup: FeeCohort, baseline: FeeCohort): number {
  return Math.round((getClosureRate(feeGroup) - getClosureRate(baseline)) * feeGroup.accounts)
}

export function getSavingsToCheckingRatio(group: SavingsLinkGroup): number {
  return group.avgPncSavingsBalance / group.avgCheckingBalance
}

export function getExternalSavingsShare(group: SavingsLinkGroup): number {
  return group.recurringExternalSavingsTransfers / group.customers
}

export function formatUsd(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`
}

export function formatMultiple(value: number): string {
  return `${value.toFixed(1)}×`
}

/** "2026-10-22" → "Oct 22, 2026". */
export function formatRetrieved(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Offer expiry: ISO dates are formatted, free text (e.g. "Ongoing") is shown as-is. */
export function formatExpiry(expires: string | undefined): string {
  if (!expires) return 'Not listed'
  return /^\d{4}-\d{2}-\d{2}$/.test(expires) ? formatRetrieved(expires) : expires
}
