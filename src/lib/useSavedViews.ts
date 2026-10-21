// Saved dashboard views: illustrative past versions plus the Product Owner's own, kept in this browser only.
import { useEffect, useState } from 'react'
import type { DashboardView } from '../types'
import { generateView } from './dashboardPrompt'

const STORAGE_KEY = 'pih.savedViews'

/** Illustrative past versions so the history isn't empty on first load. */
const PAST_VIEWS: DashboardView[] = [
  generateView('Compare deposit growth for Savings and CDs', { id: 'past-deposits', createdAt: '2026-09-03T10:15:00' }),
  generateView('How are our digital channels performing?', { id: 'past-digital', createdAt: '2026-09-07T16:40:00' }),
  generateView('Show me only the metrics that are behind pace', { id: 'past-behind', createdAt: '2026-09-10T08:55:00' }),
].filter((v): v is DashboardView => v !== null)

function loadUserViews(): DashboardView[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? (parsed as DashboardView[]) : []
  } catch {
    return []
  }
}

export function useSavedViews() {
  const [userViews, setUserViews] = useState(loadUserViews)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userViews))
    } catch {
      // Storage can be unavailable (private mode); views then last for the session only.
    }
  }, [userViews])

  const views = [...userViews, ...PAST_VIEWS].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))

  return {
    /** Newest first. */
    views,
    saveView: (view: DashboardView) => setUserViews((prev) => [view, ...prev]),
    deleteView: (id: string) => setUserViews((prev) => prev.filter((v) => v.id !== id)),
    isUserView: (id: string) => userViews.some((v) => v.id === id),
  }
}
