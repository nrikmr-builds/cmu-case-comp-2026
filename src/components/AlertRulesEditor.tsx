import { Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { dropOffSignals } from '../data/checkingHealth'
import type { AlertRule } from '../lib/dailyTracking'
import { useAlertRules } from '../lib/trackingStore'

const input =
  'rounded border border-slate-300 px-2 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-blue'
const iconButton =
  'inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs font-medium text-brand-blue hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-blue'

/** Add, edit, turn off, and delete alert rules. Rules are evaluated against the current data right away. */
export default function AlertRulesEditor() {
  const { results, addRule, updateRule, deleteRule, resetRules } = useAlertRules()
  const [newKind, setNewKind] = useState<AlertRule['kind']>('flags-week-over-week')

  function add() {
    const id = `rule-${Date.now()}`
    addRule(
      newKind === 'openings-below-pace'
        ? { id, kind: 'openings-below-pace', enabled: true, days: 3 }
        : { id, kind: 'flags-week-over-week', enabled: true, signalId: dropOffSignals[0].id, thresholdPct: 15 },
    )
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {results.map(({ rule, triggered, title, evidence }) => (
          <li key={rule.id} className="rounded-md border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) => updateRule({ ...rule, enabled: e.target.checked })}
                  aria-label={`Rule on: ${title}`}
                  className="h-4 w-4 accent-brand-blue"
                />
                <span className="font-medium text-brand-ink">{title}</span>
              </label>
              {!rule.enabled ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Off</span>
              ) : triggered ? (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">Triggered</span>
              ) : (
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Not triggered</span>
              )}
              <button type="button" onClick={() => deleteRule(rule.id)} className={`${iconButton} ml-auto`} aria-label={`Delete rule: ${title}`}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Delete
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              {rule.kind === 'openings-below-pace' ? (
                <label className="inline-flex items-center gap-1">
                  Days in a row
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={rule.days}
                    onChange={(e) => updateRule({ ...rule, days: Math.max(1, Number(e.target.value) || 1) })}
                    className={`${input} w-16`}
                  />
                </label>
              ) : (
                <>
                  <label className="inline-flex items-center gap-1">
                    Signal
                    <select
                      value={rule.signalId}
                      onChange={(e) => updateRule({ ...rule, signalId: e.target.value })}
                      className={input}
                    >
                      {dropOffSignals.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="inline-flex items-center gap-1">
                    Up more than
                    <input
                      type="number"
                      min={0}
                      max={500}
                      value={rule.thresholdPct}
                      onChange={(e) => updateRule({ ...rule, thresholdPct: Math.max(0, Number(e.target.value) || 0) })}
                      className={`${input} w-16`}
                    />
                    % week over week
                  </label>
                </>
              )}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">{evidence}</p>
          </li>
        ))}
        {results.length === 0 && <li className="text-sm text-slate-500">No alert rules. Add one below.</li>}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-1.5 text-sm text-slate-700">
          New rule
          <select value={newKind} onChange={(e) => setNewKind(e.target.value as AlertRule['kind'])} className={input}>
            <option value="flags-week-over-week">Early-warning flags up week over week</option>
            <option value="openings-below-pace">Daily openings below required pace</option>
          </select>
        </label>
        <button type="button" onClick={add} className={iconButton}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add rule
        </button>
        <button type="button" onClick={resetRules} className={iconButton}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Restore default rules
        </button>
      </div>
    </div>
  )
}
