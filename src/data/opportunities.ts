// PLACEHOLDER DATA: hypothetical segments and conversion rates, not predictions.
import type { ProductOpportunity } from '../types'

export const opportunities: ProductOpportunity[] = [
  {
    productId: 'checking',
    shortName: 'Checking',
    accountNoun: 'checking account',
    focusKpiId: 'checking-new-accounts',
    openQuestions:
      'how many savings-only customers already bank primarily elsewhere, and why abandoned digital applications dropped off',
    segments: [
      {
        id: 'savings-only',
        name: 'Savings-Only Customers',
        whyRelevant: 'Already trust PNC with savings but spend from another bank.',
        consideration: 'May keep their primary checking elsewhere and leave a new account inactive.',
        eligibleCustomers: 20000,
        estimatedConversionRate: 0.08,
      },
      {
        id: 'abandoned-digital',
        name: 'Abandoned Digital Applications',
        whyRelevant: 'Started a checking application online this quarter but did not finish.',
        consideration: 'Some dropped off at ID verification, which outreach alone may not fix.',
        eligibleCustomers: 6000,
        estimatedConversionRate: 0.25,
      },
      {
        id: 'young-adults',
        name: 'Young Adults',
        whyRelevant: 'Turning 18 or starting college and opening a first account.',
        consideration: 'Lower balances; may need fee waivers to be worthwhile.',
        eligibleCustomers: 25000,
        estimatedConversionRate: 0.06,
      },
    ],
  },
  {
    productId: 'savings',
    shortName: 'Savings',
    accountNoun: 'savings account',
    focusKpiId: 'savings-new-accounts',
    openQuestions:
      'how much would move over from checking rather than add new deposits, and whether maturing-CD money stays at PNC',
    segments: [
      {
        id: 'checking-only',
        name: 'Checking-Only Customers',
        whyRelevant: 'Steady direct deposits but no savings account.',
        consideration: 'Small starting balances may not grow deposits much.',
        eligibleCustomers: 30000,
        estimatedConversionRate: 0.04,
      },
      {
        id: 'high-balance-checking',
        name: 'High-Balance Checking',
        whyRelevant: 'Idle cash well above everyday needs, earning little.',
        consideration: 'May prefer to keep cash liquid in checking.',
        eligibleCustomers: 10000,
        estimatedConversionRate: 0.05,
      },
      {
        id: 'maturing-cds-savings',
        name: 'Maturing CDs',
        whyRelevant: 'Cash coming free that customers may want to keep flexible.',
        consideration: "Moving from a CD to savings doesn't add new deposits.",
        eligibleCustomers: 4000,
        estimatedConversionRate: 0.08,
      },
    ],
  },
  {
    productId: 'cd',
    shortName: 'CD',
    accountNoun: 'CD',
    focusKpiId: 'cd-new-accounts',
    openQuestions: 'how much savings would shift rather than grow, and how many maturing CDs would auto-renew',
    segments: [
      {
        id: 'high-balance-savings',
        name: 'High-Balance Savings',
        whyRelevant: "Large, stable savings balances they don't touch.",
        consideration: 'May shift money out of savings rather than add new deposits.',
        eligibleCustomers: 12000,
        estimatedConversionRate: 0.08,
      },
      {
        id: 'maturing-cds',
        name: 'Maturing CDs',
        whyRelevant: 'Already know and use CDs.',
        consideration: "Auto-renewals don't count as new account openings.",
        eligibleCustomers: 6000,
        estimatedConversionRate: 0.1,
      },
      {
        id: 'surplus-checking',
        name: 'Surplus Checking',
        whyRelevant: 'Balances well above everyday transaction needs.',
        consideration: "Extra cash isn't automatically right for a CD.",
        eligibleCustomers: 15000,
        estimatedConversionRate: 0.05,
      },
    ],
  },
]

export function getOpportunity(productId: string): ProductOpportunity | undefined {
  return opportunities.find((o) => o.productId === productId)
}
