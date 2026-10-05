import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const url = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const userId = process.env.SUPABASE_USER_ID
const outputPath = process.env.OUTPUT_PATH

if (!url || !serviceRoleKey || !userId || !outputPath) {
  throw new Error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_USER_ID, and OUTPUT_PATH.')
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function loadRows(table) {
  const pageSize = 1000
  const rows = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from(table).select('*').eq('user_id', userId)
      .order('id').range(from, from + pageSize - 1)
    if (error) throw new Error(`Could not export ${table}: ${error.message}`)
    rows.push(...data)
    if (data.length < pageSize) return rows
  }
}

const [accounts, groups, buckets, events, recurringPlans, paycheckTemplates, reconciliations] = await Promise.all([
  loadRows('accounts'),
  loadRows('bucket_groups'),
  loadRows('buckets'),
  loadRows('ledger_events'),
  loadRows('recurring_plans'),
  loadRows('paycheck_templates'),
  loadRows('reconciliations'),
])

const backup = {
  format: 'buckets-backup',
  version: 1,
  exportedAt: new Date().toISOString(),
  accounts: accounts.map((row) => ({
    id: row.id, name: row.name, type: row.type, sortOrder: row.sort_order, archived: row.archived,
  })),
  groups: groups.map((row) => ({
    id: row.id, name: row.name, sortOrder: row.sort_order, color: row.color,
  })),
  buckets: buckets.map((row) => ({
    id: row.id, groupId: row.group_id, name: row.name, kind: row.kind, sortOrder: row.sort_order,
    archived: row.archived, monthlyTargetCents: Number(row.monthly_target_cents),
    targetCents: row.target_cents === null ? null : Number(row.target_cents),
    targetDate: row.target_date, color: row.color,
  })),
  events: events.map((row) => ({
    id: row.id, type: row.type, date: row.date, month: row.month,
    amountCents: Number(row.amount_cents), accountId: row.account_id, toAccountId: row.to_account_id,
    bucketId: row.bucket_id, toBucketId: row.to_bucket_id, direction: row.direction,
    customType: row.custom_type,
    description: row.description, payee: row.payee, notes: row.notes,
  })),
  recurringPlans: recurringPlans.map((row) => ({
    id: row.id, name: row.name, eventType: row.event_type, amountCents: Number(row.amount_cents),
    accountId: row.account_id, toAccountId: row.to_account_id, bucketId: row.bucket_id,
    toBucketId: row.to_bucket_id, description: row.description, payee: row.payee, notes: row.notes,
    frequency: row.frequency, startDate: row.start_date, endDate: row.end_date,
    nextRun: row.next_run, active: row.active,
  })),
  paycheckTemplates: paycheckTemplates.map((row) => ({
    id: row.id, name: row.name, accountId: row.account_id,
    allocations: Array.isArray(row.allocations) ? row.allocations.map((allocation) => ({
      bucketId: allocation.bucketId, cents: Number(allocation.cents),
    })) : [],
  })),
  reconciliations: reconciliations.map((row) => ({
    id: row.id, accountId: row.account_id, date: row.date,
    statementBalanceCents: Number(row.statement_balance_cents), appBalanceCents: Number(row.app_balance_cents),
    adjustmentEventId: row.adjustment_event_id,
  })),
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(backup, null, 2)}\n`, { mode: 0o600 })
