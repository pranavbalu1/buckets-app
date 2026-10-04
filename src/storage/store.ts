import { create } from 'zustand'
import { queryClient } from '../lib/queryClient'
import type { Account, AccountType, Bucket, BucketGroup, BucketKind } from '../domain/models'
import type { LedgerEvent } from '../domain/types'
import type { NewEvent } from './mappers'
import type { BucketPatch } from './repository'
import { supabaseRepository as repo } from './supabaseRepository'

interface LedgerState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  accounts: Account[]
  groups: BucketGroup[]
  buckets: Bucket[]
  events: LedgerEvent[]

  load: () => Promise<void>
  reset: () => void
  clearError: () => void

  addAccount: (name: string, type: AccountType) => Promise<boolean>
  updateAccount: (id: string, patch: Partial<Pick<Account, 'name' | 'type' | 'sortOrder' | 'archived'>>) => Promise<boolean>

  addGroup: (name: string, color?: string | null) => Promise<boolean>
  updateGroup: (id: string, patch: { name?: string; color?: string | null; sortOrder?: number }) => Promise<boolean>
  removeGroup: (id: string) => Promise<boolean>

  addBucket: (input: {
    name: string
    kind: BucketKind
    groupId: string | null
    monthlyTargetCents: number
    targetCents: number | null
    targetDate: string | null
    color: string | null
  }) => Promise<boolean>
  updateBucket: (id: string, patch: BucketPatch) => Promise<boolean>
  removeBucket: (id: string) => Promise<boolean>

  addEvent: (event: NewEvent) => Promise<boolean>
  addEvents: (events: NewEvent[]) => Promise<boolean>
  editEvent: (id: string, event: NewEvent) => Promise<boolean>
  removeEvent: (id: string) => Promise<boolean>
}

const empty = { accounts: [], groups: [], buckets: [], events: [] }

const message = (e: unknown) => (e instanceof Error ? e.message : String(e))
const byOrder = <T extends { sortOrder: number; name: string }>(a: T, b: T) =>
  a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
const nextOrder = (items: { sortOrder: number }[]) => items.reduce((m, i) => Math.max(m, i.sortOrder), 0) + 1

export const useLedger = create<LedgerState>((set, get) => {
  /** Runs an action. Returns true on success; on failure stores the error message and returns false. */
  async function run(fn: () => Promise<void>): Promise<boolean> {
    try {
      await fn()
      const { accounts, groups, buckets, events } = get()
      queryClient.setQueriesData({ queryKey: ['ledger'] }, { accounts, groups, buckets, events })
      set({ error: null })
      return true
    } catch (e) {
      set({ error: message(e) })
      return false
    }
  }

  return {
    status: 'idle',
    error: null,
    ...empty,

    async load() {
      set({ status: 'loading', error: null })
      try {
        set({ ...(await repo.loadAll()), status: 'ready' })
      } catch (e) {
        set({ status: 'error', error: message(e) })
      }
    },
    reset: () => set({ status: 'idle', error: null, ...empty }),
    clearError: () => set({ error: null }),

    addAccount: (name, type) =>
      run(async () => {
        const a = await repo.createAccount({ name, type, sortOrder: nextOrder(get().accounts) })
        set((s) => ({ accounts: [...s.accounts, a].sort(byOrder) }))
      }),

    updateAccount: (id, patch) =>
      run(async () => {
        const a = await repo.updateAccount(id, patch)
        set((s) => ({ accounts: s.accounts.map((x) => (x.id === id ? a : x)).sort(byOrder) }))
      }),

    addGroup: (name, color = null) =>
      run(async () => {
        const g = await repo.createGroup({ name, sortOrder: nextOrder(get().groups), color })
        set((s) => ({ groups: [...s.groups, g].sort(byOrder) }))
      }),

    updateGroup: (id, patch) =>
      run(async () => {
        const g = await repo.updateGroup(id, patch)
        set((s) => ({ groups: s.groups.map((x) => (x.id === id ? g : x)).sort(byOrder) }))
      }),

    removeGroup: (id) =>
      run(async () => {
        await repo.deleteGroup(id)
        set((s) => ({
          groups: s.groups.filter((x) => x.id !== id),
          buckets: s.buckets.map((b) => b.groupId === id ? { ...b, groupId: null } : b),
        }))
      }),

    addBucket: (input) =>
      run(async () => {
        const b = await repo.createBucket({ ...input, sortOrder: nextOrder(get().buckets) })
        set((s) => ({ buckets: [...s.buckets, b].sort(byOrder) }))
      }),

    updateBucket: (id, patch) =>
      run(async () => {
        const b = await repo.updateBucket(id, patch)
        set((s) => ({ buckets: s.buckets.map((x) => (x.id === id ? b : x)).sort(byOrder) }))
      }),

    removeBucket: (id) =>
      run(async () => {
        if (get().events.some((e) => e.bucketId === id || e.toBucketId === id)) {
          throw new Error('This bucket has transaction history. Archive it instead of deleting it.')
        }
        await repo.deleteBucket(id)
        set((s) => ({ buckets: s.buckets.filter((x) => x.id !== id) }))
      }),

    addEvent: (event) =>
      run(async () => {
        const e = await repo.createEvent(event)
        set((s) => ({ events: [...s.events, e] }))
      }),

    addEvents: (events) =>
      run(async () => {
        const created = await repo.createEvents(events)
        set((s) => ({ events: [...s.events, ...created] }))
      }),

    editEvent: (id, event) =>
      run(async () => {
        const e = await repo.updateEvent(id, event)
        set((s) => ({ events: s.events.map((x) => (x.id === id ? e : x)) }))
      }),

    removeEvent: (id) =>
      run(async () => {
        await repo.deleteEvent(id)
        set((s) => ({ events: s.events.filter((x) => x.id !== id) }))
      }),
  }
})
