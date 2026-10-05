import { create } from 'zustand'
import { queryClient } from '../lib/queryClient'
import type { Account, AccountType, Bucket, BucketGroup, BucketKind } from '../domain/models'
import type { LedgerEvent } from '../domain/types'
import { makeEvent } from '../domain/events'
import { todayString } from '../domain/dates'
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

  addAccount: (name: string, type: AccountType, openingBalanceCents?: number) => Promise<{ account: Account | null; openingBalanceSaved: boolean }>
  updateAccount: (id: string, patch: Partial<Pick<Account, 'name' | 'type' | 'sortOrder' | 'archived'>>) => Promise<boolean>
  removeAccount: (id: string) => Promise<boolean>

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
  function syncLedgerCache() {
    const { accounts, groups, buckets, events } = get()
    queryClient.setQueriesData({ queryKey: ['ledger'] }, { accounts, groups, buckets, events })
  }

  /** Apply locally first, then reconcile with Supabase or roll back on failure. */
  async function run(fn: () => Promise<void>, optimistic?: () => void, rollback?: () => void): Promise<boolean> {
    try {
      optimistic?.()
      if (optimistic) syncLedgerCache()
      await fn()
      syncLedgerCache()
      set({ error: null })
      return true
    } catch (e) {
      rollback?.()
      if (rollback) syncLedgerCache()
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

    addAccount: async (name, type, openingBalanceCents = 0) => {
      const account = { id: crypto.randomUUID(), name, type, sortOrder: nextOrder(get().accounts), archived: false }
      try {
        const saved = await repo.createAccount({ id: account.id, name, type, sortOrder: account.sortOrder })
        let openingEvent: LedgerEvent | null = null
        if (openingBalanceCents !== 0) {
          try {
            openingEvent = await repo.createEvent(makeEvent({
              type: 'adjustment',
              date: todayString(),
              amountCents: Math.abs(openingBalanceCents),
              accountId: saved.id,
              direction: openingBalanceCents > 0 ? 'in' : 'out',
              description: 'Opening balance',
            }))
          } catch (error) {
            // Keep the created account visible and let the form offer a safe retry
            // instead of hiding a server row or encouraging a duplicate account.
            set((state) => ({ accounts: [...state.accounts.filter((item) => item.id !== saved.id), saved].sort(byOrder) }))
            syncLedgerCache()
            set({ error: `Account created, but its opening balance was not saved. Retry the balance entry. (${message(error)})` })
            return { account: saved, openingBalanceSaved: false }
          }
        }
        set((state) => ({
          accounts: [...state.accounts.filter((item) => item.id !== saved.id), saved].sort(byOrder),
          events: openingEvent ? [...state.events, openingEvent] : state.events,
          error: null,
        }))
        syncLedgerCache()
        return { account: saved, openingBalanceSaved: true }
      } catch (error) {
        set({ error: message(error) })
        return { account: null, openingBalanceSaved: false }
      }
    },

    updateAccount: (id, patch) => {
      const previous = get().accounts.find((item) => item.id === id)
      if (!previous) return Promise.resolve(false)
      return run(async () => {
        const saved = await repo.updateAccount(id, patch)
        set((s) => ({ accounts: s.accounts.map((item) => item.id === id ? saved : item).sort(byOrder) }))
      },
      () => set((s) => ({ accounts: s.accounts.map((item) => item.id === id ? { ...item, ...patch } : item).sort(byOrder) })),
      () => set((s) => ({ accounts: s.accounts.map((item) => item.id === id ? previous : item).sort(byOrder) })))
    },

    removeAccount: (id) => {
      const previous = get().accounts.find((item) => item.id === id)
      if (!previous) {
        set({ error: 'Account not found.' })
        return Promise.resolve(false)
      }
      return run(async () => {
        await repo.deleteAccount(id)
        set((state) => ({
          accounts: state.accounts.filter((item) => item.id !== id),
          events: state.events.filter((event) => event.accountId !== id && event.toAccountId !== id),
        }))
      })
    },

    addGroup: (name, color = null) => {
      const group = { id: crypto.randomUUID(), name, sortOrder: nextOrder(get().groups), color }
      return run(async () => {
        const saved = await repo.createGroup({ id: group.id, name, sortOrder: group.sortOrder, color })
        set((s) => ({ groups: s.groups.map((item) => item.id === group.id ? saved : item).sort(byOrder) }))
      },
      () => set((s) => ({ groups: [...s.groups, group].sort(byOrder) })),
      () => set((s) => ({ groups: s.groups.filter((item) => item.id !== group.id) })))
    },

    updateGroup: (id, patch) => {
      const previous = get().groups.find((item) => item.id === id)
      if (!previous) return Promise.resolve(false)
      return run(async () => {
        const saved = await repo.updateGroup(id, patch)
        set((s) => ({ groups: s.groups.map((item) => item.id === id ? saved : item).sort(byOrder) }))
      },
      () => set((s) => ({ groups: s.groups.map((item) => item.id === id ? { ...item, ...patch } : item).sort(byOrder) })),
      () => set((s) => ({ groups: s.groups.map((item) => item.id === id ? previous : item).sort(byOrder) })))
    },

    removeGroup: (id) => {
      const previous = get().groups.find((item) => item.id === id)
      if (!previous) return Promise.resolve(false)
      const childIds = new Set(get().buckets.filter((bucket) => bucket.groupId === id).map((bucket) => bucket.id))
      return run(async () => {
        await repo.deleteGroup(id)
        set((s) => ({ groups: s.groups.filter((item) => item.id !== id) }))
      },
      () => set((s) => ({ groups: s.groups.filter((item) => item.id !== id), buckets: s.buckets.map((bucket) => bucket.groupId === id ? { ...bucket, groupId: null } : bucket) })),
      () => set((s) => ({ groups: [...s.groups, previous].sort(byOrder), buckets: s.buckets.map((bucket) => childIds.has(bucket.id) ? { ...bucket, groupId: id } : bucket) })))
    },

    addBucket: (input) => {
      const bucket = { ...input, id: crypto.randomUUID(), sortOrder: nextOrder(get().buckets), archived: false }
      return run(async () => {
        const saved = await repo.createBucket({ ...input, id: bucket.id, sortOrder: bucket.sortOrder })
        set((s) => ({ buckets: s.buckets.map((item) => item.id === bucket.id ? saved : item).sort(byOrder) }))
      },
      () => set((s) => ({ buckets: [...s.buckets, bucket].sort(byOrder) })),
      () => set((s) => ({ buckets: s.buckets.filter((item) => item.id !== bucket.id) })))
    },

    updateBucket: (id, patch) => {
      const previous = get().buckets.find((item) => item.id === id)
      if (!previous) return Promise.resolve(false)
      return run(async () => {
        const saved = await repo.updateBucket(id, patch)
        set((s) => ({ buckets: s.buckets.map((item) => item.id === id ? saved : item).sort(byOrder) }))
      },
      () => set((s) => ({ buckets: s.buckets.map((item) => item.id === id ? { ...item, ...patch } : item).sort(byOrder) })),
      () => set((s) => ({ buckets: s.buckets.map((item) => item.id === id ? previous : item).sort(byOrder) })))
    },

    removeBucket: (id) => {
      const previous = get().buckets.find((item) => item.id === id)
      if (!previous || get().events.some((event) => event.bucketId === id || event.toBucketId === id)) {
        set({ error: previous ? 'This bucket has transaction history. Archive it instead of deleting it.' : 'Bucket not found.' })
        return Promise.resolve(false)
      }
      return run(async () => {
        await repo.deleteBucket(id)
      },
      () => set((s) => ({ buckets: s.buckets.filter((item) => item.id !== id) })),
      () => set((s) => ({ buckets: [...s.buckets, previous].sort(byOrder) })))
    },

    addEvent: (event) => {
      const optimisticId = crypto.randomUUID()
      const optimisticEvent = { ...event, id: optimisticId }
      return run(async () => {
        const saved = await repo.createEvent(event)
        set((s) => ({ events: s.events.map((item) => item.id === optimisticId ? saved : item) }))
      },
      () => set((s) => ({ events: [...s.events, optimisticEvent] })),
      () => set((s) => ({ events: s.events.filter((item) => item.id !== optimisticId) })))
    },

    addEvents: (events) => {
      if (events.length === 0) return Promise.resolve(true)
      const optimisticEvents = events.map((event) => ({ ...event, id: crypto.randomUUID() }))
      const optimisticIds = new Set<string>(optimisticEvents.map((event) => event.id))
      return run(async () => {
        const created = await repo.createEvents(events)
        set((s) => ({ events: [...s.events.filter((item) => !optimisticIds.has(item.id)), ...created] }))
      },
      () => set((s) => ({ events: [...s.events, ...optimisticEvents] })),
      () => set((s) => ({ events: s.events.filter((item) => !optimisticIds.has(item.id)) })))
    },

    editEvent: (id, event) => {
      const previous = get().events.find((item) => item.id === id)
      if (!previous) return Promise.resolve(false)
      const optimisticEvent = { ...event, id }
      return run(async () => {
        const saved = await repo.updateEvent(id, event)
        set((s) => ({ events: s.events.map((item) => item.id === id ? saved : item) }))
      },
      () => set((s) => ({ events: s.events.map((item) => item.id === id ? optimisticEvent : item) })),
      () => set((s) => ({ events: s.events.map((item) => item.id === id ? previous : item) })))
    },

    removeEvent: (id) => {
      const previous = get().events.find((item) => item.id === id)
      if (!previous) return Promise.resolve(false)
      return run(async () => {
        await repo.deleteEvent(id)
      },
      () => set((s) => ({ events: s.events.filter((item) => item.id !== id) })),
      () => set((s) => ({ events: [...s.events, previous] })))
    },
  }
})
