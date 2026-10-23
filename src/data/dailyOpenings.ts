// PLACEHOLDER DATA: synthetic daily checking openings and early-warning flags for Q3 2026, days 1–74
// (Jul 1 – Sep 12). Generated deterministically, then rounded so every series sums exactly to the
// quarter totals already shown elsewhere: branch 4,400 + digital 3,200 = 7,600 openings (the KPI and
// the funnel), and each signal's daily flags = its "flagged this quarter" count in checkingHealth.ts.
import { activationFunnel, dropOffSignals } from './checkingHealth'
import { reportingPeriod } from './productMetrics'

export const QUARTER_START = '2026-07-01'

/** Days with data: 1 … 74. Day 74 (Sep 12) is the internal as-of date. */
export const DAYS_WITH_DATA = Math.round(reportingPeriod.quarterDays * reportingPeriod.quarterElapsed)

/** Branches closed: Jul 4 (Independence Day) and Sep 7 (Labor Day). */
const BRANCH_HOLIDAYS = ['2026-07-04', '2026-09-07']

/** Weekday weights, Sunday first. Branches are mostly closed on Sunday; digital is steadier. */
const BRANCH_WEEKDAY = [0.08, 1.15, 1.05, 1.0, 1.0, 1.1, 0.6]
const DIGITAL_WEEKDAY = [0.8, 1.1, 1.05, 1.0, 1.0, 0.95, 0.85]

export function dayToIso(day: number): string {
  const d = new Date(`${QUARTER_START}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + day - 1)
  return d.toISOString().slice(0, 10)
}

/** Small deterministic random generator so the "noise" is the same on every load. */
function seeded(seed: number) {
  let t = seed
  return () => {
    t = (t + 0x6d2b79f5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/** Splits a total across days in proportion to weights, rounding so the parts sum exactly to the total. */
export function distribute(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  const raw = weights.map((w) => (w / sum) * total)
  const floors = raw.map(Math.floor)
  let left = total - floors.reduce((a, b) => a + b, 0)
  const byRemainder = raw.map((r, i) => ({ i, rem: r - Math.floor(r) })).sort((a, b) => b.rem - a.rem)
  for (const { i } of byRemainder) {
    if (left-- <= 0) break
    floors[i] += 1
  }
  return floors
}

/** [share of the period 0–1, multiplier] points; the multiplier is linear between points. */
type TrendPoints = [number, number][]

function trendAt(points: TrendPoints, t: number): number {
  for (let k = 1; k < points.length; k++) {
    const [a, ma] = points[k - 1]
    const [b, mb] = points[k]
    if (t <= b) return ma + ((mb - ma) * (t - a)) / (b - a)
  }
  return points[points.length - 1][1]
}

interface SeriesShape {
  seed: number
  weekday: number[]
  trend: TrendPoints
  /** ± share of random variation per day. */
  noise: number
  holidays?: string[]
}

function buildSeries(total: number, shape: SeriesShape): number[] {
  const rand = seeded(shape.seed)
  const weights = Array.from({ length: DAYS_WITH_DATA }, (_, i) => {
    const day = i + 1
    const iso = dayToIso(day)
    if (shape.holidays?.includes(iso)) return 0.03
    const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay()
    const trend = trendAt(shape.trend, i / (DAYS_WITH_DATA - 1))
    return shape.weekday[weekday] * trend * (1 - shape.noise + 2 * shape.noise * rand())
  })
  return distribute(total, weights)
}

const channelTotal = (channel: 'branch' | 'digital') => activationFunnel.find((c) => c.channel === channel)?.opened ?? 0

export interface DailyOpenings {
  day: number
  date: string
  branch: number
  digital: number
}

/**
 * Story behind the shape: a summer checking promotion ran through Jul 31, then openings stepped down and kept
 * easing. That is why the 7-day average was above plan pace in July and has been below it since early August.
 */
const branchSeries = buildSeries(channelTotal('branch'), {
  seed: 11,
  weekday: BRANCH_WEEKDAY,
  trend: [[0, 1.4], [0.4, 1.35], [0.44, 0.8], [1, 0.74]],
  noise: 0.12,
  holidays: BRANCH_HOLIDAYS,
})
const digitalSeries = buildSeries(channelTotal('digital'), {
  seed: 29,
  weekday: DIGITAL_WEEKDAY,
  trend: [[0, 1.35], [0.4, 1.3], [0.44, 0.82], [1, 0.78]],
  noise: 0.12,
})

export const dailyOpenings: DailyOpenings[] = branchSeries.map((branch, i) => ({
  day: i + 1,
  date: dayToIso(i + 1),
  branch,
  digital: digitalSeries[i],
}))

/** How fast each signal's daily flags grow over the quarter (last day ÷ first day). */
const FLAG_TRENDS: Record<string, TrendPoints> = {
  'direct-deposit-leaving': [[0, 0.8], [1, 1.25]],
  'outbound-competitor-transfers': [[0, 0.75], [1, 1.35]],
  'bill-pay-moved': [[0, 0.9], [1, 1.1]],
  'activity-ratio': [[0, 1.0], [1, 1.05]],
  'balance-trend': [[0, 0.95], [1, 1.1]],
  'fee-events': [[0, 1.1], [1, 0.9]],
  'digital-disengagement': [[0, 0.9], [1, 1.2]],
  'service-friction': [[0, 1.0], [1, 1.0]],
}

/** Early-warning flags raised per day, by signal id. Each series sums to that signal's flaggedAccounts. */
export const dailyFlags: Record<string, number[]> = Object.fromEntries(
  dropOffSignals.map((s, i) => [
    s.id,
    buildSeries(s.flaggedAccounts, {
      seed: 101 + i,
      weekday: [0.9, 1.05, 1.0, 1.0, 1.0, 1.05, 0.95],
      trend: FLAG_TRENDS[s.id] ?? [[0, 1], [1, 1]],
      noise: 0.1,
    }),
  ]),
)
