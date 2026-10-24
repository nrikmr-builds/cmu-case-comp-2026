import { useLocation } from 'react-router-dom'
import { findBySlug, useDashboards, type Dashboard } from './dashboards'

/** The dashboard the user is on, or the one they last opened (so Checking tabs still show where they came from). */
export function useCurrentDashboard(): Dashboard {
  const { pathname } = useLocation()
  const { state, all, landing } = useDashboards()
  const slug = pathname.startsWith('/d/') ? decodeURIComponent(pathname.slice(3)) : undefined
  if (pathname === '/') return landing
  if (slug) return findBySlug(slug, state) ?? landing
  return all.find((d) => d.id === state.recent[0]) ?? landing
}

