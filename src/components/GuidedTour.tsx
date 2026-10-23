import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { TOUR_STEPS, tourStore, useTourStep } from '../lib/tour'

/** Finds a step's target; the Checking sections load lazily, so keep trying for a few seconds. */
function waitFor(selector: string, timeoutMs = 4000): Promise<Element | null> {
  return new Promise((resolve) => {
    const start = Date.now()
    const tick = () => {
      const el = document.querySelector(selector)
      if (el || Date.now() - start > timeoutMs) resolve(el)
      else requestAnimationFrame(tick)
    }
    tick()
  })
}

/** Section to highlight: the card around a heading, or the element itself. */
const frameFor = (el: Element) => el.closest('section') ?? el

/** Overlay for the judges' tour: dims the page, outlines one section, and shows its caption. */
export default function GuidedTour() {
  const step = useTourStep()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // The outline's position, tagged with the step it belongs to, so a new step starts unoutlined.
  const [frame, setFrame] = useState<{ step: number; rect: DOMRect } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const current = step === null ? null : TOUR_STEPS[step]
  const rect = frame && frame.step === step ? frame.rect : null
  // Read the route through a ref: navigating inside the step effect must not re-run it.
  const pathRef = useRef(pathname)
  useEffect(() => {
    pathRef.current = pathname
  }, [pathname])

  // Go to the step's page, wait for its section, scroll it into view, then track its position.
  useEffect(() => {
    if (!current || step === null) return
    let cancelled = false
    let el: Element | null = null
    if (pathRef.current !== current.path) navigate(current.path)
    waitFor(current.target).then((found) => {
      if (cancelled || !found) return
      el = frameFor(found)
      el.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior })
      window.scrollBy(0, -80)
      setFrame({ step, rect: el.getBoundingClientRect() })
      cardRef.current?.focus()
    })
    const update = () => el && setFrame({ step, rect: el.getBoundingClientRect() })
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      cancelled = true
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [step, current, navigate])

  useEffect(() => {
    if (step === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') tourStore.stop()
      else if (e.key === 'ArrowRight') tourStore.go(step + 1)
      else if (e.key === 'ArrowLeft') tourStore.go(step - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step])

  if (step === null || !current) return null
  const last = step === TOUR_STEPS.length - 1
  const pad = 6

  return createPortal(
    <div className="fixed inset-0 z-[60]" aria-live="polite">
      {/* Dim everything except the highlighted section (a big box-shadow around the outline). */}
      {rect ? (
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-sm ring-4 ring-brand-orange transition-all"
          style={{
            top: rect.top - pad,
            left: Math.max(4, rect.left - pad),
            width: Math.min(rect.width + pad * 2, window.innerWidth - 8),
            height: rect.height + pad * 2,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55)',
          }}
        />
      ) : (
        <div aria-hidden className="fixed inset-0 bg-ink/55" />
      )}

      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        className="fixed inset-x-4 bottom-4 mx-auto max-w-lg animate-sheet rounded-sm bg-white p-4 shadow-pop outline-none sm:bottom-6"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold text-muted">
            Tour · step {step + 1} of {TOUR_STEPS.length}
          </p>
          <button type="button" onClick={() => tourStore.stop()} aria-label="Skip tour" className="btn btn-tertiary btn-sm btn-icon">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <h2 id="tour-title" className="mt-1 text-lg font-semibold text-brand-ink">
          {current.title}
        </h2>
        <p className="mt-1 text-sm text-body">{current.caption()}</p>
        <p className="mt-1 text-xs text-muted">Illustrative data · use ← → or Esc</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button type="button" onClick={() => tourStore.stop()} className="btn btn-tertiary btn-inline">
            Skip tour
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => tourStore.go(step - 1)}
              disabled={step === 0}
              className="btn btn-secondary"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back
            </button>
            <button
              type="button"
              onClick={() => tourStore.go(step + 1)}
              className="btn btn-primary"
            >
              {last ? 'Finish' : 'Next'} {!last && <ArrowRight className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
