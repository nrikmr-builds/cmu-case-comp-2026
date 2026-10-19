// PLACEHOLDER DATA: hypothetical segments and conversion rates, not predictions.
import type { CustomerSegment } from '../types'

export const cdCustomerSegments: CustomerSegment[] = [
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
]
