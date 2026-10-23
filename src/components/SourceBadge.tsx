import { Database, Globe } from 'lucide-react'

export type SourceKind = 'internal' | 'external'

const SOURCE_STYLES = {
  internal: { label: 'Internal · Illustrative', Icon: Database, className: 'bg-surface text-body ring-line-strong' },
  external: { label: 'External · Sourced', Icon: Globe, className: 'bg-info-soft text-brand-blue ring-brand-blue/30' },
} as const

/** Tells the Product Owner whether a number is our synthetic data or a sourced fact from the web. */
export default function SourceBadge({ kind }: { kind: SourceKind }) {
  const { label, Icon, className } = SOURCE_STYLES[kind]
  return (
    <span className={`shrink-0 chip ring-1 ring-inset ${className}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  )
}
