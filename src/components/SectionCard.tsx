import type { ReactNode } from 'react'
import SourceBadge, { type SourceKind } from './SourceBadge'

interface Props {
  id: string
  title: string
  source: SourceKind
  description?: ReactNode
  children: ReactNode
}

/** White card with a PNC heading and an internal/external badge, used by the checking health sections. */
export default function SectionCard({ id, title, source, description, children }: Props) {
  return (
    <section aria-labelledby={id} className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 id={id} className="heading-accent text-lg font-semibold text-brand-ink">
          {title}
        </h3>
        <SourceBadge kind={source} />
      </div>
      {description && <p className="mt-2 text-sm text-slate-600">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}
