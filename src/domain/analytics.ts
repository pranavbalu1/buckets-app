import { addDays, addMonths, endOfMonth, endOfWeek, endOfYear, format, startOfMonth, startOfWeek, startOfYear } from 'date-fns'
import { computeBalances, effectiveDate } from './balances'
import { isExpenseBucket, isSavingsBucket } from './models'
import type { Bucket } from './models'
import type { LedgerEvent } from './types'

export type AnalyticsPeriod = 'week' | 'month' | 'year'
export interface AnalyticsPoint { label: string; income: number; spending: number; planned: number; variance: number; savings: number }
export interface AnalyticsRow {
  id: string
  name: string
  /** Kept as a compatibility alias for actual spending in existing chart consumers. */
  amount: number
  planned: number
  spent: number
  covered: number
  uncovered: number
  variance: number
}
export interface BucketActivity {
  id: string
  name: string
  isExpense: boolean
  allocated: number
  spent: number
  planned: number
  covered: number
  uncovered: number
  variance: number
  movedIn: number
  movedOut: number
}
export interface AnalyticsSummary {
  title: string
  startDate: string
  endDate: string
  incomeCents: number
  spendingCents: number
  plannedCents: number
  budgetVarianceCents: number
  allocatedCents: number
  unallocatedCents: number
  coveredExpenseCents: number
  uncoveredExpenseCents: number
  coverableSpendingCents: number
  spendingRate: number
  planUsageRate: number
  coverageRate: number
  savingsCents: number
  savingsGrowthCents: number
  savingsRate: number
  averageExpenseCents: number
  netActivityCents: number
  points: AnalyticsPoint[]
  spendingByBucket: AnalyticsRow[]
  incomeBySource: AnalyticsRow[]
  budget: AnalyticsRow[]
  largestExpenses: (LedgerEvent & { bucketName: string })[]
  periodEvents: LedgerEvent[]
  bucketActivity: BucketActivity[]
}

const localDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}
const key = (date: Date) => format(date, 'yyyy-MM-dd')
function periodBounds(period: AnalyticsPeriod, selected: Date) {
  if (period === 'week') return { start: startOfWeek(selected, { weekStartsOn: 1 }), end: endOfWeek(selected, { weekStartsOn: 1 }) }
  if (period === 'year') return { start: startOfYear(selected), end: endOfYear(selected) }
  return { start: startOfMonth(selected), end: endOfMonth(selected) }
}

