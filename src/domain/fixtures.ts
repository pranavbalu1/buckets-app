import type { LedgerEvent } from './types'

let counter = 0

export function ev(
  p: Partial<LedgerEvent> & Pick<LedgerEvent, 'type' | 'date' | 'amountCents'>,
): LedgerEvent {
  return {
    id: `e${++counter}`,
    month: null,
    accountId: null,
    toAccountId: null,
    bucketId: null,
    toBucketId: null,
    direction: null,
    description: '',
    payee: null,
    notes: null,
    ...p,
  }
}