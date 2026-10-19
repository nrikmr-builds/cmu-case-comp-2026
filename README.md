# PNC Product Intelligence Hub
**2026 Tepper Tech Innovation Challenge | Qualifying Round**

An AI-powered dashboard that helps a **Product Owner** spot underperforming product metrics and understand where the opportunities are to fix them. The AI surfaces insights; the Product Owner makes the decision.

To show the capability, the demo walks through one example: **Certificate of Deposit (CD) account openings falling behind their quarterly target.** The same pattern could apply to any product or KPI.

All data in the prototype is synthetic.

| Developer | Page | Route | Branch |
|---|---|---|---|
| Nripesh Kumar | Portfolio Overview | `/` | `feature/portfolio-overview` |
| Kem Hannarong | CD Opportunity Intelligence | `/cd-opportunities` | `feature/cd-opportunity-intelligence` |

---

## The Demo Story

1. The Product Owner opens the dashboard and sees KPIs for Checking, Savings, and CDs.
2. Most metrics are on track, but **New CD Account Openings** is flagged red: At Risk.
3. They click it and land on the CD Opportunity Intelligence page.
4. The page shows the size of the gap, three customer segments that could open CDs, and an AI summary of the opportunity.
5. The Product Owner uses their own judgment to decide what to look into next.

---

## Page 1: Portfolio Overview (Nripesh)

Three product cards with KPIs, progress bars, and status badges for Q3 2026.

| Product | KPI | Target | Current |
|---|---|---:|---:|
| Checking | New Account Openings | 12,000 | 9,800 |
| | Digital Opening Completion Rate | 75% | 69% |
| | Active Account Rate | 85% | 87% |
| Savings | New Account Openings | 8,000 | 7,100 |
| | Net New Deposits | $40M | $36M |
| | Digital Enrollment Rate | 70% | 73% |
| CD | **New CD Account Openings** | **5,000** | **3,100** |
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

For CDs, the target is 5,000, so 4,000 openings are expected by now. Only 3,100 have happened, which is 77.5% of pace, so the KPI is **At Risk**.

Clicking the CD card or the at-risk KPI goes to `/cd-opportunities`.

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

## Tech Stack

React, TypeScript, Vite, Tailwind CSS, React Router, Recharts, Lucide icons. Local data only, with no backend or external APIs.

```text
src/
├── components/   Header, StatusBadge, KPIProgressBar (shared) + page-specific components
├── pages/        PortfolioOverview.tsx (Nripesh), CDOpportunityIntelligence.tsx (Kem)
├── data/         productMetrics.ts, cdSegments.ts (shared)
├── types/        index.ts (shared)
└── App.tsx       routes
```

## Design

- Clean enterprise banking look: a light background, restrained PNC orange and blue, simple cards.
- Status shown with color **and** text or an icon.
- Label synthetic numbers as illustrative.
- Clickable elements should look clickable and be keyboard accessible.

## Workflow

1. One developer scaffolds the app on `main`: setup, shared data and types, shared components, routes, and placeholder pages.
2. Each developer then works on their own branch and opens a pull request into `main` for the other to review.
3. Talk to each other before changing shared files (`data/`, `types/`, shared components, `App.tsx`).

## Done When

- [ ] Landing page shows all three product cards with KPIs, progress bars, and status.
- [ ] CD openings show At Risk based on the pace calculation.
- [ ] Clicking the CD card or KPI opens the CD page, and Back returns to the landing page.
- [ ] Both pages show the same CD numbers from shared data.
- [ ] The CD page shows the gap, three segments, consistent math, and the AI summary, with no prescriptive recommendations.
- [ ] Runs locally with no errors and no external APIs.
