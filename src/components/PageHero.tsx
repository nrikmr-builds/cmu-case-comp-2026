import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  title: string
  /** Small uppercase label above the title. */
  eyebrow?: ReactNode
  /** Shown in a white circle over the orange shapes on wide screens. */
  icon?: LucideIcon
  children?: ReactNode
}

/** Full-width gray band with PNC's pattern and orange circles, like the pnc.com hero. */
export default function PageHero({ title, eyebrow, icon: Icon, children }: Props) {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-surface-hero">
      <div aria-hidden className="pnc-pattern-light absolute inset-y-0 left-0 hidden w-40 2xl:block" />
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div aria-hidden className="absolute top-1/2 -right-16 hidden -translate-y-1/2 xl:block">
          <div className="h-72 w-72 rounded-full bg-brand-orange" />
          {Icon && (
            <div className="absolute top-1/2 -left-16 flex h-32 w-32 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md">
              <Icon className="h-14 w-14 text-brand-ink" strokeWidth={1.25} />
            </div>
          )}
        </div>

        <div className="relative max-w-4xl">
          {eyebrow && <div className="text-xs font-semibold tracking-wider text-slate-600 uppercase">{eyebrow}</div>}
          <h1 className="heading-accent mt-1 text-3xl font-semibold text-brand-ink">{title}</h1>
          {children}
        </div>
      </div>
    </section>
  )
}
