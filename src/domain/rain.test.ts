import { describe, expect, it } from 'vitest'
import { computeBalances } from './balances'
import { computeMonthBudget, maxReturnable, planRain } from './budget'
import { ev } from './fixtures'

const income = (amountCents: number) =>
  ev({ type: 'income', date: '2026-10-01', amountCents, accountId: 'chk' })

const assign = (bucketId: string, amountCents: number, direction: 'in' | 'out' | null = null, month = '2026-10-01') =>
  ev({ type: 'allocation', date: '2026-10-02', month, amountCents, bucketId, direction })

describe('allocation out (returning money to Rain)', () => {
  it('moves money from a bucket back to unallocated', () => {
    const b = computeBalances([income(100000), assign('a', 40000), assign('a', 15000, 'out')])
    expect(b.buckets.a).toBe(25000)
    expect(b.unallocated).toBe(75000)
    expect(b.accounts.chk).toBe(100000)
  })

  it('counts as negative assigned in the month view', () => {
    const m = computeMonthBudget([income(100000), assign('a', 40000), assign('a', 15000, 'out')], ['a'], '2026-10')
    expect(m.buckets[0].allocatedCents).toBe(25000)
    expect(m.allocatedCents).toBe(25000)
    expect(m.buckets[0].availableCents).toBe(25000)
  })
})

describe('maxReturnable', () => {
  it('is the bucket balance when nothing depends on it', () => {
    expect(maxReturnable([income(100000), assign('a', 40000)], 'a', '2026-10')).toBe(40000)
  })

  it('protects later months that already spent from the bucket', () => {
    const events = [
      income(100000),
      assign('a', 40000),
      ev({ type: 'expense', date: '2026-11-05', amountCents: 20000, accountId: 'chk', bucketId: 'a' }),
    ]
    expect(maxReturnable(events, 'a', '2026-10')).toBe(20000)
  })
})

describe('planRain', () => {
  const buckets = [
    { id: 'a', monthlyTargetCents: 60000 },
    { id: 'b', monthlyTargetCents: 60000 },
  ]

  it('fills buckets in order until the Rain runs out', () => {
    const plan = planRain([income(100000)], buckets, '2026-10')
    expect(plan.steps).toEqual([
      { bucketId: 'a', cents: 60000 },
      { bucketId: 'b', cents: 40000 },
    ])
    expect(plan.shortfallCents).toBe(20000)
  })

  it('subtracts what is already assigned this month', () => {
    const plan = planRain([income(100000), assign('a', 20000)], [{ id: 'a', monthlyTargetCents: 50000 }], '2026-10')
    expect(plan.steps).toEqual([{ bucketId: 'a', cents: 30000 }])
  })

  it('does nothing when there is no Rain', () => {
    const plan = planRain([], buckets, '2026-10')
    expect(plan.steps).toEqual([])
    expect(plan.shortfallCents).toBe(120000)
  })

  it('is idempotent: applying the plan leaves nothing more to do', () => {
    const base = [income(500000)]
    const plan = planRain(base, buckets, '2026-10')
    const applied = [...base, ...plan.steps.map((s) => assign(s.bucketId, s.cents))]
    expect(planRain(applied, buckets, '2026-10').steps).toEqual([])
  })
})