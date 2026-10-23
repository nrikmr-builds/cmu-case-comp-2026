# PNC Product Intelligence Hub
**2026 Tepper Tech Innovation Challenge | Qualifying Round**

An AI-powered dashboard that helps a **Product Owner** spot underperforming product metrics and understand where the opportunities are to fix them. The AI surfaces insights; the Product Owner makes the decision.

To show the capability, the demo walks through one example: **Checking account openings falling behind their quarterly target.** Every product has the same opportunity page, so the pattern applies to any product or KPI.

All data in the prototype is synthetic.

> **Numbers are placeholders.** The KPIs, targets, and segment figures below are stand-ins until the rest of the team confirms the real ones. Always read numbers from `src/data/` and never hardcode them in a page, so swapping in the final values is a one-file change.

| Developer | Page | Route | Branch |
|---|---|---|---|
| Nripesh Kumar | Portfolio Overview | `/` | `feature/portfolio-overview` |
| Kem Hannarong | Opportunity Intelligence (Checking, Savings, CD) | `/opportunities/:productId` | `feature/cd-opportunity-intelligence` |

---

## The Demo Story

1. The Product Owner opens the dashboard and sees KPIs for Checking, Savings, and CDs.
2. Savings and CD are on track, but **Checking New Account Openings** is flagged red: At Risk.
3. They can ask the AI prompt bar for a focused dashboard ("Checking metrics that are behind pace"), save it, and come back to it from the left nav.
4. They click through to the Checking Opportunity Intelligence page, which shows the size of the gap, three customer segments that could open checking accounts, and an AI summary.
5. The Product Owner uses their own judgment to decide what to look into next.

---

## Page 1: Portfolio Overview (Nripesh)

Three product cards with KPIs, progress bars, and status badges for Q3 2026, plus:

- **AI prompt bar** above the cards. The Product Owner describes what they want to see ("deposit growth for Savings and CDs") and gets a dashboard with just those metrics. The AI is simulated with keyword rules in `src/lib/dashboardPrompt.ts`, so it runs offline; a real model could replace `generateView` without changing its callers.
- **Saved views nav** on the left. Generated dashboards can be saved and are listed with a label, the prompt, and a timestamp. Three illustrative past versions are pre-loaded; your saved views stay in this browser (localStorage).

| Product | KPI | Target | Current |
|---|---|---:|---:|
| Checking | **New Account Openings** | **12,000** | **7,600** |
| | Digital Opening Completion Rate | 75% | 69% |
| | Active Account Rate | 85% | 87% |
| Savings | New Account Openings | 8,000 | 7,100 |
| | Net New Deposits | $40M | $36M |
| | Digital Enrollment Rate | 70% | 73% |
| CD | New CD Account Openings | 5,000 | 4,100 |
| | CD Renewal Rate | 65% | 67% |
| | Net New CD Deposits | $25M | $22M |

**Status is based on pace, not just the percentage of the target.** Assume 80% of the quarter has passed.

- Count KPIs: `expected = target × 0.8`, then compare `current / expected`.
- Rate KPIs: compare the current rate with the target.

| Status | Rule | Color |
|---|---|---|
| On Track | ≥ 95% of expected | Green |
| Watch | 85–95% of expected | Amber |
| At Risk | < 85% of expected | Red |

For Checking, the target is 12,000, so 9,600 openings are expected by now. Only 7,600 have happened, which is 79.2% of pace, so the KPI is **At Risk**. Digital Opening Completion Rate is on Watch; every Savings and CD KPI is On Track.

Every card links to its product's opportunity page (`/opportunities/checking`, `/opportunities/savings`, `/opportunities/cd`). Only Checking also gets the red at-risk banner.

---

## Page 2: Opportunity Intelligence (Kem)

One page per product at `/opportunities/:productId`. The demo walks through **Checking**. Numbers below are the current synthetic values; the page computes every one of them from `src/data/` with the helpers in `src/lib/`.

### Insights, not recommendations
This page shows evidence, trade-offs, and open questions. **It does not tell the Product Owner what to do.** Avoid words like "Recommended" or "You should." Use labels like "Insight," "Opportunity," and "Considerations."

