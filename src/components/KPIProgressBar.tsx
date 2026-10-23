import type { KpiStatus } from '../types'

const BAR_COLORS: Record<KpiStatus, string> = {
  'on-track': 'bg-positive',
  watch: 'bg-caution',
  'at-risk': 'bg-critical',
}

interface Props {
  /** Share of target achieved (can exceed 1; the bar is capped at 100%). */
  attainment: number
  status: KpiStatus
  label: string
  /** Hide the % beside the bar when the caller prints a labeled figure instead. */
  showValue?: boolean
}

export default function KPIProgressBar({ attainment, status, label, showValue = true }: Props) {
  const percent = Math.round(attainment * 100)
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full rounded-full ${BAR_COLORS[status]}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      {showValue && <span className="w-10 text-right text-xs tabular-nums text-muted">{percent}%</span>}
    </div>
  )
}
