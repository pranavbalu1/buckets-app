import { z } from 'zod'
import { ACCOUNT_TYPES, BUCKET_KINDS, LEGACY_BUCKET_KINDS } from '../domain/models'
import {
  dateSchema,
  entityNameSchema,
  ledgerEventSchema,
  paycheckTemplateInputSchema,
  reconciliationInputSchema,
  recurringPlanInputSchema,
} from '../domain/validate'

const safeInteger = z.number().int().safe()
const sortOrder = safeInteger.nonnegative()
const color = z.string().regex(/^#[\da-f]{6}$/i).nullable()
const account = z.object({
  id: z.string().uuid(), name: entityNameSchema, type: z.enum(ACCOUNT_TYPES),
  sortOrder, archived: z.boolean(),
})
const group = z.object({
  id: z.string().uuid(), name: entityNameSchema, sortOrder, color,
})
const bucket = z.object({
  id: z.string().uuid(), groupId: z.string().uuid().nullable(), name: entityNameSchema,
  kind: z.union([z.enum(BUCKET_KINDS), z.enum(LEGACY_BUCKET_KINDS)]),
  sortOrder, archived: z.boolean(), monthlyTargetCents: safeInteger.nonnegative(),
  targetCents: safeInteger.nonnegative().nullable(), targetDate: dateSchema.nullable(), color,
})
const event = z.intersection(z.object({ id: z.string().uuid() }), ledgerEventSchema)
const recurringPlan = z.object({
  id: z.string().uuid(), name: entityNameSchema, eventType: z.enum(['income', 'expense', 'account_transfer', 'bucket_move']),
  amountCents: safeInteger.positive(), accountId: z.string().uuid().nullable(),
  toAccountId: z.string().uuid().nullable(), bucketId: z.string().uuid().nullable(), toBucketId: z.string().uuid().nullable(),
  description: z.string().trim().max(240), payee: z.string().trim().max(120).nullable(), notes: z.string().trim().max(2_000).nullable(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'yearly']), startDate: dateSchema,
  endDate: dateSchema.nullable(), nextRun: dateSchema, active: z.boolean(),
}).superRefine((row, context) => {
  const result = recurringPlanInputSchema.safeParse({
    name: row.name, eventType: row.eventType, amountCents: row.amountCents,
    accountId: row.accountId, toAccountId: row.toAccountId, bucketId: row.bucketId, toBucketId: row.toBucketId,
    description: row.description, payee: row.payee, notes: row.notes, frequency: row.frequency,
    startDate: row.startDate, endDate: row.endDate, nextRun: row.nextRun,
  })
  if (!result.success) result.error.issues.forEach((issue) => context.addIssue({ code: 'custom', path: issue.path, message: issue.message }))
})
const paycheckTemplate = z.object({
  id: z.string().uuid(), name: entityNameSchema, accountId: z.string().uuid().nullable(),
  allocations: z.array(z.object({ bucketId: z.string().uuid(), cents: safeInteger.positive() })).max(50_000),
}).superRefine((row, context) => {
  const result = paycheckTemplateInputSchema.safeParse({ name: row.name, accountId: row.accountId, allocations: row.allocations })
  if (!result.success) result.error.issues.forEach((issue) => context.addIssue({ code: 'custom', path: issue.path, message: issue.message }))
})
const reconciliation = z.object({
  id: z.string().uuid(), accountId: z.string().uuid(), date: dateSchema,
  statementBalanceCents: safeInteger, appBalanceCents: safeInteger, adjustmentEventId: z.string().uuid().nullable(),
}).superRefine((row, context) => {
  const result = reconciliationInputSchema.safeParse({
    accountId: row.accountId, date: row.date,
    statementBalanceCents: row.statementBalanceCents, appBalanceCents: row.appBalanceCents,
  })
  if (!result.success) result.error.issues.forEach((issue) => context.addIssue({ code: 'custom', path: issue.path, message: issue.message }))
})

