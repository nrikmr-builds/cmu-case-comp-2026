// PLACEHOLDER ASSUMPTIONS: inputs for the Promotion Builder. Audience sizes are NOT stored here; they come
// from the segment they're built on (opportunities.ts / checkingHealth.ts), so they always match the page.

/**
 * Acquisition campaigns bring in NEW openings (they count toward the incremental openings gap).
 * Retention campaigns SAVE existing accounts (they count toward net account change, never toward openings).
 */
export type CampaignKind = 'acquisition' | 'retention'
export type OutreachChannel = 'email' | 'app' | 'sms' | 'branch'
/** Where new accounts would be opened; picks the funnel's primacy rate. */
export type OpeningChannel = 'digital' | 'branch' | 'blended'

export const OUTREACH_CHANNELS: { id: OutreachChannel; label: string }[] = [
  { id: 'email', label: 'Email' },
  { id: 'app', label: 'App' },
  { id: 'sms', label: 'SMS' },
  { id: 'branch', label: 'Branch' },
]

/** Illustrative assumptions; every one is editable in the builder. */
export const campaignAssumptions = {
  /** Share of the audience held back as a control group. */
  holdoutShare: 0.1,
  /** Retention "save rate" when there's no history to default from. */
  defaultSaveRate: 0.1,
  /** Annual value of one primary checking account. */
  annualValuePerPrimary: 250,
  /** Cost to reach one person once, by channel. */
  costPerMessage: { email: 0.05, app: 0.01, sms: 0.03, branch: 4 } satisfies Record<OutreachChannel, number>,
}

export interface OfferDefaults {
  /** Paid to each account that meets the requirement. */
  bonusUsd: number
  /** Direct deposit needed for the bonus (0 = none). */
  directDepositUsd: number
  /** Debit purchases needed for the bonus (0 = none). */
  debitPurchases: number
  /** Days the customer has to meet the requirement. */
  requirementDays: number
  /** Anything else in the offer, in plain words. */
  extra: string
  /** Retention: waive the next monthly maintenance fee for everyone treated. */
  waiveFirstFee: boolean
  /** Other cost per opened/saved account, e.g. a savings rate boost (annual). */
  perAccountCostUsd: number
  channels: OutreachChannel[]
  openingChannel: OpeningChannel
  /** How long the campaign runs, starting the day after the internal as-of date. */
  durationDays: number
}

export interface CampaignPreset {
  id: string
  name: string
  /** Set for the 5 ready-made templates. */
  template: boolean
  kind: CampaignKind
  /** The segment the audience is pre-filled from. */
  source: { type: 'segment' | 'risk'; id: string }
  /** Retention default rate: the general assumption, or the fee-trigger closure gap. */
  saveRateFrom?: 'default' | 'fee-trigger'
  offer: OfferDefaults
}

const base: Omit<OfferDefaults, 'channels' | 'openingChannel' | 'durationDays'> = {
  bonusUsd: 0,
  directDepositUsd: 0,
  debitPurchases: 0,
  requirementDays: 90,
  extra: '',
  waiveFirstFee: false,
  perAccountCostUsd: 0,
}

export const campaignPresets: CampaignPreset[] = [
  // --- Acquisition: Customer Segments rows ---
  {
    id: 'primacy-bonus',
    name: 'Primacy Bonus',
    template: true,
    kind: 'acquisition',
    source: { type: 'segment', id: 'savings-only' },
    offer: {
      ...base,
      bonusUsd: 300,
      directDepositUsd: 1000,
      debitPurchases: 10,
      extra: 'Tiered: $300 for $1,000+ direct deposit and 10 debit purchases in 90 days',
      channels: ['email', 'app'],
      openingChannel: 'blended',
      durationDays: 30,
    },
  },
  {
    id: 'application-rescue',
    name: 'Application Rescue',
    template: true,
    kind: 'acquisition',
    source: { type: 'segment', id: 'abandoned-digital' },
    offer: {
      ...base,
      perAccountCostUsd: 15,
      extra: 'Reminder within 48 hours + assisted ID verification (≈ $15 of staff time per opened account)',
      channels: ['email', 'sms'],
      openingChannel: 'digital',
      durationDays: 14,
    },
  },
  {
    id: 'first-account',
    name: 'First Account Offer',
    template: false,
    kind: 'acquisition',
    source: { type: 'segment', id: 'young-adults' },
    offer: {
      ...base,
      bonusUsd: 100,
      debitPurchases: 10,
      requirementDays: 60,
      extra: '$100 after 10 debit purchases in 60 days; no monthly fee under 25',
      channels: ['app', 'email'],
      openingChannel: 'blended',
      durationDays: 30,
    },
  },
  // --- Retention: Drop-Off Risk Segment cards ---
  {
    id: 'activation-nudge',
    name: 'Activation Nudge',
    template: true,
    kind: 'retention',
    source: { type: 'risk', id: 'never-activated' },
    saveRateFrom: 'default',
    offer: {
      ...base,
      bonusUsd: 25,
      debitPurchases: 5,
      requirementDays: 30,
      extra: '$25 after the first 5 debit card purchases',
      channels: ['app', 'sms'],
      openingChannel: 'blended',
      durationDays: 21,
    },
  },
  {
    id: 'direct-deposit-retention',
    name: 'Direct Deposit Retention',
    template: false,
    kind: 'retention',
    source: { type: 'risk', id: 'direct-deposit-leaving' },
    saveRateFrom: 'default',
    offer: {
      ...base,
      bonusUsd: 50,
      directDepositUsd: 500,
      requirementDays: 60,
      extra: '$50 for keeping $500+ direct deposit here for 60 days',
      channels: ['email', 'app'],
      openingChannel: 'blended',
      durationDays: 30,
    },
  },
  {
    id: 'first-fee-forgiveness',
    name: 'First-Fee Forgiveness',
    template: true,
    kind: 'retention',
    source: { type: 'risk', id: 'approaching-fee-threshold' },
    saveRateFrom: 'fee-trigger',
    offer: {
      ...base,
      waiveFirstFee: true,
      extra: 'Waive the first $12 fee and prompt direct-deposit setup',
      channels: ['app', 'email'],
      openingChannel: 'blended',
      durationDays: 30,
    },
  },
  {
    id: 'savings-bundle',
    name: 'Checking + Savings Bundle',
    template: true,
    kind: 'retention',
    source: { type: 'risk', id: 'savings-held-elsewhere' },
    saveRateFrom: 'default',
    offer: {
      ...base,
      perAccountCostUsd: 30,
      extra: 'Savings rate boost while direct deposit is active (≈ $30/yr per account)',
      channels: ['email', 'app'],
      openingChannel: 'blended',
      durationDays: 30,
    },
  },
]

/** The preset a segment row or risk card opens. */
export function presetForSource(type: 'segment' | 'risk', id: string): CampaignPreset | undefined {
  return campaignPresets.find((p) => p.source.type === type && p.source.id === id)
}

export const TEMPLATE_IDS = ['primacy-bonus', 'first-fee-forgiveness', 'savings-bundle', 'application-rescue', 'activation-nudge']
