// PLACEHOLDER DATA: synthetic past results for each opportunity segment, so the Product Owner can compare
// a slider assumption with what actually happened. Keyed by segment id from opportunities.ts.

export interface SegmentQuarter {
  quarter: string
  /** Customers in the segment that quarter. */
  eligible: number
  /** How many of them opened the product that quarter. */
  converted: number
}

/** The last four completed quarters, oldest first. */
export const segmentHistory: Record<string, SegmentQuarter[]> = {
  // Checking
  'savings-only': [
    { quarter: 'Q3 2025', eligible: 18000, converted: 1260 },
    { quarter: 'Q4 2025', eligible: 18500, converted: 1350 },
    { quarter: 'Q1 2026', eligible: 19200, converted: 1460 },
    { quarter: 'Q2 2026', eligible: 19800, converted: 1580 },
  ],
  'abandoned-digital': [
    { quarter: 'Q3 2025', eligible: 5200, converted: 780 },
    { quarter: 'Q4 2025', eligible: 5500, converted: 990 },
    { quarter: 'Q1 2026', eligible: 5800, converted: 960 },
    { quarter: 'Q2 2026', eligible: 6100, converted: 1100 },
  ],
  'young-adults': [
    { quarter: 'Q3 2025', eligible: 22000, converted: 1540 },
    { quarter: 'Q4 2025', eligible: 24000, converted: 1560 },
    { quarter: 'Q1 2026', eligible: 26000, converted: 1560 },
    { quarter: 'Q2 2026', eligible: 24500, converted: 1350 },
  ],
  // Savings
  'checking-only': [
    { quarter: 'Q3 2025', eligible: 28000, converted: 1260 },
    { quarter: 'Q4 2025', eligible: 29000, converted: 1250 },
    { quarter: 'Q1 2026', eligible: 29500, converted: 1240 },
    { quarter: 'Q2 2026', eligible: 30000, converted: 1170 },
  ],
  'high-balance-checking': [
    { quarter: 'Q3 2025', eligible: 9000, converted: 360 },
    { quarter: 'Q4 2025', eligible: 9500, converted: 430 },
    { quarter: 'Q1 2026', eligible: 9800, converted: 510 },
    { quarter: 'Q2 2026', eligible: 10000, converted: 540 },
  ],
  'maturing-cds-savings': [
    { quarter: 'Q3 2025', eligible: 3500, converted: 250 },
    { quarter: 'Q4 2025', eligible: 3800, converted: 300 },
    { quarter: 'Q1 2026', eligible: 4100, converted: 350 },
    { quarter: 'Q2 2026', eligible: 4000, converted: 320 },
  ],
  // CD
  'high-balance-savings': [
    { quarter: 'Q3 2025', eligible: 11000, converted: 770 },
    { quarter: 'Q4 2025', eligible: 11500, converted: 850 },
    { quarter: 'Q1 2026', eligible: 12000, converted: 1010 },
    { quarter: 'Q2 2026', eligible: 12200, converted: 950 },
  ],
  'maturing-cds': [
    { quarter: 'Q3 2025', eligible: 5500, converted: 500 },
    { quarter: 'Q4 2025', eligible: 5800, converted: 610 },
    { quarter: 'Q1 2026', eligible: 6100, converted: 650 },
    { quarter: 'Q2 2026', eligible: 6000, converted: 570 },
  ],
  'surplus-checking': [
    { quarter: 'Q3 2025', eligible: 14000, converted: 560 },
    { quarter: 'Q4 2025', eligible: 14500, converted: 650 },
    { quarter: 'Q1 2026', eligible: 15000, converted: 690 },
    { quarter: 'Q2 2026', eligible: 15200, converted: 700 },
  ],
}
