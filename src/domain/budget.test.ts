import { describe, expect, it } from 'vitest'
import { computeBalances } from './balances'
import { computeMonthBudget } from './budget'
import { ev } from './fixtures'

const buckets = ['groc', 'ent']

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