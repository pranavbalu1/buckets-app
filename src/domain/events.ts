import type { DraftEvent } from './types'

/**
 * Builds a complete event with the nullable fields required by the ledger
 * schema. Keeping defaults here prevents each form and workflow from having to
 * know the database shape.
 */
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
    customType: null,
    description: '',
    payee: null,
    notes: null,
    ...fields,
  }
}
