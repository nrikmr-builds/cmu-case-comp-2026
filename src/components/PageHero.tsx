import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  title: string
  /** Small label above the title. */
  eyebrow?: ReactNode
  /** "← Back to …": a quiet sentence-case link above the title (not an eyebrow). */
  back?: ReactNode
  /** Shown in a white circle over the orange shapes on wide screens. */
  icon?: LucideIcon
  children?: ReactNode
}

/** Full-width gray band with PNC's pattern and orange circles, like the pnc.com hero. */
export default function PageHero({ title, eyebrow, back, icon: Icon, children }: Props) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-surface-hero">
      <div aria-hidden className="pnc-pattern-light absolute inset-y-0 left-0 hidden w-40 2xl:block" />
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div aria-hidden className="absolute top-1/2 -right-24 hidden -translate-y-1/2 xl:block">
          <div className="h-56 w-56 rounded-full bg-brand-orange" />
          {Icon && (
            <div className="absolute top-1/2 -left-12 flex h-24 w-24 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-card">
              <Icon className="h-10 w-10 text-brand-ink" />
            </div>
          )}
        </div>

        <div className="relative max-w-4xl">
          {back && <div className="mb-2">{back}</div>}
          {/* The one ALL-CAPS label on the page. */}
          {eyebrow && <div className="text-xs font-semibold tracking-wide text-muted uppercase">{eyebrow}</div>}
          <h1 className="heading-accent mt-2 text-xl font-semibold text-brand-ink sm:text-2xl">{title}</h1>
          {children}
        </div>
      </div>
    </section>
  )
}
