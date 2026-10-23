// Dashboards as first-class objects: one per question or project, each an ordered list of cards built from the
// existing components. Kept in this browser under pih.dashboards.v1 (try/catch, so the page works with storage
// empty or blocked). The built-in "Deposit Portfolio (default)" is the original home page and can't be deleted.
import { useSyncExternalStore } from 'react'
import { opportunities } from '../data/opportunities'
import { products } from '../data/productMetrics'
import type { KpiStatus, ProductId } from '../types'
import { generateView } from './dashboardPrompt'

export type CardType =
  | 'kpi'
  | 'product'
  | 'what-changed'
  | 'alerts'
  | 'gap'
  | 'daily'
  | 'tracker'
  | 'planner'
  | 'nba'
  | 'offers'
  | 'report'
  | 'placeholder'

export interface DashboardCard {
  id: string
  type: CardType
  kpiId?: string
  productId?: ProductId
  /** Placeholder only: the metric the request asked for that the data layer doesn't have. */
  request?: string
}

export type DashboardIcon = 'layout' | 'sun' | 'shield' | 'piggy' | 'smartphone' | 'briefcase' | 'star'
export type DashboardColor = 'blue' | 'orange' | 'green' | 'slate' | 'purple'

export interface Dashboard {
  id: string
  slug: string
  name: string
  icon: DashboardIcon
  color: DashboardColor
  /** Products the dashboard covers. */
  scope: ProductId[]
  cards: DashboardCard[]
  /** Optional status filter for KPI and product cards (e.g. only At Risk + Watch). */
  filter?: KpiStatus[]
  /** A role, never a person's name. */
  owner: 'Product owner'
  createdAt: string
  updatedAt: string
  pinned: boolean
  builtIn?: boolean
  /** Seeded demo dashboards, labelled "Example · illustrative". */
  example?: boolean
  /** The request or template it was created from. */
  origin?: string
}

const ALL_PRODUCTS: ProductId[] = ['checking', 'savings', 'cd']
export const PRODUCT_NAME: Record<ProductId, string> = { checking: 'Checking', savings: 'Savings', cd: 'CD' }

// --- Card catalogue --------------------------------------------------------------------------------------

export const CARD_LABEL: Record<CardType, string> = {
  kpi: 'KPI',
  product: 'Product card',
  'what-changed': 'What changed',
  alerts: 'Alerts',
  gap: 'Gap Summary',
  daily: 'Daily Openings',
  tracker: 'Campaign Tracker summary',
  planner: 'Scenario Planner summary',
  nba: 'Next-best-action roll-up',
  offers: 'Market offers ending soon',
  report: 'Weekly-report button',
  placeholder: 'Needs a data source',
}

/** Cards that only exist for Checking data. */
export const CHECKING_ONLY: CardType[] = ['daily', 'tracker', 'planner', 'nba', 'alerts', 'offers']

export const cardKey = (c: Omit<DashboardCard, 'id'>) => [c.type, c.kpiId ?? c.productId ?? c.request ?? ''].filter(Boolean).join(':')

const card = (c: Omit<DashboardCard, 'id'>): DashboardCard => ({ id: cardKey(c), ...c })

export function cardTitle(c: DashboardCard): string {
  if (c.type === 'kpi') {
    const k = products.flatMap((p) => p.kpis).find((x) => x.id === c.kpiId)
    return k ? `${PRODUCT_NAME[k.productId]} · ${k.label}` : 'KPI'
  }
  if (c.type === 'product' || c.type === 'gap') return `${CARD_LABEL[c.type]} · ${PRODUCT_NAME[c.productId ?? 'checking']}`
  if (c.type === 'placeholder') return `Needs a data source · ${c.request}`
  return CARD_LABEL[c.type]
}

