import { FileText } from 'lucide-react'
import { useCampaigns } from '../lib/campaignStore'
import { useAlertRules } from '../lib/trackingStore'
import { useReforecast } from '../lib/reforecastStore'
import { buildWeeklyReport, scopeReport, type ReportSnapshot } from '../lib/weeklyReport'
import { coversChecking, dashboardKpiIds, type Dashboard } from '../lib/dashboards'

interface Props {
  onOpen: (r: ReportSnapshot) => void
  className?: string
  /** On a dashboard, the report covers only that dashboard's cards and KPIs. */
  dashboard?: Dashboard
}

/** "Generate weekly report": builds a fresh snapshot from today's data and campaigns. */
export default function GenerateReportButton({ onOpen, className = '', dashboard }: Props) {
  const { campaigns } = useCampaigns()
  const { rules } = useAlertRules()
  const { reforecast } = useReforecast()
  return (
    <button
      type="button"
      data-tour="report-button"
      onClick={() => {
        const report = buildWeeklyReport(campaigns, rules, new Date(), reforecast)
        onOpen(
          dashboard
            ? scopeReport(report, { id: dashboard.id, name: dashboard.name, kpiIds: dashboardKpiIds(dashboard), checkingSections: coversChecking(dashboard) })
            : report,
        )
      }}
      className={`btn btn-primary ${className}`}
    >
      <FileText className="h-4 w-4" aria-hidden />
      Generate weekly report
    </button>
  )
}
