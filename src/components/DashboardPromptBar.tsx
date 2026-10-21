import { Loader2, Sparkles } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { generateView } from '../lib/dashboardPrompt'
import type { DashboardView } from '../types'

const SUGGESTIONS = [
  'Show only at-risk metrics',
  'Deposit growth for Savings and CDs',
  'Checking metrics that are behind pace',
  'Digital adoption across all products',
]

/** Brief pause so the result reads as generated rather than an instant filter. */
const GENERATE_DELAY_MS = 700

export default function DashboardPromptBar({ onGenerate }: { onGenerate: (view: DashboardView) => void }) {
  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  function generate(text: string) {
    if (!text.trim() || isGenerating) return
    setPrompt(text)
    setError(null)
    setIsGenerating(true)
    window.setTimeout(() => {
      const view = generateView(text)
      setIsGenerating(false)
      if (view) {
        onGenerate(view)
        setPrompt('')
      } else {
        setError(
          'No metrics matched that prompt. Try naming a product (Checking, Savings, CD), a topic (openings, deposits, digital), or a status (at risk, on track).',
        )
      }
    }, GENERATE_DELAY_MS)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    generate(prompt)
  }

  return (
    <section aria-labelledby="prompt-heading" className="pnc-pattern-dark rounded-md bg-brand-ink p-5 text-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles className="h-5 w-5 text-brand-orange" aria-hidden />
        <h2 id="prompt-heading" className="text-lg font-semibold">
          Ask AI to build a dashboard
        </h2>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-200">Simulated · runs locally</span>
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="dashboard-prompt" className="sr-only">
          Describe the metrics you want to see
        </label>
        <input
          id="dashboard-prompt"
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Show checking metrics that are behind pace"
          disabled={isGenerating}
          aria-describedby={error ? 'prompt-error' : undefined}
          className="min-w-0 flex-1 rounded border border-white bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-orange focus:outline-none disabled:bg-slate-100"
        />
        <button
          type="submit"
          disabled={isGenerating || !prompt.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
          {isGenerating ? 'Generating…' : 'Generate'}
        </button>
      </form>

      {error && (
        <p id="prompt-error" role="alert" className="mt-2 text-sm text-orange-200">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-300">Try:</span>
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => generate(suggestion)}
            disabled={isGenerating}
            className="rounded-full border border-white/30 px-3 py-1 text-xs text-white hover:border-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </section>
  )
}
