import type { DraftEvent } from './types'

/** Builds a complete event, defaulting every optional field to null/empty. */
export function makeEvent(
  fields: Pick<DraftEvent, 'type' | 'date' | 'amountCents'> & Partial<DraftEvent>,
): DraftEvent {
  return {
    month: null,
    accountId: null,
    toAccountId: null,
    bucketId: null,
    toBucketId: null,
    direction: null,
    description: '',
    payee: null,
    notes: null,
    ...fields,
  }
}