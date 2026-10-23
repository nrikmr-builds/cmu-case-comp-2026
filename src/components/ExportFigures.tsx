import { toPng } from 'html-to-image'
import { Download, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { currentQuarterHealth, healthMixHistory } from '../data/checkingHealth'
import { getKpi, reportingPeriod } from '../data/productMetrics'
import { inputsFromPreset } from '../lib/campaignEconomics'
import { useCampaigns } from '../lib/campaignStore'
import { useAlertRules } from '../lib/trackingStore'
import { formatDate } from '../lib/projection'
import { buildWeeklyReport } from '../lib/weeklyReport'
import { getReforecast } from '../lib/reforecastStore'
import AccountHealthMix from './AccountHealthMix'
import CampaignTracker from './CampaignTracker'
import DailyOpeningsTrend from './DailyOpeningsTrend'
import GapSummary from './GapSummary'
import { EconomicsTable, KindBadge } from './PromotionBuilder'
import NextBestAction from './NextBestAction'
import ScenarioPlanner from './ScenarioPlanner'

/** White-paper figures. File names are neutral (no team or school names). */
const FIGURES = [
  { file: 'fig1-gap-summary.png', title: 'Gap Summary', selector: '#gap-heading' },
  { file: 'fig2-daily-openings.png', title: 'Daily Openings', selector: '#daily-heading' },
  { file: 'fig3-account-health-mix.png', title: 'Account Health Mix', selector: '#health-heading' },
  { file: 'fig4-primacy-bonus-economics.png', title: 'Promotion Builder · Primacy Bonus economics', selector: '#export-economics' },
  { file: 'fig5-campaign-totals-feasibility.png', title: 'Campaign Tracker · totals and feasibility', selector: '#totals-heading' },
  { file: 'fig6-report-decisions.png', title: 'Weekly report · decisions', selector: '#export-decisions' },
  { file: 'fig7-scenario-planner.png', title: 'Scenario planner', selector: '#planner-heading' },
  { file: 'fig8-next-best-action.png', title: 'Next best action · rules and roll-up', selector: '#nba-figure' },
] as const

const LABEL = `Illustrative · synthetic internal data as of ${formatDate(reportingPeriod.internalAsOf)} · PNC Product Intelligence Hub prototype`

/**
 * Captures a section as a 2× PNG on white, with an "Illustrative" label added for the capture only. Looks only
 * inside the export panel's own off-screen copies, so it works from any Checking tab.
 */
async function capture(root: HTMLElement, selector: string): Promise<string> {
  const found = root.querySelector(selector)
  if (!found) throw new Error(`Not rendered: ${selector}`)
  const node = (found.id.startsWith('export-') || found.id === 'nba-figure' ? found : (found.closest('section') ?? found)) as HTMLElement
  const label = document.createElement('p')
  label.textContent = LABEL
  label.setAttribute('style', 'margin:12px 0 0;font:500 11px system-ui,sans-serif;color:#475569;border-top:1px solid #e2e8f0;padding-top:6px')
  node.appendChild(label)
  try {
    return await toPng(node, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true })
  } finally {
    label.remove()
  }
}

