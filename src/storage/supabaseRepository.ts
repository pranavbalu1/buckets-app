import { supabase } from '../lib/supabase'
import type { LedgerRepository } from './repository'
import { eventToRow, parseAccount, parseBucket, parseEvent, parseGroup } from './mappers'

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
      supabase.from('accounts').select('*').order('created_at'),
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

  async createAccount({ name, type }) {
    const { data, error } = await supabase.from('accounts').insert({ name, type }).select().single()
    if (error) fail(error)
    return parseAccount(data)
  },

  async updateAccount(id, patch) {
    const { data, error } = await supabase
      .from('accounts')
      .update({ ...patch, updated_at: now() })
      .eq('id', id)
      .select()
      .single()
    if (error) fail(error)
    return parseAccount(data)
  },

  async createGroup({ name, sortOrder }) {
    const { data, error } = await supabase
      .from('bucket_groups')
      .insert({ name, sort_order: sortOrder })
      .select()
      .single()
    if (error) fail(error)
    return parseGroup(data)
  },

  async createBucket({ name, kind, groupId, sortOrder }) {
    const { data, error } = await supabase
      .from('buckets')
      .insert({ name, kind, group_id: groupId, sort_order: sortOrder })
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
    const { data, error } = await supabase.from('buckets').update(row).eq('id', id).select().single()
    if (error) fail(error)
    return parseBucket(data)
  },

  async createEvent(event) {
    const { data, error } = await supabase.from('ledger_events').insert(eventToRow(event)).select().single()
    if (error) fail(error)
    return parseEvent(data)
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