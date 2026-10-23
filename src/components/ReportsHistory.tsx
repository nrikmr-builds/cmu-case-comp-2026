import { FileText, Trash2 } from 'lucide-react'
import { formatTimestamp } from '../lib/metrics'
import { shortDate } from '../lib/dailyTracking'
import { useReports } from '../lib/reportStore'
import type { ReportSnapshot } from '../lib/weeklyReport'

/** "Reports" list in the left history column, separate from saved views. Reports reopen as frozen snapshots. */
export default function ReportsHistory({ onOpen, dashboardId }: { onOpen: (r: ReportSnapshot) => void; dashboardId?: string }) {
  const { reports: all, deleteReport } = useReports()
  // On a dashboard, only its own reports (reports from before dashboards existed belong to the default one).
  const reports = dashboardId ? all.filter((r) => (r.dashboard?.id ?? 'deposit-portfolio') === dashboardId) : all
  return (
    <section aria-labelledby="reports-history-heading" className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <h2 id="reports-history-heading" className="flex items-center justify-between border-b border-slate-200 p-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        <span className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" aria-hidden />
          Reports
        </span>
        <span className="font-normal tracking-normal normal-case tabular-nums">{reports.length} saved</span>
      </h2>
      {reports.length === 0 ? (
        <p className="p-3 text-xs text-slate-500">No saved reports yet. Generate one and save it.</p>
      ) : (
        <ul className="max-h-60 divide-y divide-slate-100 overflow-y-auto">
          {reports.map((r) => (
            <li key={r.id} className="flex items-start gap-1 px-3 py-2">
              <button
                type="button"
                onClick={() => onOpen(r)}
                className="flex-1 rounded text-left text-sm text-brand-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
              >
                Weekly report{r.dashboard && r.dashboard.id !== 'deposit-portfolio' ? ` · ${r.dashboard.name}` : ''} · {r.quarter}
                <span className="block text-xs text-slate-500">Generated {formatTimestamp(r.generatedAt)} · data as of {shortDate(r.internalAsOf)}</span>
              </button>
              <button
                type="button"
                onClick={() => deleteReport(r.id)}
                aria-label={`Delete report generated ${formatTimestamp(r.generatedAt)}`}
                className="rounded p-1 text-slate-400 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-brand-blue"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
