export type EventType =
  | 'income'
  | 'allocation'
  | 'expense'
  | 'account_transfer'
  | 'bucket_move'
  | 'adjustment'

export interface LedgerEvent {
  id: string
  type: EventType
  /** Calendar date, 'YYYY-MM-DD' (no timezone) */
  date: string
  /** First day of the budget month, 'YYYY-MM-01'. Used by allocations. */
  month: string | null
  /** Always a positive integer. Direction comes from the type. */
  amountCents: number
  accountId: string | null
  toAccountId: string | null
  bucketId: string | null
  toBucketId: string | null
  /** Adjustments only */
  direction: 'in' | 'out' | null
  /** Optional user-defined label; the built-in type still determines ledger behavior. */
  customType?: string | null
  description: string
  payee: string | null
  notes: string | null
}

/** A ledger event before the database assigns it an id. */
export type DraftEvent = Omit<LedgerEvent, 'id'>
