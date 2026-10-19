import { AlertTriangle, CheckCircle2, Eye } from 'lucide-react'
import type { KpiStatus } from '../types'

const STATUS_STYLES = {
  'on-track': { label: 'On Track', Icon: CheckCircle2, className: 'bg-green-50 text-green-700' },
  watch: { label: 'Watch', Icon: Eye, className: 'bg-amber-50 text-amber-700' },
  'at-risk': { label: 'At Risk', Icon: AlertTriangle, className: 'bg-red-50 text-red-700' },
} as const

export default function StatusBadge({ status }: { status: KpiStatus }) {
  const { label, Icon, className } = STATUS_STYLES[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  )
}
