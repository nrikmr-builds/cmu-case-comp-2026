import { AlertTriangle, CheckCircle2, Eye } from 'lucide-react'
import type { KpiStatus } from '../types'

const STATUS_STYLES = {
  'on-track': { label: 'On Track', Icon: CheckCircle2, className: 'bg-positive-soft text-positive' },
  watch: { label: 'Watch', Icon: Eye, className: 'bg-caution-soft text-caution' },
  'at-risk': { label: 'At Risk', Icon: AlertTriangle, className: 'bg-critical-soft text-critical' },
} as const

export default function StatusBadge({ status }: { status: KpiStatus }) {
  const { label, Icon, className } = STATUS_STYLES[status]
  return (
    <span className={`chip ${className}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  )
}
