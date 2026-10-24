// TOKEN MIRROR: the same values as the @theme block in src/index.css, for places that need literal colours
// (Recharts SVG attributes, the figure-export label, print CSS). Change a colour in both files together.
export const TOKENS = {
  brandBlue: '#0069aa',
  brandBlueDark: '#004c97',
  brandOrange: '#f7841f',
  ink: '#2d3943',
  body: '#484848',
  muted: '#5b6670',
  line: '#e1e5ea',
  lineStrong: '#8a96a1',
  surface: '#f1f4f6',
  white: '#ffffff',
  positive: '#1e7a46',
  caution: '#8a5a00',
  critical: '#b3261e',
  // Chart-only tints (derived from brand blue and orange), always shown with a legend or labels.
  blueTint: '#7fb4d5',
  orangeTint: '#f9b77a',
} as const
