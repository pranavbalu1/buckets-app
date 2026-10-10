import { describe, expect, it } from 'vitest'
import { buildAnalytics } from './analytics'
import { ev } from './fixtures'
import type { Bucket } from './models'

const buckets: Bucket[] = [
  { id: 'groceries', groupId: null, name: 'Groceries', kind: 'plain', sortOrder: 0, archived: false, monthlyTargetCents: 50000, targetCents: null, targetDate: null, color: null },
  { id: 'rent', groupId: null, name: 'Rent', kind: 'recurring', sortOrder: 1, archived: false, monthlyTargetCents: 150000, targetCents: null, targetDate: null, color: null },
  { id: 'emergency', groupId: null, name: 'Emergency fund', kind: 'save_by_deposit', sortOrder: 2, archived: false, monthlyTargetCents: 20000, targetCents: 100000, targetDate: '2027-01-01', color: null },
]

describe('buildAnalytics expense-first metrics', () => {
  it('separates plan variance, coverage, savings contributions, and unallocated money', () => {
    const events = [
      ev({ type: 'income', date: '2026-10-01', amountCents: 300000, accountId: 'checking', payee: 'Payroll' }),
      ev({ type: 'expense', date: '2026-10-10', amountCents: 40000, accountId: 'checking', bucketId: 'groceries' }),
      ev({ type: 'expense', date: '2026-10-11', amountCents: 165000, accountId: 'checking', bucketId: 'rent' }),
      ev({ type: 'allocation', date: '2026-10-12', month: '2026-10-01', amountCents: 25000, bucketId: 'groceries' }),
      ev({ type: 'allocation', date: '2026-10-12', month: '2026-10-01', amountCents: 20000, bucketId: 'emergency' }),
    ]

    const summary = buildAnalytics(events, buckets, 'month', '2026-10-15')
    expect(summary).toMatchObject({
      incomeCents: 300000,
      spendingCents: 205000,
      plannedCents: 200000,
      budgetVarianceCents: -5000,
      allocatedCents: 45000,
      unallocatedCents: 255000,
      coveredExpenseCents: 25000,
      uncoveredExpenseCents: 180000,
    })
    expect(summary.budget.find((row) => row.id === 'groceries')).toMatchObject({ planned: 50000, spent: 40000, covered: 25000, uncovered: 15000, variance: 10000 })
    expect(summary.budget.find((row) => row.id === 'rent')).toMatchObject({ planned: 150000, spent: 165000, covered: 0, uncovered: 165000, variance: -15000 })
    expect(summary.budget.some((row) => row.id === 'emergency')).toBe(false)
    expect(summary.netActivityCents).toBe(95000)
  })

  it('scales monthly expense plans by selected period and keeps later activity out of earlier periods', () => {
    const octoberEvents = [
      ev({ type: 'expense', date: '2026-10-05', amountCents: 20000, accountId: 'checking', bucketId: 'groceries' }),
    ]
    const month = buildAnalytics(octoberEvents, buckets, 'month', '2026-10-15')
    expect(month.plannedCents).toBe(200000)
    expect(month.points.reduce((total, point) => total + point.planned, 0)).toBeCloseTo(200000)

    const year = buildAnalytics(octoberEvents, buckets, 'year', '2026-10-15')
    expect(year.plannedCents).toBe(2400000)
    expect(year.points.find((point) => point.label === 'Oct')?.planned).toBe(200000)

    const later = [...octoberEvents, ev({ type: 'expense', date: '2026-11-05', amountCents: 99999, accountId: 'checking', bucketId: 'rent' })]
    expect(buildAnalytics(later, buckets, 'month', '2026-10-15')).toEqual(month)
  })
})
