import { Database, Globe } from 'lucide-react'

export type SourceKind = 'internal' | 'external'

const SOURCE_STYLES = {
  internal: { label: 'Internal · Illustrative', Icon: Database, className: 'bg-slate-100 text-slate-700 ring-slate-300' },
  external: { label: 'External · Sourced', Icon: Globe, className: 'bg-blue-50 text-brand-blue ring-brand-blue/30' },
} as const

/** Tells the Product Owner whether a number is our synthetic data or a sourced fact from the web. */
export default function SourceBadge({ kind }: { kind: SourceKind }) {
  const { label, Icon, className } = SOURCE_STYLES[kind]
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  )
}
