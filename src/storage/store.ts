import { create } from 'zustand'
import type { Account, AccountType, Bucket, BucketGroup, BucketKind } from '../domain/models'
import type { LedgerEvent } from '../domain/types'
import type { NewEvent } from './mappers'
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

  addAccount: (name: string, type: AccountType) => Promise<void>
  updateAccount: (id: string, patch: Partial<Pick<Account, 'name' | 'type' | 'archived'>>) => Promise<void>
  addGroup: (name: string) => Promise<void>
  addBucket: (input: { name: string; kind: BucketKind; groupId: string | null }) => Promise<void>
  updateBucket: (
    id: string,
    patch: Partial<Pick<Bucket, 'name' | 'kind' | 'groupId' | 'archived'>>,
  ) => Promise<void>

  addEvent: (event: NewEvent) => Promise<void>
  editEvent: (id: string, event: NewEvent) => Promise<void>
  removeEvent: (id: string) => Promise<void>
}

const empty = { accounts: [], groups: [], buckets: [], events: [] }

const message = (e: unknown) => (e instanceof Error ? e.message : String(e))
const byOrder = <T extends { sortOrder: number; name: string }>(a: T, b: T) =>
  a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
const nextOrder = (items: { sortOrder: number }[]) => items.reduce((m, i) => Math.max(m, i.sortOrder), 0) + 1

export const useLedger = create<LedgerState>((set, get) => {
  /** Runs an action; on failure, stores the error message instead of throwing. */
  async function run(fn: () => Promise<void>) {
    try {
      await fn()
      set({ error: null })
    } catch (e) {
      set({ error: message(e) })
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
        const a = await repo.createAccount({ name, type })
        set((s) => ({ accounts: [...s.accounts, a] }))
      }),

    updateAccount: (id, patch) =>
      run(async () => {
        const a = await repo.updateAccount(id, patch)
        set((s) => ({ accounts: s.accounts.map((x) => (x.id === id ? a : x)) }))
      }),

    addGroup: (name) =>
      run(async () => {
        const g = await repo.createGroup({ name, sortOrder: nextOrder(get().groups) })
        set((s) => ({ groups: [...s.groups, g].sort(byOrder) }))
      }),

    addBucket: ({ name, kind, groupId }) =>
      run(async () => {
        const b = await repo.createBucket({ name, kind, groupId, sortOrder: nextOrder(get().buckets) })
        set((s) => ({ buckets: [...s.buckets, b].sort(byOrder) }))
      }),

    updateBucket: (id, patch) =>
      run(async () => {
        const b = await repo.updateBucket(id, patch)
        set((s) => ({ buckets: s.buckets.map((x) => (x.id === id ? b : x)).sort(byOrder) }))
      }),

    addEvent: (event) =>
      run(async () => {
        const e = await repo.createEvent(event)
        set((s) => ({ events: [...s.events, e] }))
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