export function buildAnalytics(events: LedgerEvent[], buckets: Bucket[], period: AnalyticsPeriod, selectedDate: string): AnalyticsSummary {
  const selected = localDate(selectedDate)
  const { start, end } = periodBounds(period, selected)
  const startDate = key(start)
  const endDate = key(end)
  const inPeriod = events.filter((event) => {
    const date = effectiveDate(event)
    return date >= startDate && date <= endDate
  })
  const activeBuckets = buckets.filter((bucket) => !bucket.archived)
  const expenseBuckets = activeBuckets.filter(isExpenseBucket)
  const savingsBuckets = new Set(buckets.filter(isSavingsBucket).map((bucket) => bucket.id))
  const bucketNames = new Map(buckets.map((bucket) => [bucket.id, bucket.name]))
  const expenseEvents = inPeriod.filter((event) => event.type === 'expense')
  const incomeEvents = inPeriod.filter((event) => event.type === 'income')
  const incomeCents = incomeEvents.reduce((sum, event) => sum + event.amountCents, 0)
  const spendingCents = expenseEvents.reduce((sum, event) => sum + event.amountCents, 0)
  const targetScale = period === 'year' ? 12 : period === 'week' ? 1 / 4.33 : 1
  const plannedCents = expenseBuckets.reduce((sum, bucket) => sum + Math.round(bucket.monthlyTargetCents * targetScale), 0)
  const savingsCents = inPeriod.reduce((sum, event) => {
    if (event.type === 'allocation' && event.bucketId && savingsBuckets.has(event.bucketId)) return sum + (event.direction === 'out' ? -event.amountCents : event.amountCents)
    if (event.type === 'bucket_move') return sum + (Number(Boolean(event.toBucketId && savingsBuckets.has(event.toBucketId))) - Number(Boolean(event.bucketId && savingsBuckets.has(event.bucketId)))) * event.amountCents
    return sum
  }, 0)
  const openingBalances = computeBalances(events.filter((event) => effectiveDate(event) < startDate))
  const endingBalances = computeBalances(events, endDate)
  const savingsGrowthCents = [...savingsBuckets].reduce((sum, bucketId) =>
    sum + (endingBalances.buckets[bucketId] ?? 0) - (openingBalances.buckets[bucketId] ?? 0), 0)

  const spending = new Map<string, number>()
  for (const event of expenseEvents) {
    const id = event.bucketId ?? 'unassigned'
    spending.set(id, (spending.get(id) ?? 0) + event.amountCents)
  }
  const sources = new Map<string, number>()
  for (const event of incomeEvents) {
    const name = event.payee?.trim() || event.description.trim() || 'Unspecified income'
    sources.set(name, (sources.get(name) ?? 0) + event.amountCents)
  }

  const activity = new Map<string, BucketActivity>()
  const activityRow = (id: string) => {
    let row = activity.get(id)
    if (!row) {
      const bucket = buckets.find((item) => item.id === id)
      const isExpense = bucket !== undefined && !bucket.archived && isExpenseBucket(bucket)
      const planned = isExpense
        ? Math.round(bucket.monthlyTargetCents * targetScale)
        : 0
      row = { id, name: bucketNames.get(id) ?? 'Unassigned', isExpense, allocated: 0, spent: 0, planned, covered: 0, uncovered: 0, variance: 0, movedIn: 0, movedOut: 0 }
      activity.set(id, row)
    }
    return row
  }
  for (const event of inPeriod) {
    if (event.type === 'allocation' && event.bucketId) activityRow(event.bucketId).allocated += event.direction === 'out' ? -event.amountCents : event.amountCents
    if (event.type === 'expense' && event.bucketId) activityRow(event.bucketId).spent += event.amountCents
    if (event.type === 'bucket_move') {
      if (event.bucketId) activityRow(event.bucketId).movedOut += event.amountCents
      if (event.toBucketId) activityRow(event.toBucketId).movedIn += event.amountCents
    }
  }

  let allocatedCents = 0
  for (const row of activity.values()) allocatedCents += row.allocated
  let coveredExpenseCents = 0
  let uncoveredExpenseCents = 0
  let coverableSpendingCents = 0
  for (const row of activity.values()) {
    const availableForCoverage = Math.max(0, row.allocated + row.movedIn - row.movedOut)
    row.covered = Math.min(row.spent, availableForCoverage)
    row.uncovered = Math.max(0, row.spent - row.covered)
    row.variance = row.isExpense ? row.planned - row.spent : 0
    if (row.isExpense) {
      coveredExpenseCents += row.covered
      uncoveredExpenseCents += row.uncovered
      coverableSpendingCents += row.spent
    }
  }

  // Include planned expense buckets with no activity so empty categories still appear in comparisons.
  for (const bucket of expenseBuckets) activityRow(bucket.id)
  for (const row of activity.values()) {
    row.variance = row.isExpense ? row.planned - row.spent : 0
    if (row.planned > 0 && row.spent === 0) row.uncovered = 0
  }

  const points: AnalyticsPoint[] = []
  if (period === 'year') {
    for (let cursor = startOfMonth(start); cursor <= end; cursor = addMonths(cursor, 1)) {
      const monthStart = key(cursor)
      const next = key(addMonths(cursor, 1))
      const rows = inPeriod.filter((event) => {
        const date = effectiveDate(event)
        return date >= monthStart && date < next
      })
      points.push(point(format(cursor, 'MMM'), rows, savingsBuckets, expenseBuckets.reduce((sum, bucket) => sum + bucket.monthlyTargetCents, 0)))
    }
  } else {
    const count = period === 'week' ? 7 : end.getDate()
    const periodPlan = expenseBuckets.reduce((sum, bucket) => sum + Math.round(bucket.monthlyTargetCents * targetScale), 0)
    for (let index = 0; index < count; index += 1) {
      const cursor = addDays(start, index)
      const dateKey = key(cursor)
      const rows = inPeriod.filter((event) => effectiveDate(event) === dateKey)
      points.push(point(format(cursor, period === 'week' ? 'EEE' : 'd'), rows, savingsBuckets, periodPlan / count))
    }
  }

  const budget = expenseBuckets.map((bucket) => {
    const spent = spending.get(bucket.id) ?? 0
    const activityRowValue = activity.get(bucket.id)
    return {
    id: bucket.id,
    name: bucket.name,
    amount: spent,
    spent,
    planned: Math.round(bucket.monthlyTargetCents * targetScale),
    covered: activityRowValue?.covered ?? 0,
    uncovered: activityRowValue?.uncovered ?? 0,
    variance: Math.round(bucket.monthlyTargetCents * targetScale) - spent,
  }
  }).filter((row) => row.amount > 0 || row.planned > 0).sort((a, b) => b.planned - a.planned)
  const adjustmentCents = inPeriod.reduce((sum, event) => {
    if (event.type !== 'adjustment') return sum
    return sum + (event.direction === 'in' ? event.amountCents : -event.amountCents)
  }, 0)
  const netCashFlowCents = incomeCents + adjustmentCents - spendingCents

  const title = period === 'week'
    ? `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
    : period === 'month' ? format(selected, 'MMMM yyyy') : format(selected, 'yyyy')

  return {
    title,
    startDate,
    endDate,
    incomeCents,
    spendingCents,
    plannedCents,
    budgetVarianceCents: plannedCents - spendingCents,
    allocatedCents,
    unallocatedCents: endingBalances.unallocated,
    coveredExpenseCents,
    uncoveredExpenseCents,
    coverableSpendingCents,
    spendingRate: incomeCents > 0 ? spendingCents / incomeCents * 100 : 0,
    planUsageRate: plannedCents > 0 ? spendingCents / plannedCents * 100 : 0,
    coverageRate: coverableSpendingCents > 0 ? coveredExpenseCents / coverableSpendingCents * 100 : 0,
    savingsCents,
    savingsGrowthCents,
    savingsRate: incomeCents > 0 ? savingsCents / incomeCents * 100 : 0,
    averageExpenseCents: expenseEvents.length ? Math.round(spendingCents / expenseEvents.length) : 0,
    netActivityCents: netCashFlowCents,
    points,
    spendingByBucket: [...spending].map(([id, amount]) => ({ id, name: bucketNames.get(id) ?? 'Unassigned', amount, spent: amount, planned: 0, covered: 0, uncovered: 0, variance: 0 })).sort((a, b) => b.amount - a.amount),
    incomeBySource: [...sources].map(([name, amount]) => ({ id: name, name, amount, spent: 0, planned: 0, covered: 0, uncovered: 0, variance: 0 })).sort((a, b) => b.amount - a.amount),
    budget,
    largestExpenses: expenseEvents.slice().sort((a, b) => b.amountCents - a.amountCents).slice(0, 5).map((event) => ({ ...event, bucketName: bucketNames.get(event.bucketId ?? '') ?? 'Unassigned' })),
    periodEvents: inPeriod.slice().sort((a, b) => b.date.localeCompare(a.date)),
    bucketActivity: [...activity.values()].filter((row) => row.planned > 0 || row.spent > 0 || row.allocated !== 0 || row.movedIn > 0 || row.movedOut > 0).sort((a, b) =>
      (Math.abs(b.allocated) + b.spent + b.movedIn + b.movedOut) - (Math.abs(a.allocated) + a.spent + a.movedIn + a.movedOut)),
  }
}

function point(label: string, events: LedgerEvent[], savingsBuckets: Set<string>, planned: number): AnalyticsPoint {
  const totals = events.reduce((result, event) => {
    if (event.type === 'income') result.income += event.amountCents
    if (event.type === 'expense') result.spending += event.amountCents
    if (event.type === 'allocation' && event.bucketId && savingsBuckets.has(event.bucketId)) result.savings += event.direction === 'out' ? -event.amountCents : event.amountCents
    if (event.type === 'bucket_move') result.savings += (Number(Boolean(event.toBucketId && savingsBuckets.has(event.toBucketId))) - Number(Boolean(event.bucketId && savingsBuckets.has(event.bucketId)))) * event.amountCents
    return result
  }, { income: 0, spending: 0, savings: 0 })
  return { label, ...totals, planned, variance: planned - totals.spending }
}
