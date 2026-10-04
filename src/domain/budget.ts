import { computeBalances, computeBalancesFrom, effectiveDate } from './balances'
import { addMonths, monthOf } from './dates'
import type { LedgerEvent } from './types'

export interface BucketMonth {
  bucketId: string
  carryoverCents: number
  /** Net assigned this month (money returned to Rain counts as negative). */
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
  /** Money received but not yet assigned ("Rain"), as of the end of this month */
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
      case 'allocation': {
        const net = e.direction === 'out' ? -e.amountCents : e.amountCents
        row(e.bucketId!).allocatedCents += net
        allocatedCents += net
        break
      }
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

function lastActiveMonth(events: LedgerEvent[], month: string): string {
  return events.reduce((m, e) => {
    const k = monthOf(effectiveDate(e))
    return k > m ? k : m
  }, month)
}

/**
 * The most that can be assigned in `month` without Rain going negative
 * in that month or any later one.
 */
export function maxAllocatable(events: LedgerEvent[], month: string): number {
  const last = lastActiveMonth(events, month)
  let min = Infinity
  for (let m = month; m <= last; m = addMonths(m, 1)) {
    min = Math.min(min, computeBalances(events, `${m}-31`).unallocated)
  }
  return Math.max(0, min)
}

/**
 * The most that can be taken out of a bucket in `month` without its balance
 * going negative in that month or any later one.
 */
export function maxReturnable(events: LedgerEvent[], bucketId: string, month: string): number {
  const last = lastActiveMonth(events, month)
  let min = Infinity
  for (let m = month; m <= last; m = addMonths(m, 1)) {
    min = Math.min(min, computeBalances(events, `${m}-31`).buckets[bucketId] ?? 0)
  }
  return Math.max(0, min)
}

export interface RainPlan {
  steps: { bucketId: string; cents: number }[]
  /** Total still wanted across buckets this month */
  needCents: number
  givenCents: number
  shortfallCents: number
}

/**
 * "Make it rain": fill each bucket up to its monthly Want, in the order given,
 * until the Rain pool runs out. Counts what was already assigned this month,
 * so running it twice never double-assigns.
 */
export function planRain(
  events: LedgerEvent[],
  buckets: { id: string; monthlyTargetCents: number }[],
  month: string,
): RainPlan {
  const budget = computeMonthBudget(events, buckets.map((b) => b.id), month)
  const assigned = new Map(budget.buckets.map((r) => [r.bucketId, r.allocatedCents]))
  let pool = maxAllocatable(events, month)
  let needCents = 0
  const steps: RainPlan['steps'] = []

  for (const b of buckets) {
    const want = Math.max(0, b.monthlyTargetCents - (assigned.get(b.id) ?? 0))
    if (want === 0) continue
    needCents += want
    const give = Math.min(want, pool)
    if (give > 0) {
      steps.push({ bucketId: b.id, cents: give })
      pool -= give
    }
  }

  const givenCents = steps.reduce((sum, s) => sum + s.cents, 0)
  return { steps, needCents, givenCents, shortfallCents: needCents - givenCents }
}