/** Every card that can be added for a scope, in a stable order. */
export function cardCatalogue(scope: ProductId[]): DashboardCard[] {
  const out: DashboardCard[] = [card({ type: 'what-changed' })]
  for (const p of ALL_PRODUCTS.filter((x) => scope.includes(x))) {
    out.push(card({ type: 'product', productId: p }), card({ type: 'gap', productId: p }))
    for (const k of products.find((x) => x.id === p)?.kpis ?? []) out.push(card({ type: 'kpi', kpiId: k.id }))
  }
  if (scope.includes('checking')) for (const t of CHECKING_ONLY) out.push(card({ type: t }))
  out.push(card({ type: 'report' }))
  return out
}

// --- Built-in, templates, examples -----------------------------------------------------------------------

export const BUILT_IN: Dashboard = {
  id: 'deposit-portfolio',
  slug: 'deposit-portfolio',
  name: 'Deposit Portfolio (default)',
  icon: 'layout',
  color: 'blue',
  scope: ALL_PRODUCTS,
  // The original home page; listed as its product cards (all 10 KPIs) for reports and the switcher.
  cards: [card({ type: 'what-changed' }), ...ALL_PRODUCTS.map((p) => card({ type: 'product', productId: p })), card({ type: 'report' })],
  owner: 'Product owner',
  createdAt: '2026-07-01T09:00:00',
  updatedAt: '2026-09-12T09:00:00',
  pinned: true,
  builtIn: true,
}

export interface DashboardTemplate {
  id: string
  name: string
  description: string
  icon: DashboardIcon
  color: DashboardColor
  scope: ProductId[]
  cards: DashboardCard[]
}

export const TEMPLATES: DashboardTemplate[] = [
  {
    id: 'checking-daily',
    name: 'Checking PO · daily',
    description: 'What changed, alerts, the openings gap and daily pace, campaigns, the planner and next best action.',
    icon: 'sun',
    color: 'orange',
    scope: ['checking'],
    cards: [
      card({ type: 'what-changed' }),
      card({ type: 'alerts' }),
      card({ type: 'kpi', kpiId: 'checking-new-accounts' }),
      card({ type: 'gap', productId: 'checking' }),
      card({ type: 'daily' }),
      card({ type: 'tracker' }),
      card({ type: 'planner' }),
      card({ type: 'nba' }),
      card({ type: 'offers' }),
      card({ type: 'report' }),
    ],
  },
  {
    id: 'retention-watch',
    name: 'Retention watch',
    description: 'Activity and primacy, alerts, next best action for leaving customers, and competitor offers ending soon.',
    icon: 'shield',
    color: 'purple',
    scope: ['checking'],
    cards: [
      card({ type: 'alerts' }),
      card({ type: 'kpi', kpiId: 'checking-active-rate' }),
      card({ type: 'kpi', kpiId: 'checking-primacy-rate' }),
      card({ type: 'nba' }),
      card({ type: 'tracker' }),
      card({ type: 'offers' }),
      card({ type: 'report' }),
    ],
  },
  {
    id: 'savings-cd',
    name: 'Savings & CD growth',
    description: 'Savings and CD product cards with each product’s openings gap.',
    icon: 'piggy',
    color: 'green',
    scope: ['savings', 'cd'],
    cards: [
      card({ type: 'product', productId: 'savings' }),
      card({ type: 'product', productId: 'cd' }),
      card({ type: 'gap', productId: 'savings' }),
      card({ type: 'gap', productId: 'cd' }),
      card({ type: 'report' }),
    ],
  },
  {
    id: 'digital',
    name: 'Digital adoption',
    description: 'Digital opening completion (Checking) and digital enrollment (Savings).',
    icon: 'smartphone',
    color: 'slate',
    scope: ['checking', 'savings'],
    cards: [
      card({ type: 'kpi', kpiId: 'checking-digital-completion' }),
      card({ type: 'kpi', kpiId: 'savings-digital-enrollment' }),
      card({ type: 'what-changed' }),
      card({ type: 'report' }),
    ],
  },
  {
    id: 'leadership',
    name: 'Leadership weekly',
    description: 'All three products, what changed, where Q3 lands, next best action and the weekly report.',
    icon: 'briefcase',
    color: 'blue',
    scope: ALL_PRODUCTS,
    cards: [
      card({ type: 'product', productId: 'checking' }),
      card({ type: 'product', productId: 'savings' }),
      card({ type: 'product', productId: 'cd' }),
      card({ type: 'what-changed' }),
      card({ type: 'planner' }),
      card({ type: 'nba' }),
      card({ type: 'report' }),
    ],
  },
]

