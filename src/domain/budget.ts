import { computeBalances, computeBalancesFrom, effectiveDate } from './balances'
import { addMonths, monthOf } from './dates'
import { isExpenseBucket, isSavingsBucket } from './models'
import type { LedgerEvent } from './types'
import type { Bucket } from './models'

export interface BucketMonth {
  bucketId: string
  carryoverCents: number
  /** Net assigned this month (money returned to available-to-assign counts as negative). */
  allocatedCents: number
  movedInCents: number
  movedOutCents: number
  spentCents: number
  plannedCents: number
  coveredCents: number
  uncoveredCents: number
  varianceCents: number
  /** carryover + allocated + movedIn - movedOut - spent. Can be negative (overspent). */
  availableCents: number
}

export interface MonthBudget {
  month: string
  buckets: BucketMonth[]
  incomeCents: number
  allocatedCents: number
  spentCents: number
  coverableSpentCents: number
  plannedCents: number
  budgetVarianceCents: number
  coveredExpenseCents: number
  uncoveredExpenseCents: number
  /** Money received but not yet assigned, as of the end of this month. */
  unallocatedCents: number
}

export function computeMonthBudget(
  events: LedgerEvent[],
  bucketDefinitions: (string | Pick<Bucket, 'id' | 'kind' | 'monthlyTargetCents' | 'archived'>)[],
  month: string, // 'YYYY-MM'
): MonthBudget {
  const definitions = new Map(bucketDefinitions.map((bucket) => [
    typeof bucket === 'string' ? bucket : bucket.id,
    typeof bucket === 'string' ? null : bucket,
  ]))
  const bucketIds = [...definitions.keys()]
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
        plannedCents: 0,
        coveredCents: 0,
        uncoveredCents: 0,
        varianceCents: 0,
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

  const buckets = [...rows.values()].map((r) => {
    const definition = definitions.get(r.bucketId)
    const isPlannedExpense = definition !== null && definition !== undefined
      && !definition.archived && isExpenseBucket(definition)
    const plannedCents = isPlannedExpense ? definition.monthlyTargetCents : 0
    // Coverage is based on intentional month allocations and bucket moves. Carryover remains
    // assigned and rolls forward, but Cover expenses only creates a current-month allocation.
    const assignedForCoverage = Math.max(0, r.allocatedCents + r.movedInCents - r.movedOutCents)
    const coveredCents = Math.min(r.spentCents, assignedForCoverage)
    return {
      ...r,
      plannedCents,
      coveredCents,
      uncoveredCents: Math.max(0, r.spentCents - coveredCents),
      varianceCents: isPlannedExpense ? plannedCents - r.spentCents : 0,
      availableCents: r.carryoverCents + r.allocatedCents + r.movedInCents - r.movedOutCents - r.spentCents,
    }
  })

  const plannedCents = buckets.reduce((total, bucket) => total + bucket.plannedCents, 0)
  const expenseRows = buckets.filter((bucket) => {
    const definition = definitions.get(bucket.bucketId)
    // String-only ids are retained for older callers and tests, and represent expense buckets.
    return definition === null || definition === undefined || (!definition.archived && isExpenseBucket(definition))
  })
  const coveredExpenseCents = expenseRows.reduce((total, bucket) => total + bucket.coveredCents, 0)
  const uncoveredExpenseCents = expenseRows.reduce((total, bucket) => total + bucket.uncoveredCents, 0)
  const coverableSpentCents = expenseRows.reduce((total, bucket) => total + bucket.spentCents, 0)

  return {
    month,
    buckets,
    incomeCents,
    allocatedCents,
    spentCents,
    coverableSpentCents,
    plannedCents,
    budgetVarianceCents: plannedCents - spentCents,
    coveredExpenseCents,
    uncoveredExpenseCents,
    unallocatedCents: end.unallocated,
  }
}

function lastActiveMonth(events: LedgerEvent[], month: string): string {
  return events.reduce((m, e) => {
    const k = monthOf(effectiveDate(e))
    return k > m ? k : m
  }, month)
}

/**
 * The most that can be assigned in `month` without available money going negative
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

export interface SavingsFundingPlan {
  steps: { bucketId: string; cents: number }[]
  /** Total amount still needed to meet contribution targets this month. */
  needCents: number
  givenCents: number
  shortfallCents: number
}
export type RainPlan = SavingsFundingPlan

/**
 * Explicitly fill savings contribution targets in the order given. This is kept
 * separate from expense coverage so a planned expense target never allocates money.
 */
function planTargetFunding(
  events: LedgerEvent[],
  buckets: { id: string; monthlyTargetCents: number }[],
  month: string,
): SavingsFundingPlan {
  const budget = computeMonthBudget(events, buckets.map((b) => b.id), month)
  const assigned = new Map(budget.buckets.map((r) => [r.bucketId, r.allocatedCents]))
  let pool = maxAllocatable(events, month)
  let needCents = 0
  const steps: SavingsFundingPlan['steps'] = []

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

/** Explicitly fund configured contribution targets for active savings buckets. */
export function planSavingsFunding(
  events: LedgerEvent[],
  buckets: Pick<Bucket, 'id' | 'kind' | 'monthlyTargetCents' | 'archived'>[],
  month: string,
): SavingsFundingPlan {
  return planTargetFunding(
    events,
    buckets.filter((bucket) => !bucket.archived && isSavingsBucket(bucket)).map(({ id, monthlyTargetCents }) => ({ id, monthlyTargetCents })),
    month,
  )
}

/** Backwards-compatible alias for existing callers and saved client code. */
export const planRain = planTargetFunding

export interface ExpenseCoveragePlan {
  steps: { bucketId: string; cents: number }[]
  needCents: number
  givenCents: number
  shortfallCents: number
}

/** Cover only actual expenses not already assigned in the selected month. */
export function planExpenseCoverage(
  events: LedgerEvent[],
  buckets: Pick<Bucket, 'id' | 'kind' | 'monthlyTargetCents' | 'archived'>[],
  month: string,
): ExpenseCoveragePlan {
  const activeBuckets = buckets.filter((bucket) => !bucket.archived && isExpenseBucket(bucket))
  const budget = computeMonthBudget(events, buckets, month)
  let pool = maxAllocatable(events, month)
  let needCents = 0
  const steps: ExpenseCoveragePlan['steps'] = []

  for (const bucket of activeBuckets) {
    const uncovered = budget.buckets.find((row) => row.bucketId === bucket.id)?.uncoveredCents ?? 0
    needCents += uncovered
    const give = Math.min(uncovered, pool)
    if (give > 0) {
      steps.push({ bucketId: bucket.id, cents: give })
      pool -= give
    }
  }

  const givenCents = steps.reduce((total, step) => total + step.cents, 0)
  return { steps, needCents, givenCents, shortfallCents: needCents - givenCents }
}
