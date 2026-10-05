import { z } from 'zod'
import { ACCOUNT_TYPES, BUCKET_KINDS, LEGACY_BUCKET_KINDS } from './models'
import type { DraftEvent } from './types'

const eventTypes = ['income', 'allocation', 'expense', 'account_transfer', 'bucket_move', 'adjustment'] as const
const planTypes = ['income', 'expense', 'account_transfer', 'bucket_move'] as const
const frequencies = ['weekly', 'biweekly', 'monthly', 'yearly'] as const
export const accountTypeSchema = z.enum(ACCOUNT_TYPES)
export const bucketKindSchema = z.enum(BUCKET_KINDS)
export const planTypeSchema = z.enum(planTypes)
export const frequencySchema = z.enum(frequencies)
export const directionSchema = z.enum(['in', 'out'])

export function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 1 || month < 1 || month > 12 || day < 1) return false
  const date = new Date(0)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCFullYear(year, month - 1, day)
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function isValidMonth(value: string): boolean {
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  return year >= 1 && month >= 1 && month <= 12
}

export const dateSchema = z.string().refine(isValidDate, 'Enter a valid calendar date.')
export const monthSchema = z.string().refine(isValidMonth, 'Enter a valid month.')
export const entityNameSchema = z.string().trim().min(1, 'Enter a name.').max(100, 'Names must be 100 characters or fewer.')
export const optionalDescriptionSchema = z.string().trim().max(240, 'Descriptions must be 240 characters or fewer.')
export const payeeSchema = z.string().trim().max(120, 'Payees must be 120 characters or fewer.')
export const notesSchema = z.string().trim().max(2_000, 'Notes must be 2,000 characters or fewer.')
export const customTypeSchema = z.string().trim().max(40, 'Custom transaction types must be 40 characters or fewer.')

