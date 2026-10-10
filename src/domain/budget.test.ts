import { describe, expect, it } from 'vitest'
import { computeBalances } from './balances'
import { computeMonthBudget, planExpenseCoverage, planSavingsFunding } from './budget'
import { ev } from './fixtures'

const buckets = ['groc', 'ent']
const income = (amountCents: number) => ev({ type: 'income', date: '2026-10-01', amountCents, accountId: 'chk' })
const assign = (bucketId: string, amountCents: number) => ev({
  type: 'allocation', date: '2026-10-02', month: '2026-10-01', amountCents, bucketId,
})
const expenseBuckets = [
  { id: 'groc', kind: 'plain' as const, monthlyTargetCents: 50000, archived: false },
  { id: 'ent', kind: 'recurring' as const, monthlyTargetCents: 20000, archived: false },
]

function ledger(sepSpend = 35000) {
  return [
    ev({ type: 'income', date: '2026-09-01', amountCents: 400000, accountId: 'chk' }),
    ev({ id: 'sep-alloc', type: 'allocation', date: '2026-09-01', month: '2026-09-01', amountCents: 40000, bucketId: 'groc' }),
    ev({ id: 'sep-spend', type: 'expense', date: '2026-09-15', amountCents: sepSpend, accountId: 'chk', bucketId: 'groc' }),
    ev({ type: 'allocation', date: '2026-10-01', month: '2026-10-01', amountCents: 40000, bucketId: 'groc' }),
  ]
}

describe('computeMonthBudget', () => {
  it('rolls leftover money into the next month (the September -> October example)', () => {
    const sep = computeMonthBudget(ledger(), buckets, '2026-09').buckets.find((b) => b.bucketId === 'groc')!
    expect(sep).toMatchObject({ carryoverCents: 0, allocatedCents: 40000, spentCents: 35000, availableCents: 5000 })

    const oct = computeMonthBudget(ledger(), buckets, '2026-10').buckets.find((b) => b.bucketId === 'groc')!
    expect(oct).toMatchObject({ carryoverCents: 5000, allocatedCents: 40000, spentCents: 0, availableCents: 45000 })
  })

  it('past months are unaffected by later activity', () => {
    const before = computeMonthBudget(ledger(), buckets, '2026-09')
    const later = [...ledger(), ev({ type: 'expense', date: '2026-10-20', amountCents: 9999, accountId: 'chk', bucketId: 'groc' })]
    expect(computeMonthBudget(later, buckets, '2026-09')).toEqual(before)
  })

  it('editing an old transaction updates later carryover', () => {
    const oct = computeMonthBudget(ledger(30000), buckets, '2026-10').buckets.find((b) => b.bucketId === 'groc')!
    expect(oct.carryoverCents).toBe(10000)
  })

  it('reports unallocated money as of month end, excluding later-month allocations', () => {
    expect(computeMonthBudget(ledger(), buckets, '2026-09').unallocatedCents).toBe(360000)
    expect(computeMonthBudget(ledger(), buckets, '2026-10').unallocatedCents).toBe(320000)
  })

  it('shows overspending as a negative available amount', () => {
    const events = [
      ev({ type: 'income', date: '2026-10-01', amountCents: 10000, accountId: 'chk' }),
      ev({ type: 'allocation', date: '2026-10-01', month: '2026-10-01', amountCents: 5000, bucketId: 'ent' }),
      ev({ type: 'expense', date: '2026-10-02', amountCents: 7000, accountId: 'chk', bucketId: 'ent' }),
    ]
    const row = computeMonthBudget(events, buckets, '2026-10').buckets.find((b) => b.bucketId === 'ent')!
    expect(row.availableCents).toBe(-2000)
  })

  it('available always equals the derived bucket balance at month end', () => {
    const events = [
      ...ledger(),
      ev({ type: 'bucket_move', date: '2026-10-05', amountCents: 3000, bucketId: 'groc', toBucketId: 'ent' }),
    ]
    const budget = computeMonthBudget(events, buckets, '2026-10')
    const balances = computeBalances(events, '2026-10-31')
    for (const row of budget.buckets) {
      expect(row.availableCents).toBe(balances.buckets[row.bucketId] ?? 0)
    }
  })
})

