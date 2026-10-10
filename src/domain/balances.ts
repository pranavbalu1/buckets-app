import type { LedgerEvent } from './types'

export interface Balances {
  accounts: Record<string, number>
  buckets: Record<string, number>
  unallocated: number
}

/** The date an event takes effect. Allocations take effect in their budget month. */
export function effectiveDate(e: LedgerEvent): string {
  return e.type === 'allocation' && e.month ? e.month : e.date
}

function need(value: string | null, name: string): string {
  if (!value) throw new Error(`Event is missing ${name}`)
  return value
}

function add(record: Record<string, number>, id: string, delta: number): void {
  record[id] = (record[id] ?? 0) + delta
}

export function applyEvent(b: Balances, e: LedgerEvent): void {
  const amt = e.amountCents
  switch (e.type) {
    case 'income':
      add(b.accounts, need(e.accountId, 'accountId'), amt)
      b.unallocated += amt
      break
    case 'allocation': {
      // direction 'out' returns money from the bucket to the unallocated pool.
      const sign = e.direction === 'out' ? -1 : 1
      b.unallocated -= sign * amt
      add(b.buckets, need(e.bucketId, 'bucketId'), sign * amt)
      break
    }
    case 'expense':
      add(b.accounts, need(e.accountId, 'accountId'), -amt)
      add(b.buckets, need(e.bucketId, 'bucketId'), -amt)
      break
    case 'account_transfer':
      add(b.accounts, need(e.accountId, 'accountId'), -amt)
      add(b.accounts, need(e.toAccountId, 'toAccountId'), amt)
      break
    case 'bucket_move':
      add(b.buckets, need(e.bucketId, 'bucketId'), -amt)
      add(b.buckets, need(e.toBucketId, 'toBucketId'), amt)
      break
    case 'adjustment': {
      const sign = e.direction === 'in' ? 1 : -1
      add(b.accounts, need(e.accountId, 'accountId'), sign * amt)
      b.unallocated += sign * amt
      break
    }
  }
}

export function computeBalancesFrom(events: LedgerEvent[]): Balances {
  const b: Balances = { accounts: {}, buckets: {}, unallocated: 0 }
  for (const e of events) applyEvent(b, e)
  return b
}

/** Balances as of a date (inclusive, 'YYYY-MM-DD'). Omit asOf to include everything. */
export function computeBalances(events: LedgerEvent[], asOf?: string): Balances {
  const included = asOf ? events.filter((e) => effectiveDate(e) <= asOf) : events
  return computeBalancesFrom(included)
}
