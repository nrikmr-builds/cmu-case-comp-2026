import { History, LayoutDashboard, Trash2 } from 'lucide-react'
import { formatTimestamp } from '../lib/metrics'
import type { DashboardView } from '../types'

interface Props {
  defaultView: DashboardView
  /** Saved views, newest first. */
  views: DashboardView[]
  /** Null while an unsaved generated view is showing. */
  activeId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  isDeletable: (id: string) => boolean
}

export default function SavedViewsNav({ defaultView, views, activeId, onSelect, onDelete, isDeletable }: Props) {
  return (
    <nav aria-label="Dashboard views" className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      <ViewButton view={defaultView} active={activeId === defaultView.id} onSelect={onSelect} icon="default" />

      <div>
        <h2 className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <History className="h-3.5 w-3.5" aria-hidden />
          Saved views
        </h2>
        <ul className="mt-2 space-y-1.5">
          {views.map((view) => (
            <li key={view.id} className="group relative">
              <ViewButton view={view} active={activeId === view.id} onSelect={onSelect} />
              {isDeletable(view.id) && (
                <button
                  type="button"
                  onClick={() => onDelete(view.id)}
                  aria-label={`Delete saved view: ${view.label}`}
                  className="absolute top-2 right-2 rounded p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 hover:text-red-600 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-brand-blue"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

interface ViewButtonProps {
  view: DashboardView
  active: boolean
  onSelect: (id: string) => void
  icon?: 'default'
}

function ViewButton({ view, active, onSelect, icon }: ViewButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(view.id)}
      aria-current={active ? 'true' : undefined}
      className={`w-full rounded-lg border border-l-4 px-3 py-2 pr-8 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue ${
        active
          ? 'border-slate-200 border-l-brand-orange bg-white shadow-sm'
          : 'border-transparent border-l-transparent hover:border-slate-200 hover:bg-white'
      }`}
    >
      <span className="flex items-center gap-1.5 text-sm font-medium text-brand-ink">
        {icon === 'default' && <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />}
        {view.label}
      </span>
      {view.prompt ? (
        <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500 italic">“{view.prompt}”</span>
      ) : (
        <span className="mt-0.5 block text-xs text-slate-500">All KPIs across every product</span>
      )}
      {view.prompt && (
        <span className="mt-1 block text-[11px] tabular-nums text-slate-400">
          {formatTimestamp(view.createdAt)} · {view.kpiIds.length} {view.kpiIds.length === 1 ? 'metric' : 'metrics'}
        </span>
      )}
    </button>
  )
}