function fromTemplate(t: DashboardTemplate, extra: Partial<Dashboard>): Dashboard {
  return {
    id: extra.id ?? `dash-${t.id}`,
    slug: extra.slug ?? slugify(t.name),
    name: t.name,
    icon: t.icon,
    color: t.color,
    scope: t.scope,
    cards: t.cards.map((c) => ({ ...c })),
    owner: 'Product owner',
    createdAt: '2026-09-10T09:00:00',
    updatedAt: '2026-09-10T09:00:00',
    pinned: false,
    origin: `Template: ${t.name}`,
    ...extra,
  }
}

const template = (id: string) => TEMPLATES.find((t) => t.id === id) as DashboardTemplate

/** Seeded so the switcher isn't empty in a demo. */
export const EXAMPLES: Dashboard[] = [
  fromTemplate(template('checking-daily'), { id: 'example-checking-daily', slug: 'checking-po-daily', example: true, pinned: true, createdAt: '2026-09-08T09:00:00', updatedAt: '2026-09-08T09:00:00' }),
  fromTemplate(template('retention-watch'), { id: 'example-retention-watch', slug: 'retention-watch', example: true, createdAt: '2026-09-09T09:00:00', updatedAt: '2026-09-09T09:00:00' }),
  fromTemplate(template('leadership'), { id: 'example-leadership-weekly', slug: 'leadership-weekly', example: true, createdAt: '2026-09-11T09:00:00', updatedAt: '2026-09-11T09:00:00' }),
]

// --- Describe it: map a plain-English request to cards ---------------------------------------------------

const CARD_RULES: { pattern: RegExp; type: CardType; productId?: ProductId }[] = [
  { pattern: /what changed|since (my|the) last|changes/i, type: 'what-changed' },
  { pattern: /alert/i, type: 'alerts' },
  { pattern: /\bgap\b|short of|how far/i, type: 'gap', productId: 'checking' },
  { pattern: /daily|per day|pace/i, type: 'daily' },
  { pattern: /campaign|promotion|tracker|lift/i, type: 'tracker' },
  { pattern: /planner|scenario|re-?forecast|where .* land/i, type: 'planner' },
  { pattern: /next best action|personali[sz]|nba|offer for each/i, type: 'nba' },
  { pattern: /competitor|offers? ending|expir|market/i, type: 'offers' },
  { pattern: /report|leadership|weekly/i, type: 'report' },
]

/** Metrics people ask for that the data layer doesn't have. They become placeholders, never numbers. */
const UNKNOWN_METRICS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bnps\b|net promoter/i, label: 'Net Promoter Score' },
  { pattern: /satisfaction|\bcsat\b/i, label: 'Customer satisfaction' },
  { pattern: /app (store )?rating/i, label: 'App store rating' },
  { pattern: /call (centre|center)|call volume|wait time/i, label: 'Call-centre volume' },
  { pattern: /complaint (volume|count|rate)|number of complaints/i, label: 'Complaint volume' },
  { pattern: /fraud/i, label: 'Fraud losses' },
  { pattern: /mortgage/i, label: 'Mortgage applications' },
  { pattern: /credit card/i, label: 'Credit card balances' },
  { pattern: /\bloans?\b/i, label: 'Loan originations' },
  { pattern: /market share/i, label: 'Market share' },
  { pattern: /marketing spend|ad spend/i, label: 'Marketing spend' },
]

