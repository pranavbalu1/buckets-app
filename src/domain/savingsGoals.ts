import { addMonths } from './dates'
import type { Bucket } from './models'

export interface SavingsGoalProjection {
  remainingCents: number | null
  progressPercent: number | null
  targetDatePassed: boolean
  monthsThroughTarget: number | null
  requiredMonthlyCents: number | null
  estimatedCompletionMonth: string | null
  projectedBalanceAtTargetCents: number | null
}

/** Project goal progress from a bucket's period-end balance and monthly plan. */
export function projectSavingsGoal(bucket: Bucket, balanceCents: number, asOf: string): SavingsGoalProjection {
  const hasAmountGoal = bucket.targetCents !== null && bucket.targetCents > 0
  const goalRemaining = hasAmountGoal ? Math.max(0, bucket.targetCents! - balanceCents) : null
  const progressPercent = hasAmountGoal ? Math.max(0, balanceCents / bucket.targetCents! * 100) : null
  const month = asOf.slice(0, 7)
  const selectedMonthIndex = monthIndex(month)
  const targetMonthIndex = bucket.targetDate ? monthIndex(bucket.targetDate.slice(0, 7)) : null
  const targetDatePassed = bucket.targetDate !== null && (
    asOf.length >= 10
      ? bucket.targetDate < asOf
      : targetMonthIndex !== null && targetMonthIndex <= selectedMonthIndex
  )
  const monthsThroughTarget = targetMonthIndex === null || targetDatePassed
    ? null
    : targetMonthIndex - selectedMonthIndex + 1

  const requiredMonthlyCents = goalRemaining !== null && monthsThroughTarget !== null
    ? Math.ceil(goalRemaining / monthsThroughTarget)
    : null

  const paceCents = bucket.monthlyTargetCents
  const monthsToGoal = goalRemaining === null || goalRemaining === 0 || paceCents <= 0
    ? goalRemaining === 0 ? 0 : null
    : Math.ceil(goalRemaining / paceCents)
  const estimatedCompletionMonth = monthsToGoal === null
    ? null
    : addMonths(month, monthsToGoal)

  const futureDeposits = targetMonthIndex === null || targetDatePassed
    ? null
    : Math.max(0, targetMonthIndex - selectedMonthIndex)
  const projectedBalanceAtTargetCents = futureDeposits === null
    ? null
    : balanceCents + futureDeposits * paceCents

  return {
    remainingCents: goalRemaining,
    progressPercent,
    targetDatePassed,
    monthsThroughTarget,
    requiredMonthlyCents,
    estimatedCompletionMonth,
    projectedBalanceAtTargetCents,
  }
}

function monthIndex(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  return year * 12 + monthNumber - 1
}
