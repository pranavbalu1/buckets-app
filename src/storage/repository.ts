import type { Account, AccountType, Bucket, BucketGroup, BucketKind } from '../domain/models'
import type { LedgerEvent } from '../domain/types'
import type { NewEvent } from './mappers'
import type { AppBackup } from './backup'

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
  targetCents: number | null
  targetDate: string | null
  color: string | null
}

export type BucketPatch = Partial<
  Pick<Bucket, 'name' | 'kind' | 'groupId' | 'archived' | 'sortOrder' | 'monthlyTargetCents' | 'targetCents' | 'targetDate' | 'color'>
>

export interface LedgerRepository {
  loadAll(): Promise<LedgerData>
  exportAll(): Promise<AppBackup>
  importAll(backup: AppBackup): Promise<void>

  createAccount(input: { name: string; type: AccountType; sortOrder: number }): Promise<Account>
  updateAccount(id: string, patch: Partial<Pick<Account, 'name' | 'type' | 'sortOrder' | 'archived'>>): Promise<Account>

  createGroup(input: { name: string; sortOrder: number; color: string | null }): Promise<BucketGroup>
  updateGroup(id: string, patch: { name?: string; color?: string | null; sortOrder?: number }): Promise<BucketGroup>
  deleteGroup(id: string): Promise<void>

  createBucket(input: BucketInput): Promise<Bucket>
  updateBucket(id: string, patch: BucketPatch): Promise<Bucket>
  deleteBucket(id: string): Promise<void>

  createEvent(event: NewEvent): Promise<LedgerEvent>
  /** Inserts all events in one request, so they succeed or fail together. */
  createEvents(events: NewEvent[]): Promise<LedgerEvent[]>
  updateEvent(id: string, event: NewEvent): Promise<LedgerEvent>
  deleteEvent(id: string): Promise<void>
}
