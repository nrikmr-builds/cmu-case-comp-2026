// Checking Insights is split into 5 workflow tabs, each at /opportunities/checking/<tab>. Every in-app link to a
// Checking section goes through checkingHref(), so it lands on the tab that holds the section.

export type CheckingTab = 'today' | 'diagnose' | 'act' | 'market' | 'report'

export const CHECKING_TABS: { id: CheckingTab; label: string; blurb: string }[] = [
  { id: 'today', label: 'Today', blurb: 'What changed and what needs action now' },
  { id: 'diagnose', label: 'Diagnose', blurb: 'Segments, account health and early-warning signals' },
  { id: 'act', label: 'Act', blurb: 'Design, track and plan campaigns' },
  { id: 'market', label: 'Market', blurb: 'Competitor offers and market context' },
  { id: 'report', label: 'Report', blurb: 'Weekly leadership report' },
]

export const DEFAULT_TAB: CheckingTab = 'today'
export const CHECKING_BASE = '/opportunities/checking'

export const isCheckingTab = (t: string | undefined): t is CheckingTab => CHECKING_TABS.some((x) => x.id === t)

/** Which tab holds an element id. Prefixes cover per-row anchors such as #segment-…, #risk-… and #signal-…. */
const ANCHORS: [CheckingTab, (id: string) => boolean][] = [
  ['today', (id) => ['since-heading', 'gap-heading', 'daily-heading', 'act-now-heading'].includes(id)],
  [
    'diagnose',
    (id) =>
      ['segments-heading', 'insight-heading', 'activation-heading', 'health-heading', 'signals-heading', 'risk-segments-heading', 'fee-heading', 'cross-product-heading'].includes(id) ||
      /^(segment|history|signal|risk)-/.test(id),
  ],
  ['act', (id) => ['campaigns-heading', 'tracker-heading', 'totals-heading', 'planner-heading', 'nba-heading'].includes(id)],
  ['market', (id) => ['market-heading', 'offers-heading'].includes(id)],
  ['report', (id) => ['report-tab-heading', 'reports-history-heading'].includes(id)],
]

export function tabForAnchor(id: string): CheckingTab | undefined {
  return ANCHORS.find(([, test]) => test(id))?.[0]
}

export const tabPath = (tab: CheckingTab) => `${CHECKING_BASE}/${tab}`

/** "/opportunities/checking/act#tracker-heading". Unknown anchors fall back to the default tab. */
export function checkingHref(anchor: string): string {
  return `${tabPath(tabForAnchor(anchor) ?? DEFAULT_TAB)}#${anchor}`
}
