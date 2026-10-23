import { RotateCcw, Settings } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/** Every key this prototype stores starts with this prefix (views, alerts, visits, campaigns, reports). */
const STORAGE_PREFIX = 'pih.'

/** Clears every stored hub key, so the next load is the clean first-visit state. */
function resetDemoStorage(): number {
  let removed = 0
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(STORAGE_PREFIX))
    keys.forEach((k) => localStorage.removeItem(k))
    removed = keys.length
  } catch {
    // Storage unavailable: nothing was stored, so there's nothing to clear.
  }
  return removed
}

/** Small header menu with "Reset demo". Asks before deleting the viewer's saved items. */
export default function HeaderSettings() {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Settings"
        onClick={() => {
          setOpen((v) => !v)
          setConfirming(false)
        }}
        className="btn btn-secondary btn-sm btn-icon"
      >
        <Settings className="h-4 w-4" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-72 animate-enter rounded-sm bg-white p-3 text-sm text-body shadow-pop">
          {!confirming ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => setConfirming(true)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand-blue"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Reset demo
            </button>
          ) : (
            <div role="alertdialog" aria-label="Confirm reset">
              <p className="font-medium text-brand-ink">Reset the demo?</p>
              <p className="mt-1 text-xs text-muted">
                This deletes everything saved in this browser: your campaigns, reports, saved views, alert rules, and last-visit
                time. The hub reopens in its first-visit state with the two seeded campaigns.
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setConfirming(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetDemoStorage()
                    window.location.assign('/')
                  }}
                  className="btn btn-destructive btn-sm"
                >
                  Reset demo
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
