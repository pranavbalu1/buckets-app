import type { Account, AccountType, Bucket, BucketGroup, BucketKind } from '../domain/models'
import type { LedgerEvent } from '../domain/types'
import type { NewEvent } from './mappers'

export interface LedgerData {
  accounts: Account[]
  groups: BucketGroup[]
  buckets: Bucket[]
  events: LedgerEvent[]
}

export interface LedgerRepository {
  loadAll(): Promise<LedgerData>

  createAccount(input: { name: string; type: AccountType }): Promise<Account>
  updateAccount(id: string, patch: Partial<Pick<Account, 'name' | 'type' | 'archived'>>): Promise<Account>

  createGroup(input: { name: string; sortOrder: number }): Promise<BucketGroup>

  createBucket(input: {
    name: string
    kind: BucketKind
    groupId: string | null
    sortOrder: number
  }): Promise<Bucket>
  updateBucket(
    id: string,
    patch: Partial<Pick<Bucket, 'name' | 'kind' | 'groupId' | 'archived' | 'sortOrder'>>,
  ): Promise<Bucket>

  createEvent(event: NewEvent): Promise<LedgerEvent>
  updateEvent(id: string, event: NewEvent): Promise<LedgerEvent>
  deleteEvent(id: string): Promise<void>
}