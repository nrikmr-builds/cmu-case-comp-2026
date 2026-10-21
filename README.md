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

## Page 2: CD Opportunity Intelligence (Kem)

### Insights, not recommendations
This page shows evidence, trade-offs, and open questions. **It does not tell the Product Owner what to do.** Avoid words like "Recommended" or "You should." Use labels like "Insight," "Opportunity," and "Considerations."

### Gap summary

| Metric | Value |
|---|---:|
| Target / Current | 5,000 / 3,100 |
| Expected by now (80% of quarter) | 4,000 |
| **Pace gap** | **900** |
| **Still needed to hit target** | **1,900** |

Keep the 900 and the 1,900 clearly separate. They are different numbers.

### Customer segments

| Segment | Why they might open a CD | Consideration | Eligible | Est. Conversion | Potential Accounts |
|---|---|---|---:|---:|---:|
| High-Balance Savings | Large, stable savings they don't touch | May shift money out of savings instead of adding new deposits | 12,000 | 8% | 960 |
| Maturing CDs | Already know and use CDs | Auto-renewals don't count as new openings | 6,000 | 10% | 600 |
| Surplus Checking | Balances well above everyday needs | Extra cash isn't automatically right for a CD | 15,000 | 5% | 750 |
| **Total** | | | **33,000** | | **2,310** |

`potential accounts = eligible × conversion rate`. Calculate it in code; don't hardcode it.

**Key insight:** 2,310 potential accounts is more than the 1,900 still needed. That's a hypothetical opportunity, not a forecast.

### AI summary (prewritten, no live AI)

> "CD openings are 900 behind the expected pace, with 1,900 still needed to reach target. Three segments show an illustrative combined opportunity of 2,310 new accounts. High-balance savings is the largest opportunity, and maturing CDs have the highest assumed conversion. Open questions: how much savings would shift rather than grow, and how many maturing CDs would auto-renew. Validate these assumptions before estimating impact."

A "Back to Portfolio" link returns to `/`.

---

## Shared Data

Both pages read from the same data files so the numbers always match.

```typescript
// src/data/productMetrics.ts
export const cdAcquisitionMetric = {
  id: "cd-new-accounts",
  label: "New CD Account Openings",
  quarter: "Q3 2026",
  target: 5000,
  actual: 3100,
  quarterElapsed: 0.8,
};

// src/data/cdSegments.ts
export const cdCustomerSegments = [
  { id: "high-balance-savings", name: "High-Balance Savings", eligibleCustomers: 12000, estimatedConversionRate: 0.08 },
  { id: "maturing-cds",         name: "Maturing CDs",         eligibleCustomers: 6000,  estimatedConversionRate: 0.10 },
  { id: "surplus-checking",     name: "Surplus Checking",     eligibleCustomers: 15000, estimatedConversionRate: 0.05 },
];
```

Derive the expected value, gap, status, and potential accounts from these values.

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
