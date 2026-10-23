import { ChevronDown, ChevronUp, History, LayoutDashboard, Trash2 } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
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
  /** Extra history lists below the views (e.g. saved weekly reports). */
  footer?: ReactNode
}

interface MonthGroup {
  key: string
  label: string
  shortLabel: string
  views: DashboardView[]
}

/** Groups newest-first views by calendar month, keeping their order. */
function groupByMonth(views: DashboardView[]): MonthGroup[] {
  const groups: MonthGroup[] = []
  for (const view of views) {
    const date = new Date(view.createdAt)
    const key = `${date.getFullYear()}-${date.getMonth() + 1}`
    let group = groups.at(-1)
    if (group?.key !== key) {
      group = {
        key,
        label: date.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        shortLabel: date.toLocaleString('en-US', { month: 'short' }),
        views: [],
      }
      groups.push(group)
    }
    group.views.push(view)
  }
  return groups
}

export default function SavedViewsNav({ defaultView, views, activeId, onSelect, onDelete, isDeletable, footer }: Props) {
  const listRef = useRef<HTMLDivElement>(null)
  const groups = groupByMonth(views)

  // Stepping runs through the history newest to oldest; the default view sits just before the newest.
  const index = views.findIndex((v) => v.id === activeId)
  const newer = index > 0 ? views[index - 1] : index === 0 ? defaultView : undefined
  const older = index === -1 ? views[0] : views[index + 1]

  // Keep the active view visible in the list as the Product Owner steps through history.
  useEffect(() => {
    const list = listRef.current
    const item = list?.querySelector<HTMLElement>(`[data-view-id="${activeId}"]`)
    if (!list || !item) return
    const outOfView =
      item.offsetTop < list.scrollTop || item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight
    if (outOfView) list.scrollTo({ top: item.offsetTop - list.clientHeight / 3, behavior: 'smooth' })
  }, [activeId])

  function jumpToMonth(key: string) {
    const list = listRef.current
    const heading = list?.querySelector<HTMLElement>(`[data-month="${key}"]`)
    if (list && heading) list.scrollTo({ top: heading.offsetTop, behavior: 'smooth' })
  }

  return (
    <nav aria-label="Dashboard views" className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      <ViewButton view={defaultView} active={activeId === defaultView.id} onSelect={onSelect} isDefault />

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="space-y-3 border-b border-slate-200 p-3">
          <h2 className="flex items-center justify-between text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <span className="flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" aria-hidden />
              View history
            </span>
            <span className="font-normal tracking-normal normal-case tabular-nums">{views.length} saved</span>
          </h2>

          <div className="flex items-center justify-between gap-2">
            <StepButton label="Newer" icon={ChevronUp} target={newer} onSelect={onSelect} />
            <span className="text-xs tabular-nums text-slate-600" aria-live="polite">
              {index >= 0 ? `${index + 1} of ${views.length}` : activeId === defaultView.id ? 'Current' : 'Unsaved'}
            </span>
            <StepButton label="Older" icon={ChevronDown} target={older} onSelect={onSelect} />
          </div>

          {groups.length > 1 && (
            <div role="group" aria-label="Jump to month" className="flex flex-wrap gap-1">
              {groups.map((group) => (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => jumpToMonth(group.key)}
                  aria-label={`Jump to ${group.label}`}
                  className={`rounded-full border px-2 py-0.5 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue ${
                    group.views.some((v) => v.id === activeId)
                      ? 'border-brand-orange bg-orange-50 text-orange-800'
                      : 'border-slate-200 text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue'
                  }`}
                >
                  {group.shortLabel}
                </button>
              ))}
            </div>
          )}
        </div>

        <div ref={listRef} className="relative max-h-80 overflow-y-auto overscroll-contain lg:max-h-[calc(100vh-16rem)]">
          {groups.map((group) => (
            <section key={group.key} data-month={group.key} aria-label={group.label}>
              <h3
                className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase backdrop-blur"
              >
                {group.label}
              </h3>
              <ul className="space-y-1 p-1.5">
                {group.views.map((view) => (
                  <li key={view.id} data-view-id={view.id} className="group relative">
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
            </section>
          ))}
        </div>
      </div>
      {footer}
    </nav>
  )
}

interface StepButtonProps {
  label: string
  icon: typeof ChevronUp
  target: DashboardView | undefined
  onSelect: (id: string) => void
}

function StepButton({ label, icon: Icon, target, onSelect }: StepButtonProps) {
  return (
    <button
      type="button"
      onClick={() => target && onSelect(target.id)}
      disabled={!target}
      title={target ? `${label}: ${target.label}` : undefined}
      className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs font-medium text-brand-blue hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  )
}

interface ViewButtonProps {
  view: DashboardView
  active: boolean
  onSelect: (id: string) => void
  isDefault?: boolean
}

function ViewButton({ view, active, onSelect, isDefault }: ViewButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(view.id)}
      aria-current={active ? 'true' : undefined}
      className={`w-full rounded border border-l-4 px-3 py-2 pr-8 text-left transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-blue ${
        active
          ? 'border-slate-200 border-l-brand-orange bg-white shadow-sm'
          : `border-transparent border-l-transparent hover:border-slate-200 ${isDefault ? 'hover:bg-white' : 'hover:bg-slate-50'}`
      }`}
    >
      <span className="flex items-center gap-1.5 text-sm font-medium text-brand-ink">
        {isDefault && <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />}
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