### Gap summary

Two rows. Every tile shows its formula underneath.

**Where we are today**

| Metric | Formula | Checking |
|---|---|---:|
| Current / Target | actual / target | 7,600 / 12,000 |
| Expected by now (80% of quarter) | target × 0.80 | 9,600 |
| **Pace gap** | expected − actual | **2,000** |
| **Still needed to hit target** | target − actual | **4,400** |

**If today's pace continues to quarter end** (`src/lib/projection.ts`)

| Metric | Formula | Checking |
|---|---|---:|
| Projected at current pace | actual ÷ 0.80 | 9,500 (79.2% of target) |
| Expected from current pace, rest of quarter | projected − actual | 1,900 |
| **Incremental needed beyond current pace** | target − projected | **2,500** |
| Required vs. current daily pace | (still needed ÷ days left) ÷ (actual ÷ days elapsed) | 2.3× (239/day vs. 103/day) |

Days come from a 92-day quarter: 73.6 elapsed, 18.4 left. Keep "pace gap" (2,000), "still needed" (4,400), and "incremental beyond pace" (2,500) clearly separate; they answer different questions. When a product is ahead of pace (Savings, CD), the third tile shows "Projected above target" instead.

### Customer segments

| Segment | Eligible | Last-qtr rate | Potential at last-qtr rate |
|---|---:|---:|---:|
| Savings-Only Customers | 20,000 | 8.0% | 1,600 |
| Abandoned Digital Applications | 6,000 | 18.0% | 1,080 |
| Young Adults | 25,000 | 5.5% | 1,375 |
| **Total** | **51,000** | | **4,055** |

`potential accounts = eligible × conversion rate`. Rates come from `src/data/segmentHistory.ts` (last 4 quarters) and are rounded to 0.1% before any math, so each figure can be checked by hand. Sliders start and reset at the last-quarter rate; a slider outside its 4-quarter range is flagged.

### Key insight and AI summary (prewritten, no live AI)

Both lead with **last-quarter rates**, not slider settings: 4,055 potential accounts is less than the 4,400 still needed, but more than the 2,500 needed beyond current pace, with a caveat that some of these conversions may already be part of the current pace (overlap). The slider total appears only as a secondary "Your scenario" line. On Checking, the AI summary also covers activation, the strongest early-warning signal, the net account change, and two sourced market facts.

A "Back to Portfolio" link returns to `/`.

---

## Shared Data

Every page reads from the same data files so the numbers always match. The CD slice of each file looks like this (see the files for Checking and Savings):

```typescript
// src/data/productMetrics.ts
export const reportingPeriod: ReportingPeriod = {
  quarter: 'Q3 2026',
  quarterElapsed: 0.8,
  quarterDays: 92,             // Jul 1 – Sep 30
  internalAsOf: '2026-09-12',  // ≈ day 74 of 92
}

export const products: Product[] = [
  // …checking, savings…
  {
    id: 'cd',
    name: 'Certificates of Deposit',
    description: 'Time-bound deposits with defined maturity periods',
    kpis: [
      { id: 'cd-new-accounts', productId: 'cd', label: 'New CD Account Openings', kind: 'cumulative', unit: 'accounts', target: 5000, actual: 4100 },
      { id: 'cd-renewal-rate', productId: 'cd', label: 'CD Renewal Rate', kind: 'rate', unit: 'percent', target: 0.65, actual: 0.67 },
      { id: 'cd-net-deposits', productId: 'cd', label: 'Net New CD Deposits', kind: 'cumulative', unit: 'usd', target: 25_000_000, actual: 22_000_000 },
    ],
  },
]

// src/data/opportunities.ts: one ProductOpportunity per product
{
  productId: 'cd',
  shortName: 'CD',
  accountNoun: 'CD',
  focusKpiId: 'cd-new-accounts',
  openQuestions: 'how much savings would shift rather than grow, and how many maturing CDs would auto-renew',
  segments: [
    { id: 'high-balance-savings', name: 'High-Balance Savings', whyRelevant: '…', consideration: '…', eligibleCustomers: 12000, estimatedConversionRate: 0.08 },
    { id: 'maturing-cds',         name: 'Maturing CDs',         whyRelevant: '…', consideration: '…', eligibleCustomers: 6000,  estimatedConversionRate: 0.1 },
    { id: 'surplus-checking',     name: 'Surplus Checking',     whyRelevant: '…', consideration: '…', eligibleCustomers: 15000, estimatedConversionRate: 0.05 },
  ],
}

// src/data/segmentHistory.ts: last 4 quarters per segment id; sliders start at the last-quarter rate
'high-balance-savings': [
  { quarter: 'Q3 2025', eligible: 11000, converted: 770 },
  { quarter: 'Q4 2025', eligible: 11500, converted: 850 },
  { quarter: 'Q1 2026', eligible: 12000, converted: 1010 },
  { quarter: 'Q2 2026', eligible: 12200, converted: 950 },  // 7.8% → 12,000 × 7.8% = 936
],
```

