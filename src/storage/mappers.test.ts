import { describe, expect, it } from 'vitest'
import { eventToRow, parseBucket, parseEvent } from './mappers'

describe('mappers', () => {
  it('round-trips a ledger event between app and database shapes', () => {
    const eventId = '00000000-0000-4000-8000-000000000001'
    const event = {
      type: 'expense' as const,
      date: '2026-10-03',
      month: null,
      amountCents: 7243,
      accountId: '00000000-0000-4000-8000-000000000002',
      toAccountId: null,
      bucketId: '00000000-0000-4000-8000-000000000003',
      toBucketId: null,
      direction: null,
      customType: null,
      description: 'Walmart',
      payee: 'Walmart',
      notes: null,
    }
    expect(parseEvent({ id: eventId, ...eventToRow(event) })).toEqual({ id: eventId, ...event })
  })

  it('converts bucket column names', () => {
    const bucketId = '00000000-0000-4000-8000-000000000004'
    const groupId = '00000000-0000-4000-8000-000000000005'
    const b = parseBucket({
      id: bucketId, group_id: groupId, name: 'Gas', kind: 'spending', sort_order: 3, archived: false,
      monthly_target_cents: 5000, color: '#3b82f6',
    })
    expect(b).toEqual({
      id: bucketId, groupId, name: 'Gas', kind: 'spending', sortOrder: 3, archived: false,
      monthlyTargetCents: 5000, targetCents: null, targetDate: null, color: '#3b82f6',
    })
  })

  it('rejects rows with an unknown event type', () => {
    expect(() => parseEvent({ id: '00000000-0000-4000-8000-000000000006', type: 'bogus' })).toThrow()
  })
})
