// Chart colours, taken from the design tokens (Recharts needs literal values, not Tailwind classes).
import { TOKENS } from './tokens'

export const CHART_COLORS = {
  branch: TOKENS.brandBlue,
  digital: TOKENS.brandOrange,
  primary: TOKENS.brandBlue,
  active: TOKENS.blueTint,
  slipping: TOKENS.orangeTint,
  dormant: TOKENS.critical,
  feeGroup: TOKENS.brandOrange,
  baseline: TOKENS.lineStrong,
  grid: TOKENS.line,
  ink: TOKENS.ink,
  muted: TOKENS.muted,
  target: TOKENS.positive,
  required: TOKENS.critical,
  caution: TOKENS.caution,
}

/** Axis and label text in charts: 12px, the smallest size in the type scale. */
export const CHART_FONT = 12
