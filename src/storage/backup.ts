import { z } from 'zod'
import { ACCOUNT_TYPES, BUCKET_KINDS, LEGACY_BUCKET_KINDS } from '../domain/models'

const account = z.object({
  id: z.string().uuid(), name: z.string(), type: z.enum(ACCOUNT_TYPES),
  sortOrder: z.number().int(), archived: z.boolean(),
})
const group = z.object({
  id: z.string().uuid(), name: z.string(), sortOrder: z.number().int(), color: z.string().nullable(),
})
const bucket = z.object({
  id: z.string().uuid(), groupId: z.string().uuid().nullable(), name: z.string(),
  kind: z.union([z.enum(BUCKET_KINDS), z.enum(LEGACY_BUCKET_KINDS)]),
  sortOrder: z.number().int(), archived: z.boolean(), monthlyTargetCents: z.number().int(),
  targetCents: z.number().int().nullable(), targetDate: z.string().nullable(), color: z.string().nullable(),
})
const event = z.object({
  id: z.string().uuid(), type: z.enum(['income', 'allocation', 'expense', 'account_transfer', 'bucket_move', 'adjustment']),
  date: z.string(), month: z.string().nullable(), amountCents: z.number().int(),
  accountId: z.string().uuid().nullable(), toAccountId: z.string().uuid().nullable(),
  bucketId: z.string().uuid().nullable(), toBucketId: z.string().uuid().nullable(),
  direction: z.enum(['in', 'out']).nullable(), description: z.string(), payee: z.string().nullable(), notes: z.string().nullable(),
})
const recurringPlan = z.object({
  id: z.string().uuid(), name: z.string(), eventType: z.enum(['income', 'expense', 'account_transfer', 'bucket_move']),
  amountCents: z.number().int().positive(), accountId: z.string().uuid().nullable(),
  toAccountId: z.string().uuid().nullable(), bucketId: z.string().uuid().nullable(), toBucketId: z.string().uuid().nullable(),
  description: z.string(), payee: z.string().nullable(), notes: z.string().nullable(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'yearly']), startDate: z.string(),
  endDate: z.string().nullable(), nextRun: z.string(), active: z.boolean(),
})
const paycheckTemplate = z.object({
  id: z.string().uuid(), name: z.string(), accountId: z.string().uuid().nullable(),
  allocations: z.array(z.object({ bucketId: z.string().uuid(), cents: z.number().int().positive() })),
})
const reconciliation = z.object({
  id: z.string().uuid(), accountId: z.string().uuid(), date: z.string(),
  statementBalanceCents: z.number().int(), appBalanceCents: z.number().int(), adjustmentEventId: z.string().uuid().nullable(),
})

export const backupSchema = z.object({
  format: z.literal('buckets-backup'), version: z.literal(1), exportedAt: z.string(),
  accounts: z.array(account), groups: z.array(group), buckets: z.array(bucket), events: z.array(event),
  recurringPlans: z.array(recurringPlan), paycheckTemplates: z.array(paycheckTemplate), reconciliations: z.array(reconciliation),
})

export type AppBackup = z.infer<typeof backupSchema>

export function parseBackup(raw: unknown): AppBackup {
  return backupSchema.parse(raw)
}

export function downloadBackup(backup: AppBackup): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `buckets-backup-${backup.exportedAt.slice(0, 10)}.json`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
