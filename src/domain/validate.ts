import type { LedgerEvent } from './types'

/** Mirrors the database constraint. Returns an error message, or null if valid. */
export function validateEvent(e: LedgerEvent): string | null {
  if (!Number.isInteger(e.amountCents) || e.amountCents <= 0) return 'Amount must be a positive whole number of cents'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) return 'Date must be YYYY-MM-DD'
  switch (e.type) {
    case 'income':
      return e.accountId ? null : 'Income needs an account'
    case 'allocation':
      return e.bucketId && e.month ? null : 'Allocation needs a bucket and a month'
    case 'expense':
      return e.accountId && e.bucketId ? null : 'Expense needs an account and a bucket'
    case 'account_transfer':
      if (!e.accountId || !e.toAccountId) return 'Transfer needs two accounts'
      return e.accountId === e.toAccountId ? 'Transfer accounts must differ' : null
    case 'bucket_move':
      if (!e.bucketId || !e.toBucketId) return 'Move needs two buckets'
      return e.bucketId === e.toBucketId ? 'Move buckets must differ' : null
    case 'adjustment':
      return e.accountId && e.direction ? null : 'Adjustment needs an account and a direction'
  }
}