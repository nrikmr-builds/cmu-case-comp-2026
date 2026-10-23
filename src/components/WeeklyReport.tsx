import { Check, ClipboardCopy, Printer, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { formatTimestamp } from '../lib/metrics'
import { formatDate } from '../lib/projection'
import { useReports } from '../lib/reportStore'
import { NOT_ON_DASHBOARD, reportToMarkdown, type ReportSnapshot } from '../lib/weeklyReport'

/** Print rules: only the report prints, at most 2 pages, no nav/buttons, no breaks inside tables. */
const PRINT_CSS = `
@media print {
  @page { size: letter; margin: 12mm 12mm 16mm; }
  body.report-open > #root { display: none !important; }
  body.report-open { background: #fff !important; }
  .report-overlay { position: static !important; overflow: visible !important; background: #fff !important; }
  .report-overlay .no-print { display: none !important; }
  .report-page { max-width: none !important; padding: 0 !important; box-shadow: none !important; border: 0 !important; font-size: 9.5px !important; line-height: 1.35 !important; }
  .report-page h1 { font-size: 15px !important; }
  .report-page h2 { font-size: 11px !important; margin-top: 8px !important; }
  .report-page table, .report-page li, .report-page .avoid-break { break-inside: avoid; page-break-inside: avoid; }
  .report-page td, .report-page th { padding-top: 1px !important; padding-bottom: 1px !important; }
  .report-page textarea { border: 0 !important; resize: none !important; padding: 0 !important; height: auto !important; overflow: visible !important; }
  .report-footer { display: block !important; position: fixed; bottom: 4mm; left: 12mm; right: 12mm; font-size: 8px; color: #475569; border-top: 1px solid #cbd5e1; padding-top: 2px; }
}
`

interface Props {
  report: ReportSnapshot
  onClose: () => void
}

/** Shows a report snapshot. A saved report reopens exactly as generated; only the decisions text is editable. */
export default function WeeklyReport({ report, onClose }: Props) {
  const { saveReport, isSaved } = useReports()
  const [decisions, setDecisions] = useState(report.decisions)
  const [status, setStatus] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const saved = isSaved(report.id)
  const current: ReportSnapshot = { ...report, decisions }

  useEffect(() => {
    document.body.classList.add('report-open')
    document.body.style.overflow = 'hidden'
    headingRef.current?.focus()
    const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('report-open')
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  async function copy() {
    const text = reportToMarkdown(current)
    try {
      await navigator.clipboard.writeText(text)
      setStatus('Copied as Markdown.')
    } catch {
      // Fallback for browsers that block the async clipboard.
      const area = document.createElement('textarea')
      area.value = text
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      area.remove()
      setStatus(ok ? 'Copied as Markdown.' : 'Copy failed: select the text and copy it manually.')
    }
  }

  const button =
    'inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue'

  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="report-heading" className="report-overlay fixed inset-0 z-50 overflow-y-auto bg-surface">
      <style>{PRINT_CSS}</style>
      <div className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <span className="text-sm text-slate-600">
            {saved ? 'Saved report (frozen snapshot)' : 'New report (not saved yet)'} · generated {formatTimestamp(report.generatedAt)}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => { saveReport(current); setStatus(saved ? 'Changes saved.' : 'Saved to Reports history.') }} className={button}>
              <Check className="h-4 w-4" aria-hidden /> {saved ? 'Save changes' : 'Save report'}
            </button>
            <button type="button" onClick={() => window.print()} className={button}>
              <Printer className="h-4 w-4" aria-hidden /> Print / PDF
            </button>
            <button type="button" onClick={copy} className={button}>
              <ClipboardCopy className="h-4 w-4" aria-hidden /> Copy as Markdown
            </button>
            <button type="button" onClick={onClose} className={button}>
              <X className="h-4 w-4" aria-hidden /> Close
            </button>
          </div>
        </div>
        {status && (
          <p role="status" className="mx-auto max-w-4xl px-4 pb-2 text-sm font-medium text-green-700">
            {status}
          </p>
        )}
      </div>

      <article className="report-page mx-auto my-6 max-w-4xl space-y-4 rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-800 shadow-sm">
        <header className="border-b border-slate-200 pb-3">
          <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            PNC Product Intelligence Hub · {report.dashboard ? `Dashboard: ${report.dashboard.name}` : 'Checking'}
          </p>
          <h1 id="report-heading" ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-brand-ink outline-none">
            Weekly report{report.dashboard ? ` · ${report.dashboard.name}` : ''} · {report.quarter}
          </h1>
          {report.dashboard && (
            <p className="text-xs text-slate-600">
              Covers only this dashboard&apos;s cards: {report.dashboard.kpiCount} KPI{report.dashboard.kpiCount === 1 ? '' : 's'}
              {report.dashboard.checkingSections ? ', plus the Checking campaigns, risks and decisions.' : '.'}
            </p>
          )}
          <p className="text-xs text-slate-600">
            Generated {formatTimestamp(report.generatedAt)} · <strong>Internal data as of {formatDate(report.internalAsOf)}</strong> · Illustrative
          </p>
          <p className="avoid-break mt-2 rounded bg-orange-50 p-2">
            <strong>Headline:</strong> {report.headline.text}
            <span className="mt-1 block text-xs text-slate-600">{report.headline.reference}</span>
          </p>
        </header>

        <Section title="1. KPI status">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                {['Product', 'KPI', 'Target', 'Actual', 'vs. expected', '% of full target', 'Status', 'Change vs. last week'].map((h) => (
                  <th key={h} scope="col" className="py-1 pr-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.kpis.map((k) => (
                <tr key={`${k.product}-${k.label}`}>
                  <td className="py-1 pr-2">{k.product}</td>
                  <th scope="row" className="py-1 pr-2 font-medium">{k.label}</th>
                  <td className="py-1 pr-2 tabular-nums">{k.target}</td>
                  <td className="py-1 pr-2 tabular-nums">{k.actual}</td>
                  <td className="py-1 pr-2 tabular-nums">{k.vsExpected}</td>
                  <td className="py-1 pr-2 tabular-nums">{k.ofTarget}</td>
                  <td className={`py-1 pr-2 font-medium ${k.status === 'At Risk' ? 'text-red-700' : k.status === 'Watch' ? 'text-amber-700' : 'text-green-700'}`}>{k.status}</td>
                  <td className="py-1 text-slate-600">{k.change}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-[10px] text-slate-500">
            vs. expected: counts and deposits = actual ÷ expected by now; rates = actual ÷ target. % of full target: counts and deposits only.
          </p>
        </Section>

        {report.dashboard && !report.dashboard.checkingSections ? (
          <Section title="2–5. Changes, campaigns, risks and decisions">
            <p className="text-slate-500">{NOT_ON_DASHBOARD}</p>
          </Section>
        ) : (
          <>
        <Section title="2. Top 3 things that changed and why">
          <ol className="list-decimal space-y-1 pl-5">
            {report.changes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
        </Section>

        <Section title="3. Campaign results (Live and Completed)">
          {report.campaigns.length === 0 ? (
            <p className="text-slate-500">No Live or Completed campaigns.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  {['Campaign', 'Status', 'Type', 'Result', 'Lift', 'Cost / incr. primary'].map((h) => (
                    <th key={h} scope="col" className="py-1 pr-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.campaigns.map((c) => (
                  <tr key={c.name} className="align-top">
                    <th scope="row" className="py-1 pr-2 font-medium">{c.name}</th>
                    <td className="py-1 pr-2">{c.status}</td>
                    <td className="py-1 pr-2">{c.type}</td>
                    <td className="py-1 pr-2">{c.result}</td>
                    <td className="py-1 pr-2">{c.liftLabel}</td>
                    <td className="py-1 tabular-nums">
                      {c.costPerIncrementalPrimary}
                      <span className="block text-[10px] text-slate-500">{c.note}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <ul className="avoid-break mt-2 space-y-0.5 text-xs">
            {report.totals.map((t) => (
              <li key={t.label}>
                <strong>{t.label}:</strong> {t.value}
              </li>
            ))}
          </ul>
          <p className={`avoid-break mt-2 rounded p-2 text-xs ${report.feasibility.unlikely ? 'bg-red-50 text-red-900' : 'bg-slate-50'}`}>
            <strong>Feasibility:</strong> {report.feasibility.text}
          </p>
          <p className="mt-1 text-[10px] text-slate-500">Totals are by type and never summed across types. Campaign effects aren't additive.</p>
        </Section>

        <Section title="4. Risks and early-warning signals">
          <ul className="list-disc space-y-0.5 pl-5 text-xs">
            {report.risks.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Section>

        <Section title="5. Decisions needed from leadership">
          <ol className="list-decimal space-y-2 pl-5">
            {decisions.map((d, i) => (
              <li key={d.title} className="avoid-break">
                <strong>{d.title}.</strong>
                <label className="sr-only" htmlFor={`decision-${i}`}>
                  {d.title}: decision text
                </label>
                <textarea
                  id={`decision-${i}`}
                  value={d.text}
                  rows={2}
                  onChange={(ev) => setDecisions((prev) => prev.map((x, j) => (j === i ? { ...x, text: ev.target.value } : x)))}
                  className="mt-0.5 block w-full rounded border border-slate-300 px-2 py-1 text-sm"
                />
                <span className="block text-xs text-slate-600">Evidence: {d.evidence}</span>
                <label className="sr-only" htmlFor={`proposed-${i}`}>
                  {d.title}: proposed
                </label>
                <textarea
                  id={`proposed-${i}`}
                  value={d.proposed}
                  rows={2}
                  onChange={(ev) => setDecisions((prev) => prev.map((x, j) => (j === i ? { ...x, proposed: ev.target.value } : x)))}
                  className="mt-0.5 block w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-brand-ink"
                />
              </li>
            ))}
          </ol>
        </Section>

          </>
        )}

        <footer className="border-t border-slate-200 pt-2 text-xs text-slate-500">
          Internal figures are synthetic and illustrative (data as of {formatDate(report.internalAsOf)}). External facts are sourced and linked
          on the dashboard. Generated {formatTimestamp(report.generatedAt)}.
        </footer>
      </article>
      <div className="report-footer hidden">
        Illustrative · synthetic internal data as of {formatDate(report.internalAsOf)} · PNC Product Intelligence Hub weekly report
      </div>
    </div>,
    document.body,
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 text-sm font-semibold text-brand-ink">{title}</h2>
      {children}
    </section>
  )
}