`estimatedConversionRate` in `opportunities.ts` is only a fallback for a segment with no history. Checking also has `checkingHealth.ts` (funnel, health mix, signals), `dailyOpenings.ts` (daily trend and weekly flags), and `marketSignals.ts` (sourced external facts).

Derive the expected value, gap, projection, status, and potential accounts from these values with the helpers in `src/lib/`.

---

## Quick Start

```bash
git clone https://github.com/nrikmr-builds/cmu-case-comp-2026.git
cd cmu-case-comp-2026
npm install
npm run dev        # http://localhost:5173
git checkout -b feature/cd-opportunity-intelligence   # or feature/portfolio-overview
```

Before opening a pull request, run `npm run build` and `npm run lint`.

## Tech Stack

React, TypeScript, Vite, Tailwind CSS, React Router, Recharts, Lucide icons. Local data only, with no backend or external APIs.

```text
src/
├── App.tsx                        routes for / and /cd-opportunities (shared)
├── index.css                      Tailwind + brand color tokens (shared)
├── types/index.ts                 Kpi, Product, CustomerSegment types (shared)
├── data/
│   ├── productMetrics.ts          all KPIs + cdAcquisitionMetric (shared, placeholder)
│   └── cdSegments.ts              the three CD segments (shared, placeholder)
├── lib/metrics.ts                 expected pace, status, gap, remaining, potential accounts (shared)
├── components/
│   ├── Header.tsx                 app header (shared)
│   ├── StatusBadge.tsx            On Track / Watch / At Risk badge (shared)
│   └── KPIProgressBar.tsx         progress bar capped at 100% (shared)
└── pages/
    ├── PortfolioOverview.tsx      Nripesh — placeholder
    └── CDOpportunityIntelligence.tsx  Kem — placeholder
```

Put page-specific components in `src/components/` with a clear name (for example `SegmentTable.tsx`).

**Useful helpers in `lib/metrics.ts`:** `getStatus`, `getPaceGap`, `getRemainingToTarget`, `getPotentialAccounts`, `formatValue`. Rates are stored as fractions (`0.75`) and money as dollars (`25_000_000`).

## Design

- Clean enterprise banking look: a light background, restrained PNC orange and blue, simple cards.
- Status shown with color **and** text or an icon.
- Label synthetic numbers as illustrative.
- Clickable elements should look clickable and be keyboard accessible.

## Workflow

1. ✅ The app is scaffolded on `main`: setup, shared data and types, shared components, routes, and placeholder pages.
2. Each developer works on their own branch and opens a pull request into `main` for the other to review.
3. Talk to each other before changing shared files (`data/`, `types/`, shared components, `App.tsx`).

## Done When

- [ ] Landing page shows all three product cards with KPIs, progress bars, and status.
- [ ] CD openings show At Risk based on the pace calculation.
- [ ] Clicking the CD card or KPI opens the CD page, and Back returns to the landing page.
- [ ] Both pages show the same CD numbers from shared data.
- [ ] The CD page shows the gap, three segments, consistent math, and the AI summary, with no prescriptive recommendations.
- [ ] Runs locally with no errors and no external APIs.