export interface DescribeResult {
  name: string
  scope: ProductId[]
  cards: DashboardCard[]
  /** Which parts of the request matched, for the review step. */
  matched: string[]
}

export function describeDashboard(request: string): DescribeResult | null {
  const text = request.trim()
  if (!text) return null
  const view = generateView(text)
  const kpiIds = view?.kpiIds ?? []
  const out: DashboardCard[] = []
  const matched: string[] = []
  // A product whose every KPI matched becomes a product card; otherwise one card per KPI.
  for (const p of products) {
    const ids = p.kpis.map((k) => k.id).filter((id) => kpiIds.includes(id))
    if (ids.length === 0) continue
    if (ids.length === p.kpis.length) out.push(card({ type: 'product', productId: p.id }))
    else ids.forEach((id) => out.push(card({ type: 'kpi', kpiId: id })))
  }
  if (view) matched.push(`KPIs: ${view.label}`)
  const scope: ProductId[] = ALL_PRODUCTS.filter((p) => out.some((c) => c.productId === p || c.kpiId?.startsWith(`${p}-`)))
  for (const r of CARD_RULES) {
    if (!r.pattern.test(text)) continue
    if (CHECKING_ONLY.includes(r.type) || r.type === 'gap') {
      if (!scope.includes('checking')) scope.push('checking')
    }
    const c = card({ type: r.type, productId: r.type === 'gap' ? r.productId : undefined })
    if (!out.some((x) => x.id === c.id)) {
      out.push(c)
      matched.push(CARD_LABEL[r.type])
    }
  }
  for (const u of UNKNOWN_METRICS) {
    if (u.pattern.test(text)) out.push(card({ type: 'placeholder', request: u.label }))
  }
  // Nothing recognised at all: keep the request as one placeholder rather than guessing.
  if (out.length === 0) out.push(card({ type: 'placeholder', request: text.slice(0, 60) }))
  return {
    name: view?.label ?? (text.length > 40 ? `${text.slice(0, 40)}…` : text),
    scope: scope.length ? ALL_PRODUCTS.filter((p) => scope.includes(p)) : ALL_PRODUCTS,
    cards: out,
    matched,
  }
}

// --- KPIs a dashboard covers (for its weekly report) --------------------------------------------------------

export function dashboardKpiIds(d: Dashboard): string[] {
  const ids = new Set<string>()
  for (const c of d.cards) {
    if (c.type === 'kpi' && c.kpiId) ids.add(c.kpiId)
    if (c.type === 'product' && c.productId) products.find((p) => p.id === c.productId)?.kpis.forEach((k) => ids.add(k.id))
    if (c.type === 'gap' && c.productId) ids.add(opportunities.find((o) => o.productId === c.productId)?.focusKpiId ?? '')
    if (c.type === 'daily') ids.add('checking-new-accounts')
  }
  ids.delete('')
  // Keep the products' own order.
  return products.flatMap((p) => p.kpis.map((k) => k.id)).filter((id) => ids.has(id))
}

/** Whether the Checking narrative sections (changes, campaigns, risks, decisions) belong in this dashboard's report. */
export const coversChecking = (d: Dashboard) =>
  d.cards.some((c) => CHECKING_ONLY.includes(c.type) || c.type === 'what-changed' || c.productId === 'checking' || c.kpiId?.startsWith('checking-'))

export function scopeLabel(scope: ProductId[]): string {
  if (scope.length === ALL_PRODUCTS.length) return 'All products'
  return scope.map((p) => PRODUCT_NAME[p]).join(' + ')
}

// --- Store ------------------------------------------------------------------------------------------------

const KEY = 'pih.dashboards.v1'
const CHANGE_EVENT = 'pih:dashboards-changed'
const RECENT_MAX = 5

