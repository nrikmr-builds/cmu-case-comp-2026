# PNC Product Intelligence Hub
### AI-Powered Product Ownership Dashboard
**2026 Tepper Tech Innovation Challenge | Qualifying Round**

| Role | Owner | Page | Branch |
|---|---|---|---|
| Developer 1 | Nripesh Kumar | Portfolio Overview (`/`) | `feature/portfolio-overview` |
| Developer 2 | Kem Hannarong | CD Opportunity Intelligence (`/cd-opportunities`) | `feature/cd-opportunity-intelligence` |

> **Status:** Planning. The app has not been scaffolded yet. See [Getting Started](#16-getting-started) for the build order.

---

## 1. Project Overview

The PNC Product Intelligence Hub is an interactive proof-of-concept designed to help Product Owners monitor the performance of consumer deposit products and identify opportunities for improvement.

The dashboard focuses on three banking products:

- Checking Accounts
- Savings Accounts
- Certificates of Deposit (CDs)

The solution consolidates product performance metrics into a single interface and uses AI-generated insights to help Product Owners move from monitoring performance to making informed product decisions — with the decision itself left to the Product Owner's judgment.

For the qualifying round, the team will build two interconnected mock-up pages:

1. **Portfolio Overview:** A landing page displaying product-level KPIs, quarterly targets, and performance alerts.
2. **CD Opportunity Intelligence:** A detailed page that helps the Product Owner investigate an underperforming CD acquisition metric and understand which customer segments represent opportunities.

The goal is to demonstrate a compelling Product Owner experience rather than build a fully functional banking analytics platform.

All customer data, financial figures, and estimates used in this prototype are synthetic and illustrative.

---

## 2. Problem Statement

Product Owners at large financial institutions may need to gather information from multiple sources to understand product performance.

Relevant information can be distributed across customer analytics, financial reporting, marketing, and product management systems.

This creates three challenges:

**Fragmented visibility:** Product Owners may lack a unified view of how their products are performing against business objectives.

**Reactive decision-making:** Product Owners may identify performance issues too late to take effective corrective action.

**Limited actionable insight:** Even when an underperforming metric is identified, understanding which customer segments or product levers deserve attention can require additional analysis.

### Our Solution

A unified, AI-powered dashboard that helps Product Owners answer three questions:

1. **What is happening?** Which products and KPIs are performing above or below expectations?
2. **Why does it matter?** Which metrics are at risk of missing their quarterly targets?
3. **Where are the opportunities?** Which customer segments and product levers could the Product Owner explore to improve performance?

---

## 3. User Persona

### Primary User: PNC Consumer Deposits Product Owner

The primary user is responsible for overseeing the performance of one or more consumer deposit products.

Typical responsibilities include:

- Tracking product adoption and account growth.
- Monitoring business and customer experience KPIs.
- Identifying opportunities to improve product performance.
- Prioritizing product initiatives.
- Coordinating with marketing, analytics, engineering, and other stakeholders.

### Primary User Goal

Understand which product metrics require attention and have the evidence needed to decide how to improve performance against quarterly objectives.

---

## 4. Page 1: Portfolio Overview

**Owner: Nripesh Kumar (Developer 1)**

### Objective

Provide an intuitive overview of PNC's consumer deposit portfolio.

The page should help a Product Owner understand the health of each product category within seconds.

### Layout

The landing page contains three primary product cards.

| Product | Description |
|---|---|
| Checking | Everyday transaction accounts |
| Savings | Interest-bearing deposit accounts |
| Certificates of Deposit | Time-bound deposit accounts with defined maturity periods |

Each card displays several KPIs and their progress toward quarterly targets.

### KPIs

**Checking Accounts**

| KPI | Quarterly Target | Current Value | Status |
|---|---:|---:|---|
| New Account Openings | 12,000 | 9,800 | On Track |
| Digital Account Opening Completion Rate | 75% | 69% | At Risk |
| Active Account Rate | 85% | 87% | On Track |

**Savings Accounts**

| KPI | Quarterly Target | Current Value | Status |
|---|---:|---:|---|
| New Account Openings | 8,000 | 7,100 | On Track |
| Net New Deposits | $40M | $36M | On Track |
| Digital Enrollment Rate | 70% | 73% | On Track |

**Certificate of Deposit Accounts**

| KPI | Quarterly Target | Current Value | Status |
|---|---:|---:|---|
| New CD Account Openings | 5,000 | 3,100 | At Risk |
| CD Renewal Rate | 65% | 67% | On Track |
| Net New CD Deposits | $25M | $22M | On Track |

These values are synthetic and may be adjusted to create a realistic demonstration.

### KPI Progress Bars

Each KPI includes a horizontal progress bar representing progress toward the quarterly target:

`Progress (%) = Current Value / Quarterly Target × 100`

Progress is visually capped at 100%, while the actual percentage may be displayed separately if it exceeds the target.

For example, **CD Account Openings** — Current: 3,100, Quarterly Target: 5,000, Progress: 62%

`[████████████░░░░░░░░] 62%`

### Risk Classification

**A metric is not at risk simply because it is below 100%.** Achieving 60% of a quarterly target halfway through the quarter may indicate healthy performance.

The prototype compares actual performance against the expected pace of progress. For cumulative metrics such as account openings:

`Expected Progress = Quarterly Target × Fraction of Quarter Elapsed`

**Status logic:**

| Status | Definition | Visual Indicator |
|---|---|---|
| On Track | Actual performance is at least 95% of expected progress | Green |
| Watch | Actual performance is 85–95% of expected progress | Amber |
| At Risk | Actual performance is below 85% of expected progress | Red |

For the prototype, assume that **80% of the quarter has elapsed**.

For CD account openings:

- Quarterly target: 5,000
- Expected openings by today: 4,000
- Actual openings: 3,100
- Performance versus expected pace: 77.5%

Therefore, CD account openings are **At Risk**. The landing page should communicate this distinction clearly.

For rate-based KPIs, such as renewal rate, the dashboard compares the current rate with its target or an appropriate forecast rather than using the cumulative progress formula.

### Visual Design Requirements

- A professional, enterprise banking dashboard design.
- A header identifying the application as PNC Product Intelligence Hub.
- A selected reporting period (Q3 2026).
- Three clearly differentiated product cards.
- KPI progress bars.
- Status indicators using color and text.
- A prominent alert for the CD acquisition metric.
- A clear way to navigate to the CD Opportunity Intelligence page.

The interface should prioritize clarity over visual complexity.

### Primary Interaction

The Product Owner notices that CD account openings are at risk.

Clicking either the CD card or the highlighted CD account openings KPI navigates to the second page. The CD card is clickable as a whole, while the at-risk KPI within it is visually emphasized.

**Navigation destination:** `/cd-opportunities`

The selected metric should be passed to the second page or otherwise reflected in its context.

---

## 5. Page 2: CD Opportunity Intelligence

**Owner: Kem Hannarong (Developer 2)**

### Objective

Help the Product Owner understand where opportunities exist to improve CD account acquisition and close the gap against the quarterly target.

The page should answer:

**Which customer segments represent promising opportunities for additional CD account openings, and what does the Product Owner need to know to decide where to focus?**

This page is the central demonstration of the product's AI-powered decision-support capabilities.

> **Tone principle: insights, not recommendations.** This page surfaces evidence, trade-offs, and open questions. It does not tell the Product Owner what to do. Avoid labels such as "Recommended", "Recommendation", "Suggested action", or "You should". Prefer language such as "Insight", "Opportunity signal", "Product levers to explore", "Considerations", and "Questions to validate". The decision belongs to the Product Owner's judgment.

---

### 5.1 Context From the Landing Page

The page preserves the metric selected on the landing page.

**Selected KPI: New CD Account Openings**

| Metric | Value |
|---|---:|
| Quarterly Target | 5,000 |
| Current Openings | 3,100 |
| Target Attainment | 62% |
| Quarter Elapsed | 80% |
| Expected Openings to Date | 4,000 |
| Current Pace Gap | 900 |
| Remaining Openings Needed | 1,900 |
| Status | At Risk |

The dashboard must distinguish between the **current pace gap of 900 accounts** and the **1,900 additional openings needed to meet the full quarterly target**. These are different metrics and should not be confused.

**Alert copy:**

"CD account openings are behind the expected quarterly pace. Explore customer segments to understand where acquisition opportunities exist."

---

### 5.2 AI-Identified Customer Opportunities

The page presents customer segments that could plausibly be interested in opening a CD, grounded in recognizable customer financial behaviors.

#### Segment 1: High-Balance Savings Customers

**Description:** Existing PNC savings customers who maintain relatively high balances over time.

**Potential indicators**

- Consistently high savings balances.
- Low withdrawal frequency.
- Stable balances over several months.
- No existing CD relationship.

**Why this segment may be relevant:** Customers maintaining substantial unused savings balances may be interested in earning a predictable return on funds they do not need immediately.

**Product levers to explore:** In-app education about CD benefits, term options, and liquidity trade-offs.

**Considerations:** How much of these balances serve as emergency reserves? Would CD adoption cannibalize savings balances rather than bring in new deposits?

---

#### Segment 2: Customers With Maturing CDs

**Description:** Existing CD customers whose accounts are approaching maturity.

**Potential indicators**

- CD maturity within the next 30–60 days.
- Previous renewal history.
- Existing relationship with PNC.
- Potential interest in reinvesting funds.

**Why this segment may be relevant:** Customers with maturing CDs have already demonstrated familiarity with the product and may be more receptive to opening another CD than customers who have never used one.

**Product levers to explore:** Maturity notifications, the renewal journey, and visibility into available CD terms.

**Considerations:** How many of these customers already auto-renew? What share would open a new qualifying CD rather than renew?

**Important measurement distinction:** Automatic renewal of an existing CD is not counted as a new account opening unless PNC's metric definition explicitly permits it. The prototype focuses on customers opening a qualifying new CD account.

---

#### Segment 3: Checking Customers With Persistent Surplus Balances

**Description:** Existing checking customers who consistently maintain balances substantially above their normal transaction needs.

**Potential indicators**

- Consistent excess checking balances.
- Stable cash flow.
- Limited short-term withdrawals.
- No existing CD account.

**Why this segment may be relevant:** These customers may have funds that could be allocated toward longer-term savings products.

**Product levers to explore:** Personalized educational content about the differences between checking, savings, and CDs.

**Considerations:** Excess checking balances are not automatically appropriate for a CD. Suitability and liquidity needs come first.

---

### 5.3 Customer Segment Comparison

The interface compares the three segments using synthetic analytics.

| Segment | Eligible Customers | Estimated Conversion Rate | Potential New CD Accounts |
|---|---:|---:|---:|
| High-Balance Savings | 12,000 | 8% | 960 |
| Maturing CD Customers | 6,000 | 10% | 600 |
| Surplus Checking Balances | 15,000 | 5% | 750 |
| **Total** | **33,000** | — | **2,310** |

`Potential New Accounts = Eligible Customers × Estimated Conversion Rate`

- All conversion rates and customer counts are hypothetical and must not be presented as validated predictions.
- Segments are treated as mutually exclusive for this simplified mock-up. A real implementation would need to deduplicate overlapping customers.

**Key insight:** The three illustrative segments represent a combined potential of 2,310 additional CD accounts, which exceeds the remaining quarterly gap of 1,900 accounts. This is a hypothetical opportunity, not a guaranteed outcome.

---

### 5.4 Opportunity Insights

The dashboard translates segment-level analytics into insights the Product Owner can weigh. Each insight states what the data shows, the trade-off, and what would need to be validated. None of them prescribes an action.

#### Insight 1: High-Balance Savings Customers Are the Largest Opportunity

- **Opportunity size:** 960 potential new CD accounts (largest of the three).
- **What the data shows:** A large eligible population with stable, rarely-withdrawn balances.
- **Trade-off:** Moving funds from savings to CDs may shift deposits rather than grow them.
- **To validate:** The assumed 8% conversion rate; net effect on total deposits.

#### Insight 2: Maturing CD Customers Have the Highest Assumed Conversion Rate

- **Opportunity size:** 600 potential new CD accounts.
- **What the data shows:** The smallest population, but customers already familiar with CDs (10% assumed conversion).
- **Trade-off:** Many may simply auto-renew, which does not count toward new openings.
- **To validate:** The share of maturing customers who would open a new qualifying CD.

#### Insight 3: Surplus Checking Customers Are the Broadest but Least Certain Opportunity

- **Opportunity size:** 750 potential new CD accounts.
- **What the data shows:** The largest eligible population (15,000) with the lowest assumed conversion rate (5%).
- **Trade-off:** Surplus balances may reflect upcoming expenses; suitability is less clear.
- **To validate:** Whether surplus balances are persistent and whether customers understand deposit product options.

---

### 5.5 AI Insight Panel

The page includes an AI-generated summary card.

**AI Opportunity Summary (example copy)**

"CD account openings are currently 900 accounts behind the expected quarterly pace, with 1,900 openings still needed to reach the quarterly target. Three customer segments show signals of CD interest, with an illustrative combined opportunity of 2,310 new accounts.

High-balance savings customers represent the largest individual opportunity, while customers with maturing CDs have the highest assumed conversion rate. Surplus checking customers form the broadest population but carry the most uncertainty about suitability.

Key open questions: how many savings balances would shift rather than grow, and how many maturing CDs would auto-renew instead of opening new accounts. These conversion assumptions should be validated before estimating business impact."

The qualifying-round prototype uses a prewritten insight generated from synthetic data. A live AI model is not required.

---

## 6. User Journey

1. **Product Owner opens the dashboard.** They view the performance of Checking, Savings, and CD products. Most metrics are on track, but CD account openings are highlighted in red.
2. **Product Owner identifies a problem.** CD account openings are behind the expected quarterly pace — target 5,000, current 3,100, expected to date 4,000.
3. **Product Owner investigates.** Clicking the highlighted CD metric navigates to the CD Opportunity Intelligence page.
4. **AI surfaces opportunities.** The page presents three customer segments, each with an explanation of why those customers may be interested in opening a CD.
5. **Product Owner weighs the evidence.** They review opportunity sizes, trade-offs, and open questions for each segment.
6. **Product Owner decides on a next step.** Using their own judgment, they choose an opportunity to investigate further — for example, validating the conversion assumption for high-balance savings customers.

The prototype does not launch campaigns, prescribe actions, or make customer-level financial recommendations.

---

## 7. Technical Architecture

### Implementation Philosophy

The qualifying-round prototype prioritizes:

1. Visual quality.
2. A convincing Product Owner workflow.
3. Consistent data between pages.
4. Simple navigation.
5. Reliable demonstration behavior.

It does not require production banking infrastructure.

### Technology Stack

| Component | Technology |
|---|---|
| Frontend | React |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Build Tool | Vite |
| Routing | React Router |
| Charts | Recharts |
| Icons | Lucide React |
| Data | Local TypeScript fixtures |
| AI Insights | Prewritten insights from synthetic data |

### Planned Repository Structure

```text
cmu-case-comp-2026/
│
├── README.md
├── package.json
├── src/
│   ├── components/
│   │   ├── Header.tsx            (shared)
│   │   ├── StatusBadge.tsx       (shared)
│   │   ├── KPIProgressBar.tsx    (shared)
│   │   ├── ProductCard.tsx       (Developer 1)
│   │   └── InsightCard.tsx       (Developer 2)
│   │
│   ├── pages/
│   │   ├── PortfolioOverview.tsx         (Developer 1)
│   │   └── CDOpportunityIntelligence.tsx (Developer 2)
│   │
│   ├── data/
│   │   ├── productMetrics.ts     (shared contract)
│   │   └── cdSegments.ts         (shared contract)
│   │
│   ├── types/
│   │   └── index.ts              (shared contract)
│   │
│   ├── App.tsx                   (routing)
│   └── main.tsx
│
└── public/
```

These files do not exist yet; they will be created during scaffolding.

---

## 8. Collaboration and Division of Responsibilities

The two pages are developed independently and integrated into a single application.

### Developer 1 — Nripesh Kumar: Portfolio Overview

- Build the landing page.
- Create the Checking, Savings, and CD cards.
- Implement KPI progress bars.
- Display quarterly targets and current values.
- Implement risk indicators.
- Build navigation to the CD detail page.
- Ensure a responsive, professional interface.

**Primary file:** `src/pages/PortfolioOverview.tsx`

### Developer 2 — Kem Hannarong: CD Opportunity Intelligence

- Build the CD detail page.
- Display the selected KPI and performance gap.
- Create customer segment cards.
- Present segment-level opportunity estimates.
- Display opportunity insights (not recommendations — see the tone principle in Section 5).
- Implement the AI insight summary.
- Ensure the page visually matches the landing page.

**Primary file:** `src/pages/CDOpportunityIntelligence.tsx`

### Shared Responsibilities

Both developers agree on:

- The frontend framework.
- Component styling conventions.
- KPI definitions.
- Synthetic data values.
- Navigation behavior.
- Shared types.
- The final demonstration flow.

Changes to shared files (`src/types/`, `src/data/`, shared components, `App.tsx`, Tailwind config) should be discussed with the other developer before merging.

---

## 9. Shared Data Contract

Both pages read the CD acquisition metric from one central definition rather than hardcoding their own values.

```typescript
export const cdAcquisitionMetric = {
  id: "cd-new-accounts",
  product: "cd",
  label: "New CD Account Openings",
  quarter: "Q3 2026",
  target: 5000,
  actual: 3100,
  quarterElapsed: 0.8,
  unit: "accounts",
  status: "at-risk",
};
```

### Customer Segment Data

```typescript
export const cdCustomerSegments = [
  {
    id: "high-balance-savings",
    name: "High-Balance Savings Customers",
    eligibleCustomers: 12000,
    estimatedConversionRate: 0.08,
    productLevers:
      "In-app education about CD benefits, terms, and liquidity trade-offs.",
    considerations:
      "May shift deposits from savings rather than grow total deposits."
  },
  {
    id: "maturing-cds",
    name: "Customers With Maturing CDs",
    eligibleCustomers: 6000,
    estimatedConversionRate: 0.10,
    productLevers:
      "Maturity notifications and the new CD opening journey.",
    considerations:
      "Auto-renewals do not count as new account openings."
  },
  {
    id: "surplus-checking",
    name: "Customers With Persistent Checking Surpluses",
    eligibleCustomers: 15000,
    estimatedConversionRate: 0.05,
    productLevers:
      "Educational content about longer-term deposit options.",
    considerations:
      "Surplus balances are not automatically suitable for a CD."
  }
];
```

Derived values — potential new accounts (`eligibleCustomers × estimatedConversionRate`), expected progress, pace gap, remaining openings, and status — should be calculated from these fields rather than stored as duplicated values.

---

## 10. Design Guidelines

The application should resemble a polished enterprise analytics platform.

### Visual Direction

- Clean, modern banking dashboard.
- White or light-neutral background.
- Restrained use of PNC-inspired orange and blue.
- Clear typography.
- Generous spacing.
- Simple cards with subtle borders or shadows.
- Strong visual hierarchy.

### Status Colors

| Status | Color |
|---|---|
| On Track | Green |
| Watch | Amber |
| At Risk | Red |

Status must also be communicated using text or icons, not color alone.

### Interaction Guidelines

- Make clickable elements visually obvious.
- Use consistent navigation.
- Avoid unnecessary animations.
- Display units and reporting periods.
- Clearly label synthetic estimates.
- Ensure keyboard-accessible navigation.

---

## 11. Scope

### In Scope

- Two interconnected mock-up pages.
- Three consumer deposit product categories.
- Synthetic KPI data.
- Quarterly target tracking.
- Performance risk highlighting.
- CD customer segment analysis.
- Illustrative AI insights.
- Interactive navigation.
- Responsive frontend design.

### Out of Scope

- Real PNC customer data.
- Production banking integrations.
- Live predictive modeling.
- Prescriptive recommendations or automated decisions.
- Actual campaign execution.
- Customer-level targeting.
- Real financial product recommendations.
- Authentication or authorization.
- Backend infrastructure.

The prototype demonstrates how an AI-enabled Product Ownership experience could work, not an operational PNC system.

---

## 12. Responsible AI and Banking Considerations

The system supports Product Owner decision-making rather than automating or prescribing consequential decisions.

**Data privacy:** Production implementation would require appropriate controls for customer data access, storage, and processing.

**Fairness:** Customer segmentation and targeting would need to comply with applicable banking requirements and avoid unfair or discriminatory outcomes.

**Explainability:** Insights should include understandable reasons and supporting metrics.

**Human judgment:** The AI surfaces evidence and open questions; the Product Owner decides what to act on.

**Model uncertainty:** Conversion estimates should communicate assumptions and uncertainty rather than appear guaranteed.

**Customer suitability:** CD opportunities should consider liquidity needs, product terms, and customer interests.

The prototype makes clear that its segmentation and conversion figures are hypothetical.

---

## 13. Demo Acceptance Criteria

The prototype is ready for the qualifying-round demonstration when:

**Portfolio Overview (Nripesh)**

- [ ] The landing page displays Checking, Savings, and CD cards.
- [ ] Each card displays relevant KPIs and quarterly targets.
- [ ] Progress bars accurately reflect target attainment.
- [ ] CD account openings are visibly marked as at risk.
- [ ] The at-risk status is supported by the quarter-elapsed calculation.
- [ ] Clicking the CD card or KPI opens the CD detail page.

**CD Opportunity Intelligence (Kem)**

- [ ] The CD detail page displays the same KPI values as the landing page.
- [ ] Three customer segments are displayed.
- [ ] Each segment includes a rationale and potential opportunity.
- [ ] Opportunity estimates are mathematically consistent.
- [ ] Opportunity insights show trade-offs and open questions, without prescriptive recommendations.
- [ ] An AI insight summary connects the metric gap to the opportunities.
- [ ] Users can return to the landing page.

**Whole app (both)**

- [ ] The interface works without external APIs.
- [ ] Synthetic data is clearly labeled.
- [ ] The application runs locally without errors.

---

## 14. Future Vision

The qualifying-round prototype focuses on one use case: understanding customer acquisition opportunities for an underperforming CD product.

A future implementation could extend the framework to:

- Real-time KPI monitoring.
- Forecasting quarterly performance.
- Customer journey analytics.
- Marketing campaign performance.
- Product backlog prioritization.
- Cross-functional insights.
- Natural-language queries.
- AI agents that investigate performance anomalies.
- Human-approved workflow orchestration.

For example, a Product Owner could eventually ask:

"Why are CD account openings below target, and what evidence do we have about where to focus?"

The system could combine product performance, customer behavior, and operational information to provide an evidence-based answer.

---

## 15. Project Success Criteria

The prototype should demonstrate that an AI-enabled Product Ownership framework can help Product Owners:

**Identify problems faster:** Surface at-risk KPIs without manual investigation across multiple dashboards.

**Understand opportunities:** Connect underperforming metrics with potentially relevant customer segments.

**Decide with confidence:** Present clear evidence, trade-offs, and open questions that inform the Product Owner's own judgment.

**Align teams:** Establish a common view of performance that supports conversations across Product, Marketing, Analytics, and Engineering.

### Product Vision

**From fragmented dashboards to intelligent product decisions.**

---

## 16. Getting Started

### Build Order

1. **Scaffold (one developer, on `main`):** Vite + React + TypeScript + Tailwind + React Router, shared types (`src/types/index.ts`), shared data (`src/data/`), shared components (`Header`, `StatusBadge`, `KPIProgressBar`), routing in `App.tsx`, and placeholder pages for `/` and `/cd-opportunities`.
2. **Parallel work:** Each developer branches from `main` after scaffolding and builds their page on their own feature branch.
3. **Integration:** Open a pull request into `main`; the other developer reviews it. Run through the full demo flow (Section 6) after both pages are merged.

### Git Workflow

```bash
git clone https://github.com/nrikmr-builds/cmu-case-comp-2026.git
cd cmu-case-comp-2026
git checkout -b feature/cd-opportunity-intelligence   # or feature/portfolio-overview
# ...build, commit...
git push -u origin feature/cd-opportunity-intelligence
# open a pull request into main
```

- Keep page-specific code inside your own page file and page-specific components.
- Coordinate before editing shared files (see Section 8).
- Keep `main` runnable at all times.
