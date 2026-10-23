import { ChevronDown, Copy, Home, LayoutGrid, Pencil, Pin, PinOff, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardStore, useDashboards, type Dashboard } from '../lib/dashboards'
import { EditCardsDialog, Modal } from './DashboardEditor'

const item = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-40'

/** Per-dashboard actions: rename, duplicate, pin, set as landing, edit cards, delete. ("+ New dashboard" lives in the header.) */
export default function DashboardActions({ dashboard }: { dashboard: Dashboard }) {
  const navigate = useNavigate()
  const { state } = useDashboards()
  const [menu, setMenu] = useState(false)
  const [dialog, setDialog] = useState<'rename' | 'edit' | 'delete' | null>(null)
  const [name, setName] = useState(dashboard.name)
  const ref = useRef<HTMLDivElement>(null)
  const builtIn = !!dashboard.builtIn
  const isLanding = state.landingId === dashboard.id

  useEffect(() => {
    if (!menu) return
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setMenu(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [menu])

  const run = (fn: () => void) => {
    setMenu(false)
    fn()
  }

  return (
    <div className="flex flex-wrap gap-2">
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-haspopup="menu"
          aria-expanded={menu}
          className="btn btn-secondary"
        >
          Dashboard actions <ChevronDown className="h-4 w-4" aria-hidden />
        </button>
        {menu && (
          <div role="menu" className="absolute right-0 z-30 mt-1 w-64 animate-enter overflow-hidden rounded-sm bg-white py-1 shadow-pop">
            <button type="button" role="menuitem" disabled={builtIn} onClick={() => run(() => setDialog('rename'))} className={item}>
              <Pencil className="h-4 w-4" aria-hidden /> Rename
            </button>
            <button type="button" role="menuitem" disabled={builtIn} onClick={() => run(() => setDialog('edit'))} className={item}>
              <LayoutGrid className="h-4 w-4" aria-hidden /> Edit cards
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() =>
                run(() => {
                  const copy = dashboardStore.duplicate(dashboard.id)
                  if (copy) navigate(`/d/${copy.slug}`)
                })
              }
              className={item}
            >
              <Copy className="h-4 w-4" aria-hidden /> Duplicate
            </button>
            <button type="button" role="menuitem" onClick={() => run(() => dashboardStore.setPinned(dashboard.id, !dashboard.pinned))} className={item}>
              {dashboard.pinned ? <PinOff className="h-4 w-4" aria-hidden /> : <Pin className="h-4 w-4" aria-hidden />}
              {dashboard.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button type="button" role="menuitem" disabled={isLanding} onClick={() => run(() => dashboardStore.setLanding(dashboard.id))} className={item}>
              <Home className="h-4 w-4" aria-hidden /> {isLanding ? 'Default landing (current)' : 'Set as default landing'}
            </button>
            <button type="button" role="menuitem" disabled={builtIn} onClick={() => run(() => setDialog('delete'))} className={`${item} text-critical`}>
              <Trash2 className="h-4 w-4" aria-hidden /> Delete
            </button>
            {builtIn && <p className="px-3 py-1.5 text-xs text-muted">The built-in dashboard can’t be renamed, edited or deleted. Duplicate it to make your own.</p>}
          </div>
        )}
      </div>

      {dialog === 'rename' && (
        <Modal title="Rename dashboard" onClose={() => setDialog(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!name.trim()) return
              dashboardStore.update(dashboard.id, { name: name.trim() })
              setDialog(null)
              const renamed = dashboardStore.get().dashboards.find((d) => d.id === dashboard.id)
              if (renamed && !isLanding) navigate(`/d/${renamed.slug}`, { replace: true })
            }}
          >
            <input value={name} onChange={(e) => setName(e.target.value)} aria-label="New name" className="field block w-full" />
            <button type="submit" className="btn btn-primary mt-3">
              Rename
            </button>
          </form>
        </Modal>
      )}
      {dialog === 'edit' && <EditCardsDialog dashboard={dashboard} onClose={() => setDialog(null)} />}
      {dialog === 'delete' && (
        <Modal title="Delete dashboard?" onClose={() => setDialog(null)}>
          <p className="text-sm text-body">
            “{dashboard.name}” and its saved views will be removed from this browser. The opportunity pages and data aren’t affected.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                dashboardStore.remove(dashboard.id)
                setDialog(null)
                navigate('/')
              }}
              className="btn btn-destructive"
            >
              Delete
            </button>
            <button type="button" onClick={() => setDialog(null)} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
