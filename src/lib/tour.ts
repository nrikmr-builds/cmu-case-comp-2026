// Guided tour for judges: 8 steps across the home and Checking pages. Every number in a caption is read from
// the data/calculation layer when the step is shown, never typed in.
import { useSyncExternalStore } from 'react'
import { currentQuarterHealth, dropOffSignals, healthMixHistory } from '../data/checkingHealth'
import { seedCampaigns } from '../data/campaignSeeds'
import { getKpi, reportingPeriod } from '../data/productMetrics'
import { computeEconomics, inputsFromPreset } from './campaignEconomics'
import { getTotals, trackSeed } from './campaignTracking'
import { formatPercent1, formatSignedCount, getNetAccountChange, getPrimacyRate, getStrongestSignal } from './checkingHealth'
import { getHeadlineProjection, getWeeklyPace } from './dailyTracking'
import { formatPercent, formatValue, getPaceRatio, getStatus } from './metrics'
import { buildWeeklyReport } from './weeklyReport'
import { DEFAULT_ALERT_RULES } from './dailyTracking'

const n = (x: number) => formatValue(x, 'accounts')
const usd = (x: number) => `$${Math.round(x).toLocaleString('en-US')}`
const STATUS = { 'on-track': 'On Track', watch: 'Watch', 'at-risk': 'At Risk' } as const

export interface TourStep {
  title: string
  /** Route the step lives on. */
  path: string
  /** CSS selector of the section to highlight. */
  target: string
  caption: () => string
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: 'Portfolio',
    path: '/',
    target: '[data-product-id="checking"]',
    caption: () => {
      const q = reportingPeriod.quarterElapsed
      const open = getKpi('checking-new-accounts')
      const prim = getKpi('checking-primacy-rate')
      const active = getKpi('checking-active-rate')
      return `Checking is ${STATUS[getStatus(open, q)]} (openings at ${formatPercent(getPaceRatio(open, q))} of pace), and Primacy is ${STATUS[getStatus(prim, q)]} at ${formatPercent(prim.actual)}, while Active Account Rate looks fine at ${formatPercent(active.actual)}.`
    },
  },
  {
    title: 'Gap Summary',
    path: '/opportunities/checking',
    target: '#gap-heading',
    caption: () => {
      const { projection: p } = getHeadlineProjection(getKpi('checking-new-accounts'))
      return `At the recent pace (${Math.round(p.paceDailyRate)}/day), Q3 lands at ${n(p.projected)}: ${n(p.incrementalNeeded)} short of the ${n(getKpi('checking-new-accounts').target)} target.`
    },
  },
  {
    title: 'Daily trend',
    path: '/opportunities/checking',
    target: '#daily-heading',
    caption: () => {
      const w = getWeeklyPace()
      return `Openings slowed after the illustrative summer promotion ended Jul 31: ${Math.round(w.weekPerDay)}/day this week vs. ${Math.round(w.quarterPerDay)}/day for the quarter.`
    },
  },
  {
    title: 'Account health',
    path: '/opportunities/checking',
    target: '#health-heading',
    caption: () => {
      const net = getNetAccountChange(getKpi('checking-new-accounts').actual, currentQuarterHealth.closedThisQuarter)
      return `${formatSignedCount(net)} net accounts this quarter, and primacy fell from ${formatPercent1(getPrimacyRate(healthMixHistory[0]))} to ${formatPercent1(getPrimacyRate(healthMixHistory[healthMixHistory.length - 1]))}.`
    },
  },
  {
    title: 'Early-warning signals',
    path: '/opportunities/checking',
    target: '#signals-heading',
    caption: () => {
      const s = getStrongestSignal(dropOffSignals)
      return `${s.name} is the strongest early-warning signal: ${s.lift.toFixed(1)}× lift, ${n(s.flaggedAccounts)} accounts flagged this quarter.`
    },
  },
  {
    title: 'Promotion Builder',
    path: '/opportunities/checking',
    target: '#campaigns-heading',
    caption: () => {
      const e = computeEconomics(inputsFromPreset('primacy-bonus'))
      return `A Primacy Bonus costs ${usd(e.costPerPrimary ?? 0)} per primary account overall, but ${usd(e.costPerIncrementalPrimary ?? 0)} per INCREMENTAL primary account, because most bonuses go to customers who'd open anyway.`
    },
  },
  {
    title: 'Campaign Tracker',
    path: '/opportunities/checking',
    target: '#tracker-heading',
    caption: () => {
      const [summer, pilot] = seedCampaigns.map(trackSeed)
      const t = getTotals([])
      return `${summer.name} is ${summer.actual?.lift.label}; ${pilot.name} is ${pilot.actual?.lift.label}. The acquisition plan covers about ${Math.round(t.acquisition.share * 100)}% of the ${n(t.acquisition.gap)} gap.`
    },
  },
  {
    title: 'Weekly report',
    path: '/opportunities/checking',
    target: '[data-tour="report-button"]',
    caption: () => {
      const r = buildWeeklyReport([], DEFAULT_ALERT_RULES)
      const head = getHeadlineProjection(getKpi('checking-new-accounts')).projection
      const plan = getTotals([]).acquisition.planQ3
      return `One click turns this into a leadership report with ${r.decisions.length} decisions, starting with a Q3 re-forecast of about ${n(Math.round(head.projected) + plan)}.`
    },
  },
]

// --- Tour state (shared by the home "Take the tour" button and the overlay in the header) ---

let step: number | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export const tourStore = {
  start: () => {
    step = 0
    emit()
  },
  go: (i: number) => {
    step = i < 0 ? 0 : i >= TOUR_STEPS.length ? null : i
    emit()
  },
  stop: () => {
    step = null
    emit()
  },
}

export function useTourStep() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => step,
  )
}
