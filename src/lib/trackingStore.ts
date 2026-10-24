// Per-browser state for daily tracking: alert rules and the last-visit time. Everything is wrapped in
// try/catch so the page still renders (with defaults) when storage is blocked or empty.
import { useSyncExternalStore } from 'react'
import { DEFAULT_ALERT_RULES, evaluateRule, type AlertRule } from './dailyTracking'

// v2: rule 1 became "7-day average below plan pace"; older saved rules are ignored.
const RULES_KEY = 'pih.alertRules.v2'
const LAST_VISIT_KEY = 'pih.lastVisit'
const CHANGE_EVENT = 'pih:tracking-changed'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage unavailable (private mode): changes last for this page view only.
  }
}

// --- Alert rules ---

let rulesCache: AlertRule[] | null = null

function loadRules(): AlertRule[] {
  if (rulesCache) return rulesCache
  try {
    const parsed: unknown = JSON.parse(read(RULES_KEY) ?? 'null')
    rulesCache = Array.isArray(parsed) ? (parsed as AlertRule[]) : DEFAULT_ALERT_RULES
  } catch {
    rulesCache = DEFAULT_ALERT_RULES
  }
  return rulesCache
}

function setRules(rules: AlertRule[]) {
  rulesCache = rules
  write(RULES_KEY, JSON.stringify(rules))
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => window.removeEventListener(CHANGE_EVENT, onChange)
}

export function useAlertRules() {
  const rules = useSyncExternalStore(subscribe, loadRules)
  return {
    rules,
    results: rules.map(evaluateRule),
    addRule: (rule: AlertRule) => setRules([...rules, rule]),
    updateRule: (rule: AlertRule) => setRules(rules.map((r) => (r.id === rule.id ? rule : r))),
    deleteRule: (id: string) => setRules(rules.filter((r) => r.id !== id)),
    resetRules: () => setRules(DEFAULT_ALERT_RULES),
  }
}

/** Enabled rules that are triggered right now (for the nav badge and the strip). */
export function useTriggeredAlerts() {
  const { results } = useAlertRules()
  return results.filter((r) => r.rule.enabled && r.triggered)
}

// --- Last visit ---

/** Stored last-visit time, or null on a first visit. Kept until the Product Owner marks changes as seen. */
export function getLastVisit(): string | null {
  return read(LAST_VISIT_KEY)
}

export function markVisitSeen(now = new Date()) {
  write(LAST_VISIT_KEY, now.toISOString())
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function useLastVisit() {
  return useSyncExternalStore(subscribe, getLastVisit)
}
