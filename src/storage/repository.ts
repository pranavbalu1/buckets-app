import type { Account, AccountType, Bucket, BucketGroup, BucketKind } from '../domain/models'
import type { LedgerEvent } from '../domain/types'
import type { NewEvent } from './mappers'

export interface LedgerData {
  accounts: Account[]
  groups: BucketGroup[]
  buckets: Bucket[]
  events: LedgerEvent[]
}

export interface BucketInput {
  name: string
  kind: BucketKind
  groupId: string | null
  sortOrder: number
  monthlyTargetCents: number
  color: string | null
}

export type BucketPatch = Partial<
  Pick<Bucket, 'name' | 'kind' | 'groupId' | 'archived' | 'sortOrder' | 'monthlyTargetCents' | 'color'>
>

export interface LedgerRepository {
  loadAll(): Promise<LedgerData>

  createAccount(input: { name: string; type: AccountType }): Promise<Account>
  updateAccount(id: string, patch: Partial<Pick<Account, 'name' | 'type' | 'archived'>>): Promise<Account>

  createGroup(input: { name: string; sortOrder: number }): Promise<BucketGroup>
  updateGroup(id: string, patch: { name: string }): Promise<BucketGroup>

  createBucket(input: BucketInput): Promise<Bucket>
  updateBucket(id: string, patch: BucketPatch): Promise<Bucket>

  createEvent(event: NewEvent): Promise<LedgerEvent>
  /** Inserts all events in one request, so they succeed or fail together. */
  createEvents(events: NewEvent[]): Promise<LedgerEvent[]>
  updateEvent(id: string, event: NewEvent): Promise<LedgerEvent>
  deleteEvent(id: string): Promise<void>
}