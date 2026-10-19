import type { KpiStatus } from '../types'

const BAR_COLORS: Record<KpiStatus, string> = {
  'on-track': 'bg-green-600',
  watch: 'bg-amber-500',
  'at-risk': 'bg-red-600',
}

interface Props {
  /** Share of target achieved (can exceed 1; the bar is capped at 100%). */
  attainment: number
  status: KpiStatus
  label: string
}

export default function KPIProgressBar({ attainment, status, label }: Props) {
  const percent = Math.round(attainment * 100)
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full rounded-full ${BAR_COLORS[status]}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-slate-600">{percent}%</span>
    </div>
  )
}