function download(dataUrl: string, file: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = file
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** "Export figures": renders off-screen copies of the figure cards, captures all eight, and offers each PNG for download. */
export default function ExportFigures({ onClose }: { onClose: () => void }) {
  const [images, setImages] = useState<{ file: string; title: string; url?: string; error?: string }[]>([])
  const [busy, setBusy] = useState(true)
  const started = useRef(false)
  const sources = useRef<HTMLDivElement>(null)
  const { campaigns } = useCampaigns()
  const { rules } = useAlertRules()
  // Built once when the panel opens, from the same campaigns, rules and re-forecast the report uses.
  const [report] = useState(() => buildWeeklyReport(campaigns, rules, new Date(), getReforecast()))
  const primacy = inputsFromPreset('primacy-bonus')
  const kpi = getKpi('checking-new-accounts')

  useEffect(() => {
    if (started.current) return
    started.current = true
    ;(async () => {
      // Give the off-screen copies (charts measure their container first) a moment to render.
      await new Promise((r) => setTimeout(r, 600))
      const out: typeof images = []
      for (const f of FIGURES) {
        try {
          if (!sources.current) throw new Error('Export panel not ready')
          out.push({ file: f.file, title: f.title, url: await capture(sources.current, f.selector) })
        } catch (e) {
          out.push({ file: f.file, title: f.title, error: (e as Error).message })
        }
        setImages([...out])
      }
      setBusy(false)
    })()
  }, [])

  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="export-heading" className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 p-4">
      <div className="mx-auto max-w-3xl rounded-md bg-white p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="export-heading" className="text-lg font-semibold text-brand-ink">
            White-paper figures
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => images.forEach((img, i) => img.url && setTimeout(() => download(img.url!, img.file), i * 300))}
              className="inline-flex items-center gap-1.5 rounded bg-brand-blue px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              <Download className="h-4 w-4" aria-hidden /> Download all
            </button>
            <button type="button" onClick={onClose} className="inline-flex items-center gap-1 rounded border border-slate-300 px-3 py-1.5 text-sm">
              <X className="h-4 w-4" aria-hidden /> Close
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-500">PNG at 2× resolution on white, each with an "Illustrative" label. {busy && 'Rendering…'}</p>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {images.map((img) => (
            <li key={img.file} className="rounded border border-slate-200 p-2">
              <p className="text-sm font-medium text-brand-ink">{img.title}</p>
              {img.url ? (
                <>
                  <img src={img.url} alt={`${img.title} figure`} className="mt-2 max-h-48 w-full border border-slate-100 object-contain object-top" />
                  <a href={img.url} download={img.file} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline">
                    <Download className="h-3.5 w-3.5" aria-hidden /> {img.file}
                  </a>
                </>
              ) : (
                <p className="mt-2 text-xs text-red-700">Couldn't render: {img.error}</p>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Off-screen copies of every figure's card, whichever Checking tab it lives on (Today, Diagnose or Act). */}
      <div ref={sources} aria-hidden inert className="fixed top-0 -left-[10000px] w-[1100px] space-y-6 bg-white">
        <GapSummary kpi={kpi} period={reportingPeriod} />
        <DailyOpeningsTrend />
        <AccountHealthMix
          history={healthMixHistory}
          accountsWithDirectDeposit={currentQuarterHealth.accountsWithDirectDeposit}
          openedThisQuarter={kpi.actual}
          closedThisQuarter={currentQuarterHealth.closedThisQuarter}
          newlyDormantThisQuarter={currentQuarterHealth.newlyDormantThisQuarter}
        />
        <CampaignTracker onEdit={() => {}} />
        <ScenarioPlanner />
        <NextBestAction />
        <div id="export-economics" className="space-y-3 bg-white p-6 text-slate-800">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-brand-ink">Promotion Builder · {primacy.name}</h3>
            <KindBadge kind={primacy.kind} outcome={primacy.outcome} />
          </div>
          <p className="text-xs text-slate-500">
            Audience {primacy.sourceLabel} · baseline {(primacy.baselineRate * 100).toFixed(1)}% → campaign {(primacy.rate * 100).toFixed(1)}% (illustrative uplift)
          </p>
          <EconomicsTable inputs={primacy} />
        </div>
        <div id="export-decisions" className="space-y-2 bg-white p-6 text-sm text-slate-800">
          <h3 className="text-lg font-semibold text-brand-ink">Decisions needed from leadership</h3>
          <ol className="list-decimal space-y-2 pl-5">
            {report.decisions.map((d) => (
              <li key={d.title}>
                <strong>{d.title}.</strong> {d.text}
                <span className="block text-xs text-slate-600">Evidence: {d.evidence}</span>
                <span className="block text-xs font-medium text-brand-ink">{d.proposed}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>,
    document.body,
  )
}
