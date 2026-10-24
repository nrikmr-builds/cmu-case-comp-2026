import { Loader2, MessageSquareText, Search } from 'lucide-react'
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
    <section aria-labelledby="prompt-heading" className="card p-6">
      <div className="flex flex-wrap items-center gap-2">
        <MessageSquareText className="h-5 w-5 text-brand-blue" aria-hidden />
        <h2 id="prompt-heading" className="text-lg font-semibold">
          Ask a question about this dashboard
        </h2>
        <span className="chip bg-surface text-muted">Simulated · runs locally</span>
      </div>
      <p className="mt-1 text-sm text-muted">Filters this dashboard’s cards. To build a new dashboard, use “+” in the header.</p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="dashboard-prompt" className="sr-only">
          Ask a question about this dashboard
        </label>
        <input
          id="dashboard-prompt"
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Show checking metrics that are behind pace"
          disabled={isGenerating}
          aria-describedby={error ? 'prompt-error' : undefined}
          className="field min-w-0 flex-1 placeholder:text-muted disabled:bg-surface"
        />
        <button type="submit" disabled={isGenerating || !prompt.trim()} className="btn btn-secondary">
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
          {isGenerating ? 'Filtering…' : 'Ask'}
        </button>
      </form>

      {error && (
        <p id="prompt-error" role="alert" className="mt-2 text-sm text-critical">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Try:</span>
        {SUGGESTIONS.map((suggestion) => (
          <button key={suggestion} type="button" onClick={() => generate(suggestion)} disabled={isGenerating} className="chip disabled:opacity-50">
            {suggestion}
          </button>
        ))}
      </div>
    </section>
  )
}
