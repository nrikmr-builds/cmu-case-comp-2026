// Saved dashboard views: illustrative past versions plus the Product Owner's own, kept in this browser only.
import { useEffect, useState } from 'react'
import type { DashboardView } from '../types'
import { generateView } from './dashboardPrompt'

const STORAGE_KEY = 'pih.savedViews'

/** Illustrative past versions so the history isn't empty on first load. */
const PAST_VIEWS: DashboardView[] = [
  generateView('Savings performance this quarter', { id: 'past-savings', createdAt: '2026-07-08T09:30:00' }),
  generateView('Account openings across all products', { id: 'past-openings', createdAt: '2026-07-15T14:05:00' }),
  generateView('CD renewals and deposits', { id: 'past-cd-renewals', createdAt: '2026-07-22T11:20:00' }),
  generateView('Which metrics are on track?', { id: 'past-on-track', createdAt: '2026-07-29T16:45:00' }),
  generateView('Checking account activity', { id: 'past-checking-activity', createdAt: '2026-08-05T10:10:00' }),
  generateView('New account openings for Checking and Savings', { id: 'past-openings-cs', createdAt: '2026-08-12T13:35:00' }),
  generateView('What is on the watch list?', { id: 'past-watch', createdAt: '2026-08-19T09:50:00' }),
  generateView('Digital enrollment for Savings', { id: 'past-savings-digital', createdAt: '2026-08-26T15:15:00' }),
  generateView('Compare deposit growth for Savings and CDs', { id: 'past-deposits', createdAt: '2026-09-03T10:15:00' }),
  generateView('How are our digital channels performing?', { id: 'past-digital', createdAt: '2026-09-07T16:40:00' }),
  generateView('Show me only the metrics that are behind pace', { id: 'past-behind', createdAt: '2026-09-10T08:55:00' }),
  generateView('Checking metrics that are at risk', { id: 'past-checking-risk', createdAt: '2026-09-11T17:25:00' }),
].filter((v): v is DashboardView => v !== null)

function loadUserViews(): DashboardView[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? (parsed as DashboardView[]) : []
  } catch {
    return []
  }
}

const DEFAULT_DASHBOARD_ID = 'deposit-portfolio'
const ownerOf = (v: DashboardView) => v.dashboardId ?? DEFAULT_DASHBOARD_ID

/** Views belong to the dashboard they were saved in; the illustrative samples belong to the default dashboard. */
export function useSavedViews(dashboardId: string = DEFAULT_DASHBOARD_ID) {
  const [userViews, setUserViews] = useState(loadUserViews)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userViews))
    } catch {
      // Storage can be unavailable (private mode); views then last for the session only.
    }
  }, [userViews])

  const views = [...userViews, ...PAST_VIEWS]
    .filter((v) => ownerOf(v) === dashboardId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))

  return {
    /** Newest first. */
    views,
    saveView: (view: DashboardView) =>
      setUserViews((prev) => [dashboardId === DEFAULT_DASHBOARD_ID ? view : { ...view, dashboardId }, ...prev]),
    deleteView: (id: string) => setUserViews((prev) => prev.filter((v) => v.id !== id)),
    isUserView: (id: string) => userViews.some((v) => v.id === id),
  }
}
