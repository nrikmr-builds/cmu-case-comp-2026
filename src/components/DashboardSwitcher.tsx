import { Check, ChevronDown, LayoutDashboard, Pin, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createDialog, dashboardPath, scopeLabel, switcher, switcherSections, useDashboards, useSwitcherOpen, type Dashboard } from '../lib/dashboards'
import { useCurrentDashboard } from '../lib/useCurrentDashboard'
import { DASHBOARD_COLORS, DASHBOARD_ICONS } from './dashboardIcons'

export function DashboardIconBadge({ d, size = 'sm' }: { d: Pick<Dashboard, 'icon' | 'color'>; size?: 'sm' | 'lg' }) {
  const Icon = DASHBOARD_ICONS[d.icon]
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded ${DASHBOARD_COLORS[d.color]} ${size === 'lg' ? 'h-8 w-8' : 'h-6 w-6'}`}>
      <Icon className={size === 'lg' ? 'h-4.5 w-4.5' : 'h-3.5 w-3.5'} aria-hidden />
    </span>
  )
}

interface PanelProps {
  all: Dashboard[]
  recentIds: string[]
  currentId: string
  landingId: string
  query: string
  onQuery: (q: string) => void
  activeIndex: number
  onPick: (d: Dashboard) => void
  onNew: () => void
  onClose?: () => void
  onKeyDown?: (e: ReactKeyboardEvent) => void
  /** Figure export: a static copy with no focus handling. */
  staticCopy?: boolean
}

/** The switcher's content; also rendered off-screen for fig9. */
export function SwitcherPanel({ all, recentIds, currentId, landingId, query, onQuery, activeIndex, onPick, onNew, onClose, onKeyDown, staticCopy }: PanelProps) {
  const sections = useMemo(() => switcherSections(all, recentIds, query), [all, recentIds, query])
  // Running option index across sections, for keyboard navigation.
  const offsets = sections.map((_, k) => sections.slice(0, k).reduce((n, x) => n + x.items.length, 0))
  return (
    <div className="flex h-full flex-col" onKeyDown={onKeyDown}>
      <div className="flex items-center gap-2 border-b border-slate-200 p-3">
        <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <input
          autoFocus={!staticCopy}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={`Search ${all.length} dashboards`}
          aria-label="Search dashboards"
          role="combobox"
          aria-expanded="true"
          aria-controls="dashboard-switcher-list"
          aria-activedescendant={activeIndex >= 0 ? `dash-opt-${activeIndex}` : undefined}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
        <kbd className="hidden rounded border border-slate-200 px-1.5 text-[10px] text-slate-500 sm:inline">Esc</kbd>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close dashboard switcher" className="rounded p-1 text-slate-500 hover:bg-slate-100 sm:hidden">
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
      <div className="border-b border-slate-200 p-2">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded bg-brand-blue px-3 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark"
        >
          <Plus className="h-4 w-4" aria-hidden /> New dashboard
        </button>
      </div>
      <ul id="dashboard-switcher-list" role="listbox" aria-label="Dashboards" className="flex-1 overflow-y-auto p-2 text-sm">
        {sections.length === 0 && <li className="p-3 text-slate-500">No dashboards match “{query}”.</li>}
        {sections.map((s, k) => (
          <li key={s.title} role="presentation" className="mb-2">
            <p className="px-2 py-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{s.title}</p>
            <ul role="presentation">
              {s.items.map((d, j) => {
                const idx = offsets[k] + j
                return (
                  <li
                    key={`${s.title}-${d.id}`}
                    id={`dash-opt-${idx}`}
                    role="option"
                    aria-selected={idx === activeIndex}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onPick(d)}
                    className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 ${idx === activeIndex ? 'bg-blue-50 ring-1 ring-brand-blue/30' : 'hover:bg-slate-50'}`}
                  >
                    <DashboardIconBadge d={d} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-brand-ink">{d.name}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {scopeLabel(d.scope)} · {d.cards.length} cards
                        {d.example ? ' · Example · illustrative' : ''}
                        {d.id === landingId ? ' · Default landing' : ''}
                      </span>
                    </span>
                    {d.pinned && <Pin className="h-3.5 w-3.5 text-slate-400" aria-label="Pinned" />}
                    {d.id === currentId && <Check className="h-4 w-4 text-brand-blue" aria-label="Current" />}
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ul>
      <p className="border-t border-slate-200 px-3 py-1.5 text-[11px] text-slate-500">↑ ↓ to move · Enter to open · Esc to close · ⌘K / Ctrl+K anywhere</p>
    </div>
  )
}

/** Header control: the current dashboard's name; opens the switcher (also on ⌘K / Ctrl+K). */
export default function DashboardSwitcher() {
  const open = useSwitcherOpen()
  const navigate = useNavigate()
  const { state, all } = useDashboards()
  const current = useCurrentDashboard()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const flat = useMemo(() => switcherSections(all, state.recent, query).flatMap((s) => s.items), [all, state.recent, query])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        switcher.set(!open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const close = () => {
    switcher.set(false)
    setQuery('')
    setActive(0)
    buttonRef.current?.focus()
  }
  const pick = (d: Dashboard) => {
    close()
    navigate(dashboardPath(d, state))
  }
  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(flat.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flat[active]) pick(flat[active])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  return (
    <div className="relative flex items-center">
      <button
        ref={buttonRef}
        type="button"
        data-tour="dashboard-switcher"
        onClick={() => switcher.set(!open)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Switch dashboard (⌘K / Ctrl+K)"
        className="inline-flex max-w-[10rem] items-center gap-1.5 rounded border border-white/30 bg-white/10 px-2 py-1 text-xs font-medium text-white hover:bg-white/20 sm:max-w-[16rem]"
      >
        <LayoutDashboard className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">{current.name}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="sr-only">: switch dashboard</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/30 sm:bg-transparent" onClick={close} aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Switch dashboard"
            className="fixed inset-0 z-50 flex flex-col bg-white text-slate-800 shadow-xl sm:absolute sm:inset-auto sm:top-full sm:left-0 sm:mt-2 sm:h-[min(34rem,75vh)] sm:w-[26rem] sm:rounded-md sm:border sm:border-slate-200"
          >
            <SwitcherPanel
              all={all}
              recentIds={state.recent}
              currentId={current.id}
              landingId={state.landingId}
              query={query}
              onQuery={(q) => {
                setQuery(q)
                setActive(0)
              }}
              activeIndex={active}
              onPick={pick}
              onNew={() => {
                close()
                createDialog.open()
              }}
              onClose={close}
              onKeyDown={onKeyDown}
            />
          </div>
        </>
      )}
    </div>
  )
}
