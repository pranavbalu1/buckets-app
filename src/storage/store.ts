import { create } from 'zustand'
import { queryClient } from '../lib/queryClient'
import type { Account, AccountType, Bucket, BucketGroup, BucketKind } from '../domain/models'
import type { LedgerEvent } from '../domain/types'
import { makeEvent } from '../domain/events'
import { todayString } from '../domain/dates'
import type { NewEvent } from './mappers'
import type { BucketPatch } from './repository'
import { supabaseRepository as repo } from './supabaseRepository'
import {
  accountInputSchema,
  accountPatchSchema,
  bucketInputSchema,
  bucketPatchSchema,
  bucketStateSchema,
  firstIssueMessage,
  groupInputSchema,
  groupPatchSchema,
  ledgerEventSchema,
  userFacingErrorMessage,
} from '../domain/validate'

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

const message = (e: unknown) => userFacingErrorMessage(e)
const byOrder = <T extends { sortOrder: number; name: string }>(a: T, b: T) =>
  a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
const nextOrder = (items: { sortOrder: number }[]) => items.reduce((m, i) => Math.max(m, i.sortOrder), 0) + 1
const normalizedName = (name: string) => name.trim().toLocaleLowerCase()
const hasNameConflict = <T extends { id: string; name: string }>(items: T[], name: string, exceptId?: string) =>
  items.some((item) => item.id !== exceptId && normalizedName(item.name) === normalizedName(name))

