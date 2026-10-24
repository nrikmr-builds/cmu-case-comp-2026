// ILLUSTRATIVE SEED CAMPAIGNS for the Campaign Tracker. They are carved OUT of the existing daily openings
// (dailyOpenings.ts), never added on top: every treated or holdout opening below is one of the 7,600 openings
// already in the KPI, the funnel, and the branch/digital split. They live in the data layer (not browser
// storage), so a cleared browser still shows them.
import { dailyOpenings, distribute } from './dailyOpenings'

export interface DailyByChannel {
  day: number
  branch: number
  digital: number
}

export interface SeedCampaign {
  id: string
  name: string
  status: 'completed' | 'live'
  /** Builder preset the campaign follows (for planned-vs-actual), if any. */
  presetId?: string
  /** Builder inputs to override on that preset to recreate the plan. */
  planOverrides?: { audience: number; durationDays: number }
  startDay: number
  endDay: number
  offer: string
  /** People targeted and held out. */
  audience: number
  holdout: number
  /** Openings from each group, by day and channel. */
  treatedDaily: DailyByChannel[]
  holdoutDaily: DailyByChannel[]
  costs: {
    bonusUsd: number
    /** Days the customer has to meet the bonus requirement. */
    bonusWindowDays: number
    /** Bonus is earned by primary accounts (direct-deposit requirement). */
    bonusOnPrimary: boolean
    channelPerPerson: number
    perOpeningUsd: number
  }
  /** Plain-language derivation shown in the tracker. */
  derivation: string
}

const days = (from: number, to: number) => dailyOpenings.filter((d) => d.day >= from && d.day <= to)
const sum = (rows: { branch: number; digital: number }[], key?: 'branch' | 'digital') =>
  rows.reduce((s, r) => s + (key ? r[key] : r.branch + r.digital), 0)

// --- Completed: Summer Switch Bonus (Jul 1 – Jul 31 = days 1–31) ---------------------------------------
// The illustrative summer promotion behind the front-loaded daily series. Its incremental openings are the
// July openings above the post-promotion run rate (Aug 1 – Sep 12 = days 32–74).
const july = days(1, 31)
const after = days(32, 74)
const julyOpenings = sum(july)
const postOpenings = sum(after)
const postRunRate = postOpenings / after.length
/** Post-promotion run rate × 31 days: what July would have been without the promotion. */
const baselineJuly = postRunRate * july.length
export const summerMath = {
  julyOpenings,
  julyDays: july.length,
  postOpenings,
  postDays: after.length,
  postRunRate,
  baselineJuly,
  /** July openings above that baseline. */
  incrementalByRunRate: julyOpenings - baselineJuly,
}

/** Offered to every prospect in the footprint except a 10% holdout; holdout opens at the run-rate baseline. */
const SUMMER_AUDIENCE = 200_000
const SUMMER_HOLDOUT = 20_000
const summerHoldoutOpenings = Math.round(summerMath.baselineJuly * (SUMMER_HOLDOUT / SUMMER_AUDIENCE))
const julyBranch = sum(july, 'branch')
const summerHoldoutBranch = Math.round((summerHoldoutOpenings * julyBranch) / summerMath.julyOpenings)
const holdBranchDaily = distribute(summerHoldoutBranch, july.map((d) => d.branch))
const holdDigitalDaily = distribute(summerHoldoutOpenings - summerHoldoutBranch, july.map((d) => d.digital))

const summer: SeedCampaign = {
  id: 'seed-summer-switch',
  name: 'Summer Switch Bonus',
  status: 'completed',
  startDay: 1,
  endDay: 31,
  offer: '$200 for $500+ direct deposit within 60 days',
  audience: SUMMER_AUDIENCE,
  holdout: SUMMER_HOLDOUT,
  holdoutDaily: july.map((d, i) => ({ day: d.day, branch: holdBranchDaily[i], digital: holdDigitalDaily[i] })),
  treatedDaily: july.map((d, i) => ({ day: d.day, branch: d.branch - holdBranchDaily[i], digital: d.digital - holdDigitalDaily[i] })),
  costs: { bonusUsd: 200, bonusWindowDays: 60, bonusOnPrimary: true, channelPerPerson: 0.06, perOpeningUsd: 0 },
  derivation:
    'All July openings came from the promotion audience (treated + holdout). The holdout opened at the post-promotion run rate, so treated openings = July openings − holdout openings.',
}

// --- Live: Application Rescue — pilot (Sep 1 – Sep 14 = days 63–76; 12 days of results by Sep 12) ------
// A 1,500-person slice of Abandoned Digital Applications. Its openings are part of the digital openings on
// those days, spread in proportion to them.
const pilotDays = days(63, 74)
const PILOT_TREATED_OPENINGS = 176
const PILOT_HOLDOUT_OPENINGS = 15
const pilotTreated = distribute(PILOT_TREATED_OPENINGS, pilotDays.map((d) => d.digital))
const pilotHoldout = distribute(PILOT_HOLDOUT_OPENINGS, pilotDays.map((d) => d.digital))

const pilot: SeedCampaign = {
  id: 'seed-application-rescue-pilot',
  name: 'Application Rescue — pilot',
  status: 'live',
  presetId: 'application-rescue',
  planOverrides: { audience: 1500, durationDays: 14 },
  startDay: 63,
  endDay: 76,
  offer: 'Reminder within 48 hours + assisted ID verification',
  audience: 1500,
  holdout: 150,
  treatedDaily: pilotDays.map((d, i) => ({ day: d.day, branch: 0, digital: pilotTreated[i] })),
  holdoutDaily: pilotDays.map((d, i) => ({ day: d.day, branch: 0, digital: pilotHoldout[i] })),
  costs: { bonusUsd: 0, bonusWindowDays: 0, bonusOnPrimary: false, channelPerPerson: 0.08, perOpeningUsd: 15 },
  derivation: `Digital openings Sep 1–12 total ${sum(pilotDays, 'digital')}; the pilot's ${PILOT_TREATED_OPENINGS + PILOT_HOLDOUT_OPENINGS} treated + holdout openings are part of them.`,
}

export const seedCampaigns: SeedCampaign[] = [summer, pilot]
