// Saved weekly reports: frozen snapshots kept in this browser. Wrapped in try/catch so the page works
// when storage is blocked or empty.
import { useSyncExternalStore } from 'react'
import type { ReportSnapshot } from './weeklyReport'

const KEY = 'pih.reports.v1'
const CHANGE_EVENT = 'pih:reports-changed'
let cache: ReportSnapshot[] | null = null

function load(): ReportSnapshot[] {
  if (cache) return cache
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    cache = Array.isArray(parsed) ? (parsed as ReportSnapshot[]) : []
  } catch {
    cache = []
  }
  return cache
}

function save(reports: ReportSnapshot[]) {
  cache = reports
  try {
    localStorage.setItem(KEY, JSON.stringify(reports))
  } catch {
    // Storage unavailable: reports last for this page view only.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => window.removeEventListener(CHANGE_EVENT, onChange)
}

export function useReports() {
  const reports = useSyncExternalStore(subscribe, load)
  return {
    /** Newest first. */
    reports: [...reports].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)),
    isSaved: (id: string) => reports.some((r) => r.id === id),
    saveReport: (report: ReportSnapshot) =>
      save(reports.some((r) => r.id === report.id) ? reports.map((r) => (r.id === report.id ? report : r)) : [...reports, report]),
    deleteReport: (id: string) => save(reports.filter((r) => r.id !== id)),
  }
}
