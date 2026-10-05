import { z } from 'zod'
import { ACCOUNT_TYPES, BUCKET_KINDS, LEGACY_BUCKET_KINDS } from '../domain/models'
import type { Account, Bucket, BucketGroup } from '../domain/models'
import type { EventType, LedgerEvent } from '../domain/types'

const EVENT_TYPES: [EventType, ...EventType[]] = [
  'income', 'allocation', 'expense', 'account_transfer', 'bucket_move', 'adjustment',
]

const accountRow = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(ACCOUNT_TYPES),
  sort_order: z.number().int().default(0),
  archived: z.boolean(),
})

const groupRow = z.object({
  id: z.string(),
  name: z.string(),
  sort_order: z.number().int(),
  color: z.string().nullable().default(null),
})

const bucketRow = z.object({
  id: z.string(),
  group_id: z.string().nullable(),
  name: z.string(),
  kind: z.union([z.enum(BUCKET_KINDS), z.enum(LEGACY_BUCKET_KINDS)]),
  sort_order: z.number().int(),
  archived: z.boolean(),
  monthly_target_cents: z.number().int(),
  target_cents: z.number().int().nullable().default(null),
  target_date: z.string().nullable().default(null),
  color: z.string().nullable(),
})

const eventRow = z.object({
  id: z.string(),
  type: z.enum(EVENT_TYPES),
  date: z.string(),
  month: z.string().nullable(),
  amount_cents: z.number().int(),
  account_id: z.string().nullable(),
  to_account_id: z.string().nullable(),
  bucket_id: z.string().nullable(),
  to_bucket_id: z.string().nullable(),
  direction: z.enum(['in', 'out']).nullable(),
  custom_type: z.string().nullable().default(null),
  description: z.string(),
  payee: z.string().nullable(),
  notes: z.string().nullable(),
})

export const parseAccount = (row: unknown): Account => {
  const r = accountRow.parse(row)
  return { id: r.id, name: r.name, type: r.type, sortOrder: r.sort_order, archived: r.archived }
}

export function parseGroup(row: unknown): BucketGroup {
  const r = groupRow.parse(row)
  return { id: r.id, name: r.name, sortOrder: r.sort_order, color: r.color }
}

export function parseBucket(row: unknown): Bucket {
  const r = bucketRow.parse(row)
  return {
    id: r.id,
    groupId: r.group_id,
    name: r.name,
    kind: r.kind,
    sortOrder: r.sort_order,
    archived: r.archived,
    monthlyTargetCents: r.monthly_target_cents,
    targetCents: r.target_cents,
    targetDate: r.target_date,
    color: r.color,
  }
}

export function parseEvent(row: unknown): LedgerEvent {
  const r = eventRow.parse(row)
  return {
    id: r.id,
    type: r.type,
    date: r.date,
    month: r.month,
    amountCents: r.amount_cents,
    accountId: r.account_id,
    toAccountId: r.to_account_id,
    bucketId: r.bucket_id,
    toBucketId: r.to_bucket_id,
    direction: r.direction,
    customType: r.custom_type,
    description: r.description,
    payee: r.payee,
    notes: r.notes,
  }
}

export type NewEvent = Omit<LedgerEvent, 'id'>

/** App event -> database columns (user_id is filled in by the database default). */
export function eventToRow(e: NewEvent) {
  return {
    type: e.type,
    date: e.date,
    month: e.month,
    amount_cents: e.amountCents,
    account_id: e.accountId,
    to_account_id: e.toAccountId,
    bucket_id: e.bucketId,
    to_bucket_id: e.toBucketId,
    direction: e.direction,
    custom_type: e.customType ?? null,
    description: e.description,
    payee: e.payee,
    notes: e.notes,
  }
}