export const backupSchema = z.object({
  format: z.literal('buckets-backup'), version: z.literal(1), exportedAt: z.iso.datetime(),
  accounts: z.array(account).max(10_000), groups: z.array(group).max(10_000), buckets: z.array(bucket).max(50_000), events: z.array(event).max(250_000),
  recurringPlans: z.array(recurringPlan).max(50_000), paycheckTemplates: z.array(paycheckTemplate).max(10_000), reconciliations: z.array(reconciliation).max(100_000),
}).superRefine((backup, context) => {
  const accountIds = new Set(backup.accounts.map((row) => row.id))
  const groupIds = new Set(backup.groups.map((row) => row.id))
  const bucketIds = new Set(backup.buckets.map((row) => row.id))
  const eventIds = new Set(backup.events.map((row) => row.id))
  const idCollections = [
    backup.accounts.map((row) => row.id), backup.groups.map((row) => row.id),
    backup.buckets.map((row) => row.id), backup.events.map((row) => row.id),
    backup.recurringPlans.map((row) => row.id), backup.paycheckTemplates.map((row) => row.id),
    backup.reconciliations.map((row) => row.id),
  ].flat()
  if (new Set(idCollections).size !== idCollections.length) context.addIssue({ code: 'custom', path: [], message: 'This backup contains duplicate record IDs.' })
  const requireRef = (id: string | null, ids: Set<string>, path: (string | number)[]) => {
    if (id && !ids.has(id)) context.addIssue({ code: 'custom', path, message: 'This backup references a record that is missing from the file.' })
  }
  backup.buckets.forEach((row, index) => requireRef(row.groupId, groupIds, ['buckets', index, 'groupId']))
  backup.events.forEach((row, index) => {
    requireRef(row.accountId, accountIds, ['events', index, 'accountId'])
    requireRef(row.toAccountId, accountIds, ['events', index, 'toAccountId'])
    requireRef(row.bucketId, bucketIds, ['events', index, 'bucketId'])
    requireRef(row.toBucketId, bucketIds, ['events', index, 'toBucketId'])
  })
  backup.recurringPlans.forEach((row, index) => {
    requireRef(row.accountId, accountIds, ['recurringPlans', index, 'accountId'])
    requireRef(row.toAccountId, accountIds, ['recurringPlans', index, 'toAccountId'])
    requireRef(row.bucketId, bucketIds, ['recurringPlans', index, 'bucketId'])
    requireRef(row.toBucketId, bucketIds, ['recurringPlans', index, 'toBucketId'])
  })
  backup.paycheckTemplates.forEach((row, index) => {
    requireRef(row.accountId, accountIds, ['paycheckTemplates', index, 'accountId'])
    row.allocations.forEach((allocation, allocationIndex) => requireRef(allocation.bucketId, bucketIds, ['paycheckTemplates', index, 'allocations', allocationIndex, 'bucketId']))
  })
  backup.reconciliations.forEach((row, index) => {
    requireRef(row.accountId, accountIds, ['reconciliations', index, 'accountId'])
    requireRef(row.adjustmentEventId, eventIds, ['reconciliations', index, 'adjustmentEventId'])
  })
})

export type AppBackup = z.infer<typeof backupSchema>

export function parseBackup(raw: unknown): AppBackup {
  return backupSchema.parse(raw)
}

/**
 * Give an imported backup fresh primary keys before restoring it. Supabase IDs are
 * global across users, so a portable or shared backup can otherwise collide with
 * records owned by a different user in the same project.
 */
export function rekeyBackupForImport(backup: AppBackup): AppBackup {
  const entities = [
    ...backup.accounts,
    ...backup.groups,
    ...backup.buckets,
    ...backup.events,
    ...backup.recurringPlans,
    ...backup.paycheckTemplates,
    ...backup.reconciliations,
  ]
  const idMap = new Map<string, string>()
  for (const entity of entities) {
    if (idMap.has(entity.id)) throw new Error('This backup contains duplicate record IDs.')
    idMap.set(entity.id, crypto.randomUUID())
  }

  const requiredId = (id: string) => {
    const replacement = idMap.get(id)
    if (!replacement) throw new Error('This backup refers to a record that is missing from the file.')
    return replacement
  }
  const optionalId = (id: string | null) => id === null ? null : requiredId(id)

  return {
    ...backup,
    accounts: backup.accounts.map((row) => ({ ...row, id: requiredId(row.id) })),
    groups: backup.groups.map((row) => ({ ...row, id: requiredId(row.id) })),
    buckets: backup.buckets.map((row) => ({
      ...row,
      id: requiredId(row.id),
      groupId: optionalId(row.groupId),
    })),
    events: backup.events.map((row) => ({
      ...row,
      id: requiredId(row.id),
      accountId: optionalId(row.accountId),
      toAccountId: optionalId(row.toAccountId),
      bucketId: optionalId(row.bucketId),
      toBucketId: optionalId(row.toBucketId),
    })),
    recurringPlans: backup.recurringPlans.map((row) => ({
      ...row,
      id: requiredId(row.id),
      accountId: optionalId(row.accountId),
      toAccountId: optionalId(row.toAccountId),
      bucketId: optionalId(row.bucketId),
      toBucketId: optionalId(row.toBucketId),
    })),
    paycheckTemplates: backup.paycheckTemplates.map((row) => ({
      ...row,
      id: requiredId(row.id),
      accountId: optionalId(row.accountId),
      allocations: row.allocations.map((allocation) => ({
        ...allocation,
        bucketId: requiredId(allocation.bucketId),
      })),
    })),
    reconciliations: backup.reconciliations.map((row) => ({
      ...row,
      id: requiredId(row.id),
      accountId: requiredId(row.accountId),
      adjustmentEventId: optionalId(row.adjustmentEventId),
    })),
  }
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