const safeCentsSchema = z.number().int().safe('Enter an amount within the supported range.')
const positiveCentsSchema = safeCentsSchema.positive('Amount must be greater than zero.')
const nonNegativeCentsSchema = safeCentsSchema.nonnegative('Amount cannot be negative.')
const nullableIdSchema = z.string().trim().min(1).max(100).nullable()
const colorSchema = z.string().regex(/^#[\da-f]{6}$/i, 'Choose a valid six-digit color.').nullable()

export const accountInputSchema = z.object({
  name: entityNameSchema,
  type: accountTypeSchema,
  openingBalanceCents: safeCentsSchema,
})

export const accountPatchSchema = z.object({
  name: entityNameSchema.optional(),
  type: z.enum(ACCOUNT_TYPES).optional(),
  sortOrder: z.number().int().nonnegative().safe().optional(),
  archived: z.boolean().optional(),
}).refine((patch) => Object.keys(patch).length > 0, 'Choose an account change to save.')

export const groupInputSchema = z.object({
  name: entityNameSchema,
  color: colorSchema,
})

export const groupPatchSchema = z.object({
  name: entityNameSchema.optional(),
  color: colorSchema.optional(),
  sortOrder: z.number().int().nonnegative().safe().optional(),
}).refine((patch) => Object.keys(patch).length > 0, 'Choose a group change to save.')

const bucketFields = {
  name: entityNameSchema,
  kind: bucketKindSchema,
  groupId: nullableIdSchema,
  monthlyTargetCents: nonNegativeCentsSchema,
  targetCents: nonNegativeCentsSchema.nullable(),
  targetDate: dateSchema.nullable(),
  color: colorSchema,
}

export const bucketInputSchema = z.object(bucketFields).superRefine((bucket, context) => {
  if (bucket.kind === 'recurring' && bucket.monthlyTargetCents <= 0) {
    context.addIssue({ code: 'custom', path: ['monthlyTargetCents'], message: 'Enter a monthly amount greater than zero.' })
  }
  if (bucket.kind === 'save_by_date' && (!bucket.targetCents || !bucket.targetDate)) {
    context.addIssue({ code: 'custom', path: ['targetCents'], message: 'Add a target amount and date.' })
  }
  if (bucket.kind === 'save_by_deposit' && (!bucket.targetCents || bucket.monthlyTargetCents <= 0)) {
    context.addIssue({ code: 'custom', path: ['monthlyTargetCents'], message: 'Add a target amount and a monthly deposit greater than zero.' })
  }
  if (bucket.kind === 'save_until_date' && (bucket.monthlyTargetCents <= 0 || !bucket.targetDate)) {
    context.addIssue({ code: 'custom', path: ['targetDate'], message: 'Add a monthly amount and target date.' })
  }
})

/** Accept existing legacy kinds while validating mutable fields on stored buckets. */
export const bucketStateSchema = z.object({
  ...bucketFields,
  kind: z.union([bucketKindSchema, z.enum(LEGACY_BUCKET_KINDS)]),
}).superRefine((bucket, context) => {
  if (bucket.kind === 'spending' || bucket.kind === 'savings' || bucket.kind === 'obligation') return
  if (bucket.kind === 'recurring' && bucket.monthlyTargetCents <= 0) {
    context.addIssue({ code: 'custom', path: ['monthlyTargetCents'], message: 'Enter a monthly amount greater than zero.' })
  }
  if (bucket.kind === 'save_by_date' && (!bucket.targetCents || !bucket.targetDate)) {
    context.addIssue({ code: 'custom', path: ['targetCents'], message: 'Add a target amount and date.' })
  }
  if (bucket.kind === 'save_by_deposit' && (!bucket.targetCents || bucket.monthlyTargetCents <= 0)) {
    context.addIssue({ code: 'custom', path: ['monthlyTargetCents'], message: 'Add a target amount and a monthly deposit greater than zero.' })
  }
  if (bucket.kind === 'save_until_date' && (bucket.monthlyTargetCents <= 0 || !bucket.targetDate)) {
    context.addIssue({ code: 'custom', path: ['targetDate'], message: 'Add a monthly amount and target date.' })
  }
})

export const bucketPatchSchema = z.object({
  name: entityNameSchema.optional(),
  kind: bucketKindSchema.optional(),
  groupId: nullableIdSchema.optional(),
  archived: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().safe().optional(),
  monthlyTargetCents: nonNegativeCentsSchema.optional(),
  targetCents: nonNegativeCentsSchema.nullable().optional(),
  targetDate: dateSchema.nullable().optional(),
  color: colorSchema.optional(),
}).refine((patch) => Object.keys(patch).length > 0, 'Choose a bucket change to save.')

export const ledgerEventSchema = z.object({
  type: z.enum(eventTypes),
  date: dateSchema,
  month: monthSchema.nullable(),
  amountCents: positiveCentsSchema,
  accountId: nullableIdSchema,
  toAccountId: nullableIdSchema,
  bucketId: nullableIdSchema,
  toBucketId: nullableIdSchema,
  direction: directionSchema.nullable(),
  customType: customTypeSchema.nullable().optional(),
  description: optionalDescriptionSchema,
  payee: payeeSchema.nullable(),
  notes: notesSchema.nullable(),
}).superRefine((event, context) => {
  const issue = (message: string) => context.addIssue({ code: 'custom', message })
  switch (event.type) {
    case 'income':
      if (!event.accountId) issue('Income needs an account.')
      if (event.toAccountId || event.bucketId || event.toBucketId || event.month || event.direction) issue('Income contains fields that do not apply to income.')
      break
    case 'allocation':
      if (!event.bucketId || !event.month) issue('Allocation needs a bucket and a month.')
      if (event.month && !event.month.endsWith('-01')) issue('Allocation month must be the first day of the month.')
      if (event.accountId || event.toAccountId || event.toBucketId) issue('Allocation contains fields that do not apply to allocations.')
      break
    case 'expense':
      if (!event.accountId || !event.bucketId) issue('Expense needs an account and a bucket.')
      if (event.toAccountId || event.toBucketId || event.month || event.direction) issue('Expense contains fields that do not apply to expenses.')
      break
    case 'account_transfer':
      if (!event.accountId || !event.toAccountId) issue('Transfer needs two accounts.')
      else if (event.accountId === event.toAccountId) issue('Transfer accounts must differ.')
      if (event.bucketId || event.toBucketId || event.month || event.direction) issue('Transfer contains fields that do not apply to account transfers.')
      break
    case 'bucket_move':
      if (!event.bucketId || !event.toBucketId) issue('Move needs two buckets.')
      else if (event.bucketId === event.toBucketId) issue('Move buckets must differ.')
      if (event.accountId || event.toAccountId || event.month || event.direction) issue('Move contains fields that do not apply to bucket moves.')
      break
    case 'adjustment':
      if (!event.accountId || !event.direction) issue('Adjustment needs an account and a direction.')
      if (event.toAccountId || event.bucketId || event.toBucketId || event.month) issue('Adjustment contains fields that do not apply to adjustments.')
      break
  }
})

export const recurringPlanInputSchema = z.object({
  name: entityNameSchema,
  eventType: planTypeSchema,
  amountCents: positiveCentsSchema,
  accountId: nullableIdSchema,
  toAccountId: nullableIdSchema,
  bucketId: nullableIdSchema,
  toBucketId: nullableIdSchema,
  description: optionalDescriptionSchema,
  payee: payeeSchema.nullable(),
  notes: notesSchema.nullable(),
  frequency: frequencySchema,
  startDate: dateSchema,
  endDate: dateSchema.nullable(),
  nextRun: dateSchema,
}).superRefine((plan, context) => {
  const issue = (message: string) => context.addIssue({ code: 'custom', message })
  if (plan.endDate && plan.endDate < plan.startDate) issue('The end date must be on or after the start date.')
  if (plan.nextRun < plan.startDate) issue('The next date cannot be before the start date.')
  if ((plan.eventType === 'income' || plan.eventType === 'expense' || plan.eventType === 'account_transfer') && !plan.accountId) issue('Choose an account for this plan.')
  if ((plan.eventType === 'expense' || plan.eventType === 'bucket_move') && !plan.bucketId) issue('Choose a bucket for this plan.')
  if (plan.eventType === 'account_transfer' && (!plan.toAccountId || plan.toAccountId === plan.accountId)) issue('Choose two different accounts for this transfer.')
  if (plan.eventType === 'bucket_move' && (!plan.toBucketId || plan.toBucketId === plan.bucketId)) issue('Choose two different buckets for this move.')
  if (plan.eventType === 'income' && (plan.toAccountId || plan.bucketId || plan.toBucketId)) issue('Income plans contain unrelated fields.')
  if (plan.eventType === 'expense' && (plan.toAccountId || plan.toBucketId)) issue('Expense plans contain unrelated fields.')
  if (plan.eventType === 'account_transfer' && (plan.bucketId || plan.toBucketId)) issue('Transfer plans contain unrelated fields.')
  if (plan.eventType === 'bucket_move' && (plan.accountId || plan.toAccountId)) issue('Bucket move plans contain unrelated fields.')
})

export const paycheckTemplateInputSchema = z.object({
  name: entityNameSchema,
  accountId: nullableIdSchema,
  allocations: z.array(z.object({ bucketId: nullableIdSchema, cents: positiveCentsSchema })).min(1, 'Add at least one bucket allocation.'),
}).superRefine((template, context) => {
  if (!template.accountId) context.addIssue({ code: 'custom', path: ['accountId'], message: 'Choose a deposit account.' })
  if (new Set(template.allocations.map((item) => item.bucketId)).size !== template.allocations.length) {
    context.addIssue({ code: 'custom', path: ['allocations'], message: 'A bucket can appear only once in the allocation list.' })
  }
  const total = template.allocations.reduce((sum, item) => sum + item.cents, 0)
  if (!Number.isSafeInteger(total)) context.addIssue({ code: 'custom', path: ['allocations'], message: 'The allocation total exceeds the supported range.' })
})

export const reconciliationInputSchema = z.object({
  accountId: nullableIdSchema,
  date: dateSchema,
  statementBalanceCents: safeCentsSchema,
  appBalanceCents: safeCentsSchema,
}).superRefine((input, context) => {
  if (!input.accountId) context.addIssue({ code: 'custom', path: ['accountId'], message: 'Choose an account.' })
  if (!Number.isSafeInteger(input.statementBalanceCents - input.appBalanceCents)) {
    context.addIssue({ code: 'custom', path: ['statementBalanceCents'], message: 'The reconciliation difference exceeds the supported range.' })
  }
})

export function firstIssueMessage(error: z.ZodError, fallback = 'Check the entered values and try again.'): string {
  return error.issues[0]?.message ?? fallback
}

/** Mirrors transaction field and shape constraints enforced by the database. */
export function validateEvent(event: DraftEvent): string | null {
  const result = ledgerEventSchema.safeParse(event)
  return result.success ? null : firstIssueMessage(result.error, 'Enter a valid transaction.')
}