export const useLedger = create<LedgerState>((set, get) => {
  function rejectInput(message: string): false {
    set({ error: message })
    return false
  }

  function normalizeEvent(event: NewEvent): NewEvent | null {
    const result = ledgerEventSchema.safeParse(event)
    if (!result.success) {
      set({ error: firstIssueMessage(result.error, 'Enter a valid transaction.') })
      return null
    }
    const normalized = result.data
    const { accounts, buckets } = get()
    if (normalized.accountId && !accounts.some((item) => item.id === normalized.accountId)) {
      set({ error: 'Choose an account that still exists.' })
      return null
    }
    if (normalized.toAccountId && !accounts.some((item) => item.id === normalized.toAccountId)) {
      set({ error: 'Choose a destination account that still exists.' })
      return null
    }
    if (normalized.bucketId && !buckets.some((item) => item.id === normalized.bucketId)) {
      set({ error: 'Choose a bucket that still exists.' })
      return null
    }
    if (normalized.toBucketId && !buckets.some((item) => item.id === normalized.toBucketId)) {
      set({ error: 'Choose a destination bucket that still exists.' })
      return null
    }
    return normalized
  }

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
      const input = accountInputSchema.safeParse({ name, type, openingBalanceCents })
      if (!input.success) {
        set({ error: firstIssueMessage(input.error, 'Enter valid account details.') })
        return { account: null, openingBalanceSaved: false }
      }
      const accountName = input.data.name
      const accountType = input.data.type
      const startingBalance = input.data.openingBalanceCents
      if (hasNameConflict(get().accounts, accountName)) {
        set({ error: 'An account with that name already exists.' })
        return { account: null, openingBalanceSaved: false }
      }
      const account = { id: crypto.randomUUID(), name: accountName, type: accountType, sortOrder: nextOrder(get().accounts), archived: false }
      try {
        const saved = await repo.createAccount({ id: account.id, name: accountName, type: accountType, sortOrder: account.sortOrder })
        let openingEvent: LedgerEvent | null = null
        if (startingBalance !== 0) {
          try {
            openingEvent = await repo.createEvent(makeEvent({
              type: 'adjustment',
              date: todayString(),
              amountCents: Math.abs(startingBalance),
              accountId: saved.id,
              direction: startingBalance > 0 ? 'in' : 'out',
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
      const parsedPatch = accountPatchSchema.safeParse(patch)
      if (!parsedPatch.success) return Promise.resolve(rejectInput(firstIssueMessage(parsedPatch.error)))
      patch = parsedPatch.data
      if (patch.name !== undefined && hasNameConflict(get().accounts, patch.name, id)) {
        return Promise.resolve(rejectInput('An account with that name already exists.'))
      }
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
      }).then(async (deleted) => {
        if (deleted) await queryClient.invalidateQueries({ queryKey: ['planning-settings'] })
        return deleted
      })
    },

    addGroup: (name, color = null) => {
      const input = groupInputSchema.safeParse({ name, color })
      if (!input.success) return Promise.resolve(rejectInput(firstIssueMessage(input.error, 'Enter valid group details.')))
      name = input.data.name
      color = input.data.color
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
      const parsedPatch = groupPatchSchema.safeParse(patch)
      if (!parsedPatch.success) return Promise.resolve(rejectInput(firstIssueMessage(parsedPatch.error)))
      patch = parsedPatch.data
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
      const parsedInput = bucketInputSchema.safeParse(input)
      if (!parsedInput.success) return Promise.resolve(rejectInput(firstIssueMessage(parsedInput.error, 'Enter valid bucket details.')))
      input = parsedInput.data
      if (input.groupId && !get().groups.some((group) => group.id === input.groupId)) {
        return Promise.resolve(rejectInput('Choose a group that still exists.'))
      }
      if (hasNameConflict(get().buckets, input.name)) {
        return Promise.resolve(rejectInput('A bucket with that name already exists.'))
      }
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
      const parsedPatch = bucketPatchSchema.safeParse(patch)
      if (!parsedPatch.success) return Promise.resolve(rejectInput(firstIssueMessage(parsedPatch.error)))
      patch = parsedPatch.data
      const merged = bucketStateSchema.safeParse({ ...previous, ...patch })
      if (!merged.success) return Promise.resolve(rejectInput(firstIssueMessage(merged.error, 'Enter valid bucket details.')))
      patch = { ...patch, ...merged.data }
      if (patch.groupId && !get().groups.some((group) => group.id === patch.groupId)) {
        return Promise.resolve(rejectInput('Choose a group that still exists.'))
      }
      if (patch.name !== undefined && hasNameConflict(get().buckets, patch.name, id)) {
        return Promise.resolve(rejectInput('A bucket with that name already exists.'))
      }
      return run(async () => {
        const saved = await repo.updateBucket(id, patch)
        set((s) => ({ buckets: s.buckets.map((item) => item.id === id ? saved : item).sort(byOrder) }))
      },
      () => set((s) => ({ buckets: s.buckets.map((item) => item.id === id ? { ...item, ...patch } : item).sort(byOrder) })),
      () => set((s) => ({ buckets: s.buckets.map((item) => item.id === id ? previous : item).sort(byOrder) })))
    },

    removeBucket: (id) => {
      const previous = get().buckets.find((item) => item.id === id)
      if (!previous) {
        set({ error: 'Bucket not found.' })
        return Promise.resolve(false)
      }
      const previousEvents = get().events
      return run(async () => {
        await repo.deleteBucket(id)
        void queryClient.invalidateQueries({ queryKey: ['planning-settings'] })
      },
      () => set((s) => ({
        buckets: s.buckets.filter((item) => item.id !== id),
        events: s.events.filter((event) => event.bucketId !== id && event.toBucketId !== id),
      })),
      () => set((s) => ({ buckets: [...s.buckets, previous].sort(byOrder), events: previousEvents })))
    },

    addEvent: (event) => {
      const normalized = normalizeEvent(event)
      if (!normalized) return Promise.resolve(false)
      event = normalized
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
      const normalizedEvents: NewEvent[] = []
      for (const event of events) {
        const normalized = normalizeEvent(event)
        if (!normalized) return Promise.resolve(false)
        normalizedEvents.push(normalized)
      }
      events = normalizedEvents
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
      const normalized = normalizeEvent(event)
      if (!normalized) return Promise.resolve(false)
      event = normalized
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
