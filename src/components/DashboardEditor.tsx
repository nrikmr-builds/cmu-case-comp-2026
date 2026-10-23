import { ArrowDown, ArrowUp, Database, Loader2, Plus, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  cardCatalogue,
  cardTitle,
  createDialog,
  dashboardStore,
  describeDashboard,
  PRODUCT_NAME,
  scopeLabel,
  TEMPLATES,
  useCreateDialog,
  type CreateRequest,
  type Dashboard,
  type DashboardCard,
  type DashboardColor,
  type DashboardIcon,
} from '../lib/dashboards'
import type { ProductId } from '../types'
import { DashboardIconBadge } from './DashboardSwitcher'

const ALL: ProductId[] = ['checking', 'savings', 'cd']
const GENERATE_DELAY_MS = 600
const SUGGESTIONS = [
  'Checking openings, daily pace, alerts and campaigns',
  'Savings and CD deposit growth',
  'Retention: next best action and competitor offers ending',
  'Checking NPS and app ratings',
]

/** Ordered card list with keyboard-friendly reorder and remove buttons, plus "Add a card" from the catalogue. */
export function CardListEditor({ cards, scope, onChange }: { cards: DashboardCard[]; scope: ProductId[]; onChange: (cards: DashboardCard[]) => void }) {
  const available = cardCatalogue(scope).filter((c) => !cards.some((x) => x.id === c.id))
  const [toAdd, setToAdd] = useState('')
  const move = (i: number, by: number) => {
    const next = [...cards]
    const [c] = next.splice(i, 1)
    next.splice(i + by, 0, c)
    onChange(next)
  }
  return (
    <div>
      <ol className="divide-y divide-slate-100 rounded border border-slate-200">
        {cards.length === 0 && <li className="p-3 text-sm text-slate-500">No cards yet. Add one below.</li>}
        {cards.map((c, i) => (
          <li key={c.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
            <span className="w-5 text-xs text-slate-400 tabular-nums">{i + 1}</span>
            <span className={`min-w-0 flex-1 truncate ${c.type === 'placeholder' ? 'text-amber-800' : ''}`}>
              {c.type === 'placeholder' && <Database className="mr-1 inline h-3.5 w-3.5" aria-hidden />}
              {cardTitle(c)}
            </span>
            <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${cardTitle(c)} up`} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
              <ArrowUp className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button type="button" disabled={i === cards.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${cardTitle(c)} down`} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
              <ArrowDown className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button type="button" onClick={() => onChange(cards.filter((x) => x.id !== c.id))} aria-label={`Remove ${cardTitle(c)}`} className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-700">
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ol>
      {available.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          <select value={toAdd} onChange={(e) => setToAdd(e.target.value)} aria-label="Card to add" className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm">
            <option value="">Add a card…</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {cardTitle(c)}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!toAdd}
            onClick={() => {
              const c = available.find((x) => x.id === toAdd)
              if (c) onChange([...cards, c])
              setToAdd('')
            }}
            className="inline-flex items-center gap-1 rounded border border-brand-blue px-2 py-1 text-sm font-medium text-brand-blue disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add
          </button>
        </div>
      )}
    </div>
  )
}

export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return createPortal(
    <div className="fixed inset-0 z-[55] overflow-y-auto bg-slate-900/50 sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div ref={ref} tabIndex={-1} className={`mx-auto min-h-full bg-white p-5 shadow-xl outline-none sm:min-h-0 sm:rounded-md ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-brand-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

/** Mounted once (in the header): "+ New dashboard" from anywhere opens it. */
export function NewDashboardHost() {
  const req = useCreateDialog()
  if (!req) return null
  return <NewDashboardDialog key={`${req.mode}-${req.prompt ?? ''}`} initial={req} onClose={() => createDialog.close()} />
}

interface Draft {
  name: string
  icon: DashboardIcon
  color: DashboardColor
  scope: ProductId[]
  cards: DashboardCard[]
  origin: string
  matched?: string[]
}

function NewDashboardDialog({ initial, onClose }: { initial: CreateRequest; onClose: () => void }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<CreateRequest['mode']>(initial.mode)
  const [step, setStep] = useState<'start' | 'review'>('start')
  const [draft, setDraft] = useState<Draft | null>(null)
  // Describe it
  const [prompt, setPrompt] = useState(initial.prompt ?? '')
  const [busy, setBusy] = useState(false)
  // Blank
  const [blankScope, setBlankScope] = useState<ProductId[]>(['checking'])
  const [blankCards, setBlankCards] = useState<DashboardCard[]>([])

  const describe = (text: string) => {
    if (!text.trim() || busy) return
    setPrompt(text)
    setBusy(true)
    window.setTimeout(() => {
      const r = describeDashboard(text)
      setBusy(false)
      if (!r) return
      setDraft({ name: r.name, icon: 'star', color: 'blue', scope: r.scope, cards: r.cards, origin: `Described: “${text.trim()}”`, matched: r.matched })
      setStep('review')
    }, GENERATE_DELAY_MS)
  }
  useEffect(() => {
    // Opened from the home page's prompt bar with a request already typed.
    if (initial.mode === 'describe' && initial.prompt) describe(initial.prompt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const create = () => {
    if (!draft) return
    const d = dashboardStore.create({ name: draft.name, icon: draft.icon, color: draft.color, scope: draft.scope, cards: draft.cards, origin: draft.origin })
    onClose()
    navigate(`/d/${d.slug}`)
  }

  return (
    <Modal title="New dashboard" onClose={onClose} wide>
      {step === 'start' ? (
        <>
          <div role="tablist" aria-label="How to start" className="flex flex-wrap gap-2">
            {(
              [
                ['describe', 'Describe it'],
                ['template', 'From a template'],
                ['blank', 'Blank'],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${mode === m ? 'bg-brand-ink text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'describe' && (
            <form
              className="mt-4"
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                describe(prompt)
              }}
            >
              <p className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                <Sparkles className="h-4 w-4 text-brand-orange" aria-hidden />
                Ask AI to build a dashboard
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Simulated · runs locally</span>
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  aria-label="Describe the dashboard you want"
                  placeholder="e.g. Checking openings, daily pace and campaigns"
                  className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
                />
                <button type="submit" disabled={busy || !prompt.trim()} className="inline-flex items-center justify-center gap-1.5 rounded bg-brand-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
                  {busy ? 'Building…' : 'Build'}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => describe(s)} className="rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50">
                    {s}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Cards come only from approved data. Anything the data layer doesn’t have becomes a “Needs a data source” placeholder, never a number.
              </p>
            </form>
          )}

          {mode === 'template' && (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {TEMPLATES.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft({ name: t.name, icon: t.icon, color: t.color, scope: t.scope, cards: t.cards.map((c) => ({ ...c })), origin: `Template: ${t.name}` })
                      setStep('review')
                    }}
                    className="flex h-full w-full items-start gap-2 rounded border border-slate-200 p-3 text-left hover:border-brand-blue hover:bg-blue-50/40"
                  >
                    <DashboardIconBadge d={t} />
                    <span>
                      <span className="block text-sm font-semibold text-brand-ink">{t.name}</span>
                      <span className="block text-xs text-slate-600">{t.description}</span>
                      <span className="mt-1 block text-[11px] text-slate-500">
                        {scopeLabel(t.scope)} · {t.cards.length} cards
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {mode === 'blank' && (
            <div className="mt-4 space-y-3">
              <fieldset>
                <legend className="text-sm font-medium text-slate-700">Product scope</legend>
                <div className="mt-1 flex flex-wrap gap-3 text-sm">
                  {ALL.map((p) => (
                    <label key={p} className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={blankScope.includes(p)}
                        aria-label={`Include ${PRODUCT_NAME[p]}`}
                        onChange={(e) => {
                          const next = e.target.checked ? ALL.filter((x) => x === p || blankScope.includes(x)) : blankScope.filter((x) => x !== p)
                          setBlankScope(next)
                          setBlankCards((cs) => cs.filter((c) => cardCatalogue(next).some((x) => x.id === c.id)))
                        }}
                        className="accent-brand-blue"
                      />
                      {PRODUCT_NAME[p]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-sm font-medium text-slate-700">Tick the cards you want</legend>
                <div className="mt-1 grid max-h-64 gap-1 overflow-y-auto rounded border border-slate-200 p-2 text-sm sm:grid-cols-2">
                  {cardCatalogue(blankScope).map((c) => (
                    <label key={c.id} className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={blankCards.some((x) => x.id === c.id)}
                        aria-label={`Add ${cardTitle(c)}`}
                        onChange={(e) => setBlankCards((cs) => (e.target.checked ? [...cs, c] : cs.filter((x) => x.id !== c.id)))}
                        className="accent-brand-blue"
                      />
                      {cardTitle(c)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <button
                type="button"
                disabled={blankScope.length === 0 || blankCards.length === 0}
                onClick={() => {
                  setDraft({ name: `${scopeLabel(blankScope)} dashboard`, icon: 'star', color: 'slate', scope: blankScope, cards: blankCards, origin: 'Blank' })
                  setStep('review')
                }}
                className="rounded bg-brand-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                Next: name and preview
              </button>
            </div>
          )}
        </>
      ) : (
        draft && (
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Name</span>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                aria-label="Dashboard name"
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <p className="text-xs text-slate-600">
              {draft.origin} · {scopeLabel(draft.scope)} · owner: Product owner
              {draft.matched && draft.matched.length > 0 ? ` · matched ${draft.matched.join(', ')}` : ''}
            </p>
            <div>
              <p className="text-sm font-medium text-slate-700">Cards (review, reorder or remove)</p>
              <div className="mt-1">
                <CardListEditor cards={draft.cards} scope={draft.scope} onChange={(cards) => setDraft({ ...draft, cards })} />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Preview</p>
              <ul aria-label="Preview" className="mt-1 grid gap-2 sm:grid-cols-3">
                {draft.cards.map((c) => (
                  <li key={c.id} className={`rounded border p-2 text-xs ${c.type === 'placeholder' ? 'border-dashed border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                    {c.type === 'placeholder' ? `Needs a data source: ${c.request}` : cardTitle(c)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={create} disabled={!draft.name.trim() || draft.cards.length === 0} className="rounded bg-brand-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
                Create
              </button>
              <button type="button" onClick={() => setStep('start')} className="rounded border border-slate-300 px-4 py-2 text-sm">
                Back
              </button>
            </div>
          </div>
        )
      )}
    </Modal>
  )
}

/** "Edit cards" on an existing dashboard. */
export function EditCardsDialog({ dashboard, onClose }: { dashboard: Dashboard; onClose: () => void }) {
  const [cards, setCards] = useState(dashboard.cards)
  return (
    <Modal title={`Edit cards · ${dashboard.name}`} onClose={onClose}>
      <CardListEditor cards={cards} scope={dashboard.scope} onChange={setCards} />
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            dashboardStore.update(dashboard.id, { cards })
            onClose()
          }}
          className="rounded bg-brand-blue px-4 py-2 text-sm font-medium text-white"
        >
          Save cards
        </button>
        <button type="button" onClick={onClose} className="rounded border border-slate-300 px-4 py-2 text-sm">
          Cancel
        </button>
      </div>
    </Modal>
  )
}
