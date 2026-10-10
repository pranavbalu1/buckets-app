import type { EventType, LedgerEvent } from './types'

export const TYPE_LABELS: Record<EventType, string> = {
  income: 'Income',
  expense: 'Expense',
  allocation: 'Assigned',
  bucket_move: 'Moved',
  account_transfer: 'Transfer',
  adjustment: 'Adjustment',
}

type NameOf = (id: string | null) => string

export function describeEvent(e: LedgerEvent, account: NameOf, bucket: NameOf): string {
  switch (e.type) {
    case 'income':
      return `Deposited to ${account(e.accountId)}`
    case 'expense':
      return `${bucket(e.bucketId)} · ${account(e.accountId)}`
    case 'allocation': {
      const month = e.month?.slice(0, 7) ?? ''
      return e.direction === 'out'
        ? `${bucket(e.bucketId)} → Available to assign (${month})`
        : `Available to assign → ${bucket(e.bucketId)} (${month})`
    }
    case 'bucket_move':
      return `${bucket(e.bucketId)} → ${bucket(e.toBucketId)}`
    case 'account_transfer':
      return `${account(e.accountId)} → ${account(e.toAccountId)}`
    case 'adjustment':
      return `${account(e.accountId)} (${e.direction})`
  }
}

/** Signed effect on money you own, or null for events that only move money around. */
export function cashEffect(e: LedgerEvent): number | null {
  switch (e.type) {
    case 'income':
      return e.amountCents
    case 'expense':
      return -e.amountCents
    case 'adjustment':
      return e.direction === 'in' ? e.amountCents : -e.amountCents
    default:
      return null
  }
}
