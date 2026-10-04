import { describe, expect, it } from 'vitest'
import { computeBalances } from './balances'
import { ev } from './fixtures'
import type { LedgerEvent } from './types'

const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0)

describe('computeBalances', () => {
  it('income raises the account and the unallocated pool', () => {
    const b = computeBalances([ev({ type: 'income', date: '2026-10-01', amountCents: 400000, accountId: 'chk' })])
    expect(b.accounts.chk).toBe(400000)
    expect(b.unallocated).toBe(400000)
  })

  it('allocation moves money from unallocated to a bucket', () => {
    const b = computeBalances([
      ev({ type: 'income', date: '2026-10-01', amountCents: 400000, accountId: 'chk' }),
      ev({ type: 'allocation', date: '2026-10-01', month: '2026-10-01', amountCents: 40000, bucketId: 'groc' }),
    ])
    expect(b.unallocated).toBe(360000)
    expect(b.buckets.groc).toBe(40000)
    expect(b.accounts.chk).toBe(400000)
  })

  it('expense lowers both the account and the bucket', () => {
    const b = computeBalances([
      ev({ type: 'income', date: '2026-10-01', amountCents: 400000, accountId: 'chk' }),
      ev({ type: 'allocation', date: '2026-10-01', month: '2026-10-01', amountCents: 40000, bucketId: 'groc' }),
      ev({ type: 'expense', date: '2026-10-03', amountCents: 7243, accountId: 'chk', bucketId: 'groc' }),
    ])
    expect(b.accounts.chk).toBe(392757)
    expect(b.buckets.groc).toBe(32757)
    expect(b.unallocated).toBe(360000)
  })

  it('bucket moves change only buckets', () => {
    const b = computeBalances([
      ev({ type: 'income', date: '2026-10-01', amountCents: 100000, accountId: 'chk' }),
      ev({ type: 'allocation', date: '2026-10-01', month: '2026-10-01', amountCents: 20000, bucketId: 'ent' }),
      ev({ type: 'bucket_move', date: '2026-10-02', amountCents: 5000, bucketId: 'ent', toBucketId: 'groc' }),
    ])
    expect(b.buckets.ent).toBe(15000)
    expect(b.buckets.groc).toBe(5000)
    expect(b.accounts.chk).toBe(100000)
    expect(b.unallocated).toBe(80000)
  })

  it('account transfers change only accounts', () => {
    const b = computeBalances([
      ev({ type: 'income', date: '2026-10-01', amountCents: 100000, accountId: 'chk' }),
      ev({ type: 'account_transfer', date: '2026-10-02', amountCents: 30000, accountId: 'chk', toAccountId: 'sav' }),
    ])
    expect(b.accounts).toEqual({ chk: 70000, sav: 30000 })
    expect(b.unallocated).toBe(100000)
  })

  it('credit card spending makes the card balance negative', () => {
    const b = computeBalances([
      ev({ type: 'income', date: '2026-10-01', amountCents: 50000, accountId: 'chk' }),
      ev({ type: 'allocation', date: '2026-10-01', month: '2026-10-01', amountCents: 20000, bucketId: 'groc' }),
      ev({ type: 'expense', date: '2026-10-02', amountCents: 8000, accountId: 'card', bucketId: 'groc' }),
    ])
    expect(b.accounts.card).toBe(-8000)
    expect(b.buckets.groc).toBe(12000)
  })

  it('reconciliation adjustments keep the invariant', () => {
    const b = computeBalances([
      ev({ type: 'income', date: '2026-10-01', amountCents: 10000, accountId: 'chk' }),
      ev({ type: 'adjustment', date: '2026-10-05', amountCents: 250, accountId: 'chk', direction: 'out' }),
    ])
    expect(b.accounts.chk).toBe(9750)
    expect(b.unallocated).toBe(9750)
  })

  it('asOf excludes later events, and allocations count in their month', () => {
    const events = [
      ev({ type: 'income', date: '2026-09-01', amountCents: 100000, accountId: 'chk' }),
      ev({ type: 'allocation', date: '2026-09-20', month: '2026-10-01', amountCents: 40000, bucketId: 'groc' }),
    ]
    expect(computeBalances(events, '2026-09-30').buckets.groc).toBeUndefined()
    expect(computeBalances(events, '2026-09-30').unallocated).toBe(100000)
    expect(computeBalances(events, '2026-10-31').buckets.groc).toBe(40000)
  })

  it('invariant: accounts = buckets + unallocated, for random ledgers', () => {
    let seed = 12345
    const rand = (n: number) => {
      seed = (seed * 1664525 + 1013904223) % 4294967296
      return seed % n
    }
    const accounts = ['a1', 'a2', 'a3']
    const buckets = ['b1', 'b2', 'b3']
    const pick = <T,>(xs: T[]) => xs[rand(xs.length)]
    const events: LedgerEvent[] = []

    for (let i = 0; i < 200; i++) {
      const mm = String(9 + rand(3)).padStart(2, '0')
      const date = `2026-${mm}-${String(1 + rand(28)).padStart(2, '0')}`
      const amountCents = 1 + rand(100000)
      const type = pick(['income', 'allocation', 'expense', 'account_transfer', 'bucket_move', 'adjustment'] as const)
      const a = pick(accounts)
      const a2 = pick(accounts.filter((x) => x !== a))
      const k = pick(buckets)
      const k2 = pick(buckets.filter((x) => x !== k))
      events.push(
        ev({
          type, date, amountCents,
          month: type === 'allocation' ? `2026-${mm}-01` : null,
          accountId: ['income', 'expense', 'account_transfer', 'adjustment'].includes(type) ? a : null,
          toAccountId: type === 'account_transfer' ? a2 : null,
          bucketId: ['allocation', 'expense', 'bucket_move'].includes(type) ? k : null,
          toBucketId: type === 'bucket_move' ? k2 : null,
          direction: type === 'adjustment' ? (rand(2) ? 'in' : 'out') : null,
        }),
      )
    }

    for (let i = 1; i <= events.length; i++) {
      const b = computeBalances(events.slice(0, i))
      expect(sum(b.accounts)).toBe(sum(b.buckets) + b.unallocated)
    }
    const mid = computeBalances(events, '2026-10-15')
    expect(sum(mid.accounts)).toBe(sum(mid.buckets) + mid.unallocated)
  })
})