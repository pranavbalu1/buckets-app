import { describe, expect, it } from 'vitest'
import { maxAllocatable } from './budget'
import { makeEvent } from './events'
import { ev } from './fixtures'
import { validateEvent } from './validate'

describe('makeEvent', () => {
  it('builds a valid expense', () => {
    const e = makeEvent({ type: 'expense', date: '2026-10-03', amountCents: 7243, accountId: 'a', bucketId: 'b' })
    expect(validateEvent(e)).toBeNull()
  })

  it('is rejected when required fields are missing', () => {
    const e = makeEvent({ type: 'expense', date: '2026-10-03', amountCents: 100, accountId: 'a' })
    expect(validateEvent(e)).toMatch(/bucket/)
  })

  it('rejects a transfer to the same account', () => {
    const e = makeEvent({ type: 'account_transfer', date: '2026-10-03', amountCents: 100, accountId: 'a', toAccountId: 'a' })
    expect(validateEvent(e)).toMatch(/differ/)
  })
})

describe('maxAllocatable', () => {
  const income = (date: string, amountCents: number) =>
    ev({ type: 'income', date, amountCents, accountId: 'chk' })
  const alloc = (month: string, amountCents: number) =>
    ev({ type: 'allocation', date: '2026-10-01', month: `${month}-01`, amountCents, bucketId: 'groc' })

  it('is zero with no income', () => {
    expect(maxAllocatable([], '2026-10')).toBe(0)
  })

  it('is income minus what is already assigned', () => {
    expect(maxAllocatable([income('2026-10-01', 100000), alloc('2026-10', 40000)], '2026-10')).toBe(60000)
  })

  it('protects later months that already depend on the money', () => {
    expect(maxAllocatable([income('2026-10-01', 100000), alloc('2026-11', 30000)], '2026-10')).toBe(70000)
  })

  it('does not count income that arrives after the dip', () => {
    const events = [income('2026-10-01', 50000), income('2026-12-01', 50000), alloc('2026-12', 80000)]
    expect(maxAllocatable(events, '2026-11')).toBe(20000)
  })
})