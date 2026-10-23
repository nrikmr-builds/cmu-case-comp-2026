import { FileText } from 'lucide-react'
import { useCampaigns } from '../lib/campaignStore'
import { useAlertRules } from '../lib/trackingStore'
import { buildWeeklyReport, type ReportSnapshot } from '../lib/weeklyReport'

/** "Generate weekly report": builds a fresh snapshot from today's data and campaigns. */
export default function GenerateReportButton({ onOpen, className = '' }: { onOpen: (r: ReportSnapshot) => void; className?: string }) {
  const { campaigns } = useCampaigns()
  const { rules } = useAlertRules()
  return (
    <button
      type="button"
      data-tour="report-button"
      onClick={() => onOpen(buildWeeklyReport(campaigns, rules))}
      className={`inline-flex items-center gap-1.5 rounded bg-brand-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue ${className}`}
    >
      <FileText className="h-4 w-4" aria-hidden />
      Generate weekly report
    </button>
  )
}
