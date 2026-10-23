// Saved campaigns, kept in this browser. Stores the builder's inputs (not results), so results are always
// recomputed from the current data; the Campaign Tracker (Phase 4) reads the same store.
import { useSyncExternalStore } from 'react'
import type { CampaignInputs } from './campaignEconomics'

export type CampaignStatus = 'draft' | 'live' | 'completed'

export const CAMPAIGN_STATUSES: { id: CampaignStatus; label: string }[] = [
  { id: 'draft', label: 'Draft' },
  { id: 'live', label: 'Live' },
  { id: 'completed', label: 'Completed' },
]

export interface SavedCampaign {
  id: string
  status: CampaignStatus
  /** ISO timestamps. */
  createdAt: string
  updatedAt: string
  inputs: CampaignInputs
}

// v2: inputs gained baseline rate, outcome type and cross-sell fields; v1 drafts are ignored.
const KEY = 'pih.campaigns.v2'
const CHANGE_EVENT = 'pih:campaigns-changed'
let cache: SavedCampaign[] | null = null

function load(): SavedCampaign[] {
  if (cache) return cache
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    cache = Array.isArray(parsed) ? (parsed as SavedCampaign[]) : []
  } catch {
    cache = []
  }
  return cache
}

function save(campaigns: SavedCampaign[]) {
  cache = campaigns
  try {
    localStorage.setItem(KEY, JSON.stringify(campaigns))
  } catch {
    // Storage unavailable: campaigns last for this page view only.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => window.removeEventListener(CHANGE_EVENT, onChange)
}

export function useCampaigns() {
  const campaigns = useSyncExternalStore(subscribe, load)
  return {
    /** Newest first. */
    campaigns: [...campaigns].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    saveCampaign: (inputs: CampaignInputs, status: CampaignStatus, id?: string) => {
      const now = new Date().toISOString()
      const existing = id ? campaigns.find((c) => c.id === id) : undefined
      const next: SavedCampaign = existing
        ? { ...existing, inputs, status, updatedAt: now }
        : { id: `campaign-${Date.now()}`, status, createdAt: now, updatedAt: now, inputs }
      save(existing ? campaigns.map((c) => (c.id === next.id ? next : c)) : [...campaigns, next])
      return next
    },
    setStatus: (id: string, status: CampaignStatus) =>
      save(campaigns.map((c) => (c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c))),
    deleteCampaign: (id: string) => save(campaigns.filter((c) => c.id !== id)),
  }
}
