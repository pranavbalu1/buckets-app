import { computeBalancesFrom, effectiveDate } from './balances'
import { monthOf } from './dates'
import type { LedgerEvent } from './types'

export interface BucketMonth {
  bucketId: string
  carryoverCents: number
  allocatedCents: number
  movedInCents: number
  movedOutCents: number
  spentCents: number
  /** carryover + allocated + movedIn - movedOut - spent. Can be negative (overspent). */
  availableCents: number
}

export interface MonthBudget {
  month: string
  buckets: BucketMonth[]
  incomeCents: number
  allocatedCents: number
  spentCents: number
  /** Money received but not yet assigned, as of the end of this month */
  unallocatedCents: number
}

export function computeMonthBudget(
  events: LedgerEvent[],
  bucketIds: string[],
  month: string, // 'YYYY-MM'
): MonthBudget {
  const key = (e: LedgerEvent) => monthOf(effectiveDate(e))
  const carry = computeBalancesFrom(events.filter((e) => key(e) < month)).buckets
  const end = computeBalancesFrom(events.filter((e) => key(e) <= month))

  const rows = new Map<string, BucketMonth>()
  const row = (id: string): BucketMonth => {
    let r = rows.get(id)
    if (!r) {
      r = {
        bucketId: id,
        carryoverCents: carry[id] ?? 0,
        allocatedCents: 0,
        movedInCents: 0,
        movedOutCents: 0,
        spentCents: 0,
        availableCents: 0,
      }
      rows.set(id, r)
    }
    return r
  }
  for (const id of bucketIds) row(id)

  let incomeCents = 0
  let allocatedCents = 0
  let spentCents = 0

  for (const e of events) {
    if (key(e) !== month) continue
    switch (e.type) {
      case 'income':
        incomeCents += e.amountCents
        break
      case 'allocation':
        row(e.bucketId!).allocatedCents += e.amountCents
        allocatedCents += e.amountCents
        break
      case 'expense':
        row(e.bucketId!).spentCents += e.amountCents
        spentCents += e.amountCents
        break
      case 'bucket_move':
        row(e.bucketId!).movedOutCents += e.amountCents
        row(e.toBucketId!).movedInCents += e.amountCents
        break
    }
  }

  const buckets = [...rows.values()].map((r) => ({
    ...r,
    availableCents: r.carryoverCents + r.allocatedCents + r.movedInCents - r.movedOutCents - r.spentCents,
  }))

  return { month, buckets, incomeCents, allocatedCents, spentCents, unallocatedCents: end.unallocated }
}