interface State {
  /** User and example dashboards (the built-in one is not stored). */
  dashboards: Dashboard[]
  /** Which dashboard "/" opens. */
  landingId: string
  /** Most recently opened first. */
  recent: string[]
  builtInPinned: boolean
}

const seed = (): State => ({ dashboards: EXAMPLES.map((d) => ({ ...d, cards: d.cards.map((c) => ({ ...c })) })), landingId: BUILT_IN.id, recent: [], builtInPinned: true })
let cache: State | null = null

function load(): State {
  if (cache) return cache
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? 'null') as State | null
    cache = parsed && Array.isArray(parsed.dashboards) ? { ...seed(), ...parsed } : seed()
  } catch {
    cache = seed()
  }
  return cache
}

function save(next: State) {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage blocked or full: dashboards last for this page view only.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => window.removeEventListener(CHANGE_EVENT, onChange)
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'dashboard'
  )
}

function uniqueSlug(name: string, taken: string[], own?: string): string {
  const base = slugify(name)
  let slug = base
  for (let i = 2; taken.some((s) => s === slug && s !== own); i++) slug = `${base}-${i}`
  return slug
}

export function allDashboards(state = load()): Dashboard[] {
  return [{ ...BUILT_IN, pinned: state.builtInPinned }, ...state.dashboards]
}

export const findBySlug = (slug: string, state = load()) => allDashboards(state).find((d) => d.slug === slug)
export const findById = (id: string, state = load()) => allDashboards(state).find((d) => d.id === id)
export const landingDashboard = (state = load()) => findById(state.landingId, state) ?? BUILT_IN
export const dashboardPath = (d: Pick<Dashboard, 'slug' | 'id'>, state = load()) => (d.id === state.landingId ? '/' : `/d/${d.slug}`)

export interface NewDashboard {
  name: string
  icon?: DashboardIcon
  color?: DashboardColor
  scope: ProductId[]
  cards: DashboardCard[]
  filter?: KpiStatus[]
  origin?: string
}