describe('expense-first coverage', () => {
  const spend = (bucketId: string, amountCents: number, date = '2026-10-12') =>
    ev({ type: 'expense', date, amountCents, accountId: 'chk', bucketId })

  it('covers $400 of a $500 target and keeps the unused target unallocated', () => {
    const events = [income(50000), spend('groc', 40000)]
    const plan = planExpenseCoverage(events, expenseBuckets, '2026-10')
    expect(plan.steps).toEqual([{ bucketId: 'groc', cents: 40000 }])

    const covered = [...events, ...plan.steps.map(({ bucketId, cents }) => assign(bucketId, cents))]
    const month = computeMonthBudget(covered, expenseBuckets, '2026-10')
    expect(month).toMatchObject({ plannedCents: 70000, spentCents: 40000, coverableSpentCents: 40000, budgetVarianceCents: 30000, unallocatedCents: 10000 })
    expect(month.buckets.find((row) => row.bucketId === 'groc')).toMatchObject({
      plannedCents: 50000, spentCents: 40000, coveredCents: 40000, uncoveredCents: 0, varianceCents: 10000, availableCents: 0,
    })
    expect(computeMonthBudget(covered, expenseBuckets, '2026-11').buckets.find((row) => row.bucketId === 'groc')?.carryoverCents).toBe(0)
    expect(computeBalances(covered).accounts.chk).toBe(10000)
  })

  it('covers exact-plan and over-plan spending without capping at the target', () => {
    const exact = computeMonthBudget([income(100000), spend('groc', 50000)], expenseBuckets, '2026-10')
    expect(exact.buckets.find((row) => row.bucketId === 'groc')?.varianceCents).toBe(0)
    expect(planExpenseCoverage([income(100000), spend('groc', 50000)], expenseBuckets, '2026-10').steps)
      .toEqual([{ bucketId: 'groc', cents: 50000 }])

    const events = [income(100000), spend('groc', 65000)]
    const plan = planExpenseCoverage(events, expenseBuckets, '2026-10')
    expect(plan.steps).toEqual([{ bucketId: 'groc', cents: 65000 }])
    expect(computeMonthBudget(events, expenseBuckets, '2026-10').buckets.find((row) => row.bucketId === 'groc')?.varianceCents).toBe(-15000)
  })

  it('is idempotent and covers only newly uncovered later spending', () => {
    const initial = [income(100000), spend('groc', 40000)]
    const first = planExpenseCoverage(initial, expenseBuckets, '2026-10')
    const applied = [...initial, ...first.steps.map(({ bucketId, cents }) => assign(bucketId, cents))]
    expect(planExpenseCoverage(applied, expenseBuckets, '2026-10').steps).toEqual([])

    const withNextExpense = [...applied, spend('groc', 10000, '2026-10-20')]
    expect(planExpenseCoverage(withNextExpense, expenseBuckets, '2026-10').steps)
      .toEqual([{ bucketId: 'groc', cents: 10000 }])
  })

  it('subtracts existing allocations and does not fund expense targets with no spending', () => {
    const events = [income(100000), assign('groc', 25000), spend('groc', 40000)]
    expect(planExpenseCoverage(events, expenseBuckets, '2026-10').steps)
      .toEqual([{ bucketId: 'groc', cents: 15000 }])
    expect(planExpenseCoverage([income(100000)], expenseBuckets, '2026-10').steps).toEqual([])
  })

  it('covers each bucket independently and excludes savings goals from expense coverage', () => {
    const definitions = [
      ...expenseBuckets,
      { id: 'save', kind: 'save_by_deposit' as const, monthlyTargetCents: 10000, archived: false },
    ]
    const events = [income(100000), spend('groc', 30000), spend('ent', 25000), spend('save', 5000)]
    const plan = planExpenseCoverage(events, definitions, '2026-10')
    expect(plan.steps).toEqual([{ bucketId: 'groc', cents: 30000 }, { bucketId: 'ent', cents: 25000 }])
    const summary = computeMonthBudget(events, definitions, '2026-10')
    expect(summary).toMatchObject({ plannedCents: 70000, spentCents: 60000, budgetVarianceCents: 10000 })
    expect(summary.buckets.find((row) => row.bucketId === 'save')).toMatchObject({ plannedCents: 0, varianceCents: 0 })
  })

  it('keeps explicit savings contribution funding available without expense activity', () => {
    const plan = planSavingsFunding([income(30000)], [{ id: 'emergency', kind: 'save_by_deposit', monthlyTargetCents: 20000, archived: false }], '2026-10')
    expect(plan.steps).toEqual([{ bucketId: 'emergency', cents: 20000 }])
  })

  it('keeps historical month totals independent from later transactions', () => {
    const events = [income(100000), spend('groc', 40000, '2026-10-12')]
    const before = computeMonthBudget(events, expenseBuckets, '2026-10')
    const after = computeMonthBudget([...events, spend('groc', 50000, '2026-11-02')], expenseBuckets, '2026-10')
    expect(after).toEqual(before)
  })
})
