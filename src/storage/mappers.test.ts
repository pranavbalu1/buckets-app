import { describe, expect, it } from 'vitest'
import { eventToRow, parseBucket, parseEvent } from './mappers'

describe('mappers', () => {
  it('round-trips a ledger event between app and database shapes', () => {
    const event = {
      type: 'expense' as const,
      date: '2026-10-03',
      month: null,
      amountCents: 7243,
      accountId: 'a1',
      toAccountId: null,
      bucketId: 'b1',
      toBucketId: null,
      direction: null,
      description: 'Walmart',
      payee: 'Walmart',
      notes: null,
    }
    expect(parseEvent({ id: 'x', ...eventToRow(event) })).toEqual({ id: 'x', ...event })
  })

  it('converts bucket column names', () => {
    const b = parseBucket({
      id: 'b', group_id: 'g', name: 'Gas', kind: 'spending', sort_order: 3, archived: false,
      monthly_target_cents: 5000, color: '#3b82f6',
    })
    expect(b).toEqual({
      id: 'b', groupId: 'g', name: 'Gas', kind: 'spending', sortOrder: 3, archived: false,
      monthlyTargetCents: 5000, color: '#3b82f6',
    })
  })

  it('rejects rows with an unknown event type', () => {
    expect(() => parseEvent({ id: 'x', type: 'bogus' })).toThrow()
  })
})