export const dashboardStore = {
  get: load,
  create(input: NewDashboard): Dashboard {
    const s = load()
    const now = new Date().toISOString()
    const name = input.name.trim() || 'Untitled dashboard'
    const d: Dashboard = {
      id: `dash-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      slug: uniqueSlug(name, allDashboards(s).map((x) => x.slug)),
      name,
      icon: input.icon ?? 'star',
      color: input.color ?? 'blue',
      scope: input.scope.length ? input.scope : ALL_PRODUCTS,
      cards: input.cards,
      filter: input.filter,
      owner: 'Product owner',
      createdAt: now,
      updatedAt: now,
      pinned: false,
      origin: input.origin,
    }
    save({ ...s, dashboards: [...s.dashboards, d] })
    return d
  },
  update(id: string, patch: Partial<Pick<Dashboard, 'name' | 'cards' | 'filter' | 'scope' | 'icon' | 'color'>>) {
    const s = load()
    if (id === BUILT_IN.id) return
    save({
      ...s,
      dashboards: s.dashboards.map((d) =>
        d.id === id
          ? {
              ...d,
              ...patch,
              slug: patch.name ? uniqueSlug(patch.name, allDashboards(s).map((x) => x.slug), d.slug) : d.slug,
              updatedAt: new Date().toISOString(),
            }
          : d,
      ),
    })
  },
  duplicate(id: string): Dashboard | undefined {
    const src = findById(id)
    if (!src) return undefined
    return dashboardStore.create({
      name: `${src.name.replace(/ \(default\)$/, '')} (copy)`,
      icon: src.icon,
      color: src.color,
      scope: src.scope,
      cards: src.cards.map((c) => ({ ...c })),
      filter: src.filter,
      origin: `Duplicate of ${src.name}`,
    })
  },
  setPinned(id: string, pinned: boolean) {
    const s = load()
    if (id === BUILT_IN.id) save({ ...s, builtInPinned: pinned })
    else save({ ...s, dashboards: s.dashboards.map((d) => (d.id === id ? { ...d, pinned } : d)) })
  },
  setLanding(id: string) {
    save({ ...load(), landingId: id })
  },
  remove(id: string) {
    const s = load()
    if (id === BUILT_IN.id) return
    save({
      ...s,
      dashboards: s.dashboards.filter((d) => d.id !== id),
      recent: s.recent.filter((r) => r !== id),
      landingId: s.landingId === id ? BUILT_IN.id : s.landingId,
    })
  },
  markOpened(id: string) {
    const s = load()
    if (s.recent[0] === id) return
    save({ ...s, recent: [id, ...s.recent.filter((r) => r !== id)].slice(0, RECENT_MAX) })
  },
}

export function useDashboards() {
  const state = useSyncExternalStore(subscribe, load)
  return { state, all: allDashboards(state), landing: landingDashboard(state) }
}

// --- Switcher sections -------------------------------------------------------------------------------------

const groupOf = (d: Dashboard) => (d.scope.length === 1 ? scopeLabel(d.scope) : 'Multi-product')
const GROUP_ORDER = ['Checking', 'Savings', 'CD', 'Multi-product']

interface Section {
  title: string
  items: Dashboard[]
}

/** Builds the switcher's sections: search results, or Pinned, Recent (last 5) and All grouped by product scope. */
export function switcherSections(all: Dashboard[], recentIds: string[], query: string): Section[] {
  const q = query.trim().toLowerCase()
  if (q) {
    const hits = all.filter((d) => `${d.name} ${scopeLabel(d.scope)} ${d.origin ?? ''}`.toLowerCase().includes(q))
    return [{ title: `Results (${hits.length})`, items: hits }]
  }
  const recent = recentIds.map((id) => all.find((d) => d.id === id)).filter((d): d is Dashboard => !!d)
  const groups = GROUP_ORDER.map((g) => {
    const items = all.filter((d) => groupOf(d) === g).sort((a, b) => a.name.localeCompare(b.name))
    return { title: `${g} (${items.length})`, items }
  }).filter((s) => s.items.length > 0)
  return [
    { title: 'Pinned', items: all.filter((d) => d.pinned) },
    { title: 'Recent', items: recent },
    ...groups.map((g) => ({ ...g, title: `All · ${g.title}` })),
  ].filter((s) => s.items.length > 0)
}


// --- "+ New dashboard" dialog: opened from the header, the home page or the switcher ------------------------

export interface CreateRequest {
  mode: 'describe' | 'template' | 'blank'
  prompt?: string
}
const OPEN_EVENT = 'pih:new-dashboard'
let createRequest: CreateRequest | null = null

export const createDialog = {
  open(req: CreateRequest = { mode: 'describe' }) {
    createRequest = req
    window.dispatchEvent(new Event(OPEN_EVENT))
  },
  close() {
    createRequest = null
    window.dispatchEvent(new Event(OPEN_EVENT))
  },
}

export function useCreateDialog(): CreateRequest | null {
  return useSyncExternalStore(
    (l) => {
      window.addEventListener(OPEN_EVENT, l)
      return () => window.removeEventListener(OPEN_EVENT, l)
    },
    () => createRequest,
  )
}

// --- Switcher open state (header button, ⌘K, the tour and figure export) -------------------------------------

const SWITCHER_EVENT = 'pih:switcher'
let switcherOpen = false
export const switcher = {
  set(open: boolean) {
    switcherOpen = open
    window.dispatchEvent(new Event(SWITCHER_EVENT))
  },
}
export function useSwitcherOpen(): boolean {
  return useSyncExternalStore(
    (l) => {
      window.addEventListener(SWITCHER_EVENT, l)
      return () => window.removeEventListener(SWITCHER_EVENT, l)
    },
    () => switcherOpen,
  )
}
