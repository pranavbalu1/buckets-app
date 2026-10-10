import { supabase } from '../lib/supabase'
import type { LedgerRepository } from './repository'
import { eventToRow, parseAccount, parseBucket, parseEvent, parseGroup } from './mappers'
import { parseBackup, rekeyBackupForImport } from './backup'
import type { AppBackup } from './backup'

function fail(error: { message: string }): never {
  throw new Error(error.message)
}

/** Supabase returns at most 1000 rows per request, so page through the ledger. */
async function fetchAllEvents(): Promise<unknown[]> {
  const pageSize = 1000
  const rows: unknown[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('ledger_events')
      .select('*')
      .order('date')
      .order('created_at')
      .order('id')
      .range(from, from + pageSize - 1)
    if (error) fail(error)
    rows.push(...data)
    if (data.length < pageSize) break
  }
  return rows
}

const now = () => new Date().toISOString()

export const supabaseRepository: LedgerRepository = {
  async loadAll() {
    const [accounts, groups, buckets, events] = await Promise.all([
      supabase.from('accounts').select('*').order('sort_order').order('created_at'),
      supabase.from('bucket_groups').select('*').order('sort_order'),
      supabase.from('buckets').select('*').order('sort_order'),
      fetchAllEvents(),
    ])
    if (accounts.error) fail(accounts.error)
    if (groups.error) fail(groups.error)
    if (buckets.error) fail(buckets.error)
    return {
      accounts: accounts.data.map(parseAccount),
      groups: groups.data.map(parseGroup),
      buckets: buckets.data.map(parseBucket),
      events: events.map(parseEvent),
    }
  },

  async exportAll() {
    const [ledger, plans, templates, reconciliations] = await Promise.all([
      this.loadAll(),
      supabase.from('recurring_plans').select('*'),
      supabase.from('paycheck_templates').select('*'),
      supabase.from('reconciliations').select('*'),
    ])
    if (plans.error) fail(plans.error)
    if (templates.error) fail(templates.error)
    if (reconciliations.error) fail(reconciliations.error)
    return parseBackup({
      format: 'buckets-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      ...ledger,
      recurringPlans: plans.data.map((plan) => ({
        id: plan.id, name: plan.name, eventType: plan.event_type, amountCents: plan.amount_cents,
        accountId: plan.account_id, toAccountId: plan.to_account_id, bucketId: plan.bucket_id, toBucketId: plan.to_bucket_id,
        description: plan.description, payee: plan.payee, notes: plan.notes, frequency: plan.frequency,
        startDate: plan.start_date, endDate: plan.end_date, nextRun: plan.next_run, active: plan.active,
      })),
      paycheckTemplates: templates.data.map((template) => ({
        id: template.id, name: template.name, accountId: template.account_id, allocations: template.allocations,
      })),
      reconciliations: reconciliations.data.map((row) => ({
        id: row.id, accountId: row.account_id, date: row.date,
        statementBalanceCents: row.statement_balance_cents, appBalanceCents: row.app_balance_cents,
        adjustmentEventId: row.adjustment_event_id,
      })),
    })
  },

  async importAll(backup: AppBackup) {
    const { error } = await supabase.rpc('restore_ledger', { p_backup: rekeyBackupForImport(backup) })
    if (error) fail(error)
  },

  async createAccount({ id, name, type, sortOrder }) {
    const { data, error } = await supabase.from('accounts').insert({ ...(id ? { id } : {}), name, type, sort_order: sortOrder }).select().single()
    if (error) fail(error)
    return parseAccount(data)
  },

  async updateAccount(id, patch) {
    const row: Record<string, unknown> = { updated_at: now() }
    if (patch.name !== undefined) row.name = patch.name
    if (patch.type !== undefined) row.type = patch.type
    if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder
    if (patch.archived !== undefined) row.archived = patch.archived
    const { data, error } = await supabase
      .from('accounts')
      .update(row)
      .eq('id', id)
      .select()
      .single()
    if (error) fail(error)
    return parseAccount(data)
  },

  async deleteAccount(id) {
    const { error } = await supabase.rpc('delete_account', { p_account_id: id })
    if (error) fail(error)
  },

  async createGroup({ id, name, sortOrder, color }) {
    const { data, error } = await supabase
      .from('bucket_groups')
      .insert({ ...(id ? { id } : {}), name, sort_order: sortOrder, color })
      .select()
      .single()
    if (error) fail(error)
    return parseGroup(data)
  },

  async updateGroup(id, patch) {
    const row: Record<string, unknown> = { updated_at: now() }
    if (patch.name !== undefined) row.name = patch.name
    if (patch.color !== undefined) row.color = patch.color
    if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder
    const { data, error } = await supabase
      .from('bucket_groups')
      .update(row)
      .eq('id', id)
      .select()
      .single()
    if (error) fail(error)
    return parseGroup(data)
  },

  async deleteGroup(id) {
    const { error } = await supabase.from('bucket_groups').delete().eq('id', id)
    if (error) fail(error)
  },

  async createBucket({ id, name, kind, groupId, sortOrder, monthlyTargetCents, targetCents, targetDate, color }) {
    const { data, error } = await supabase
      .from('buckets')
      .insert({
        ...(id ? { id } : {}),
        name,
        kind,
        group_id: groupId,
        sort_order: sortOrder,
        monthly_target_cents: monthlyTargetCents,
        target_cents: targetCents,
        target_date: targetDate,
        color,
      })
      .select()
      .single()
    if (error) fail(error)
    return parseBucket(data)
  },

  async updateBucket(id, patch) {
    const row: Record<string, unknown> = { updated_at: now() }
    if (patch.name !== undefined) row.name = patch.name
    if (patch.kind !== undefined) row.kind = patch.kind
    if (patch.groupId !== undefined) row.group_id = patch.groupId
    if (patch.archived !== undefined) row.archived = patch.archived
    if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder
    if (patch.monthlyTargetCents !== undefined) row.monthly_target_cents = patch.monthlyTargetCents
    if (patch.targetCents !== undefined) row.target_cents = patch.targetCents
    if (patch.targetDate !== undefined) row.target_date = patch.targetDate
    if (patch.color !== undefined) row.color = patch.color
    const { data, error } = await supabase.from('buckets').update(row).eq('id', id).select().single()
    if (error) fail(error)
    return parseBucket(data)
  },

  async deleteBucket(id) {
    const { error } = await supabase.rpc('delete_user_bucket', { p_bucket_id: id })
    if (error) {
      if (error.code === '42883' || error.message.includes('delete_user_bucket')) {
        throw new Error('Bucket deletion is not enabled in the database yet. Apply supabase/migrations/013_delete_bucket_with_history.sql, then try again.')
      }
      fail(error)
    }
  },

  async createEvent(event) {
    const { data, error } = await supabase.from('ledger_events').insert(eventToRow(event)).select().single()
    if (error) fail(error)
    return parseEvent(data)
  },

  async createEvents(events) {
    if (events.length === 0) return []
    const { data, error } = await supabase.from('ledger_events').insert(events.map(eventToRow)).select()
    if (error) fail(error)
    return data.map(parseEvent)
  },

  async updateEvent(id, event) {
    const { data, error } = await supabase
      .from('ledger_events')
      .update({ ...eventToRow(event), updated_at: now() })
      .eq('id', id)
      .select()
      .single()
    if (error) fail(error)
    return parseEvent(data)
  },

  async deleteEvent(id) {
    const { error } = await supabase.from('ledger_events').delete().eq('id', id)
    if (error) fail(error)
  },
}
