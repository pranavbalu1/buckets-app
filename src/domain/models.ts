export const ACCOUNT_TYPES = ['checking', 'savings', 'cash', 'credit_card', 'other'] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]

export const BUCKET_KINDS = ['spending', 'savings', 'obligation'] as const
export type BucketKind = (typeof BUCKET_KINDS)[number]

export interface Account {
  id: string
  name: string
  type: AccountType
  archived: boolean
}

export interface BucketGroup {
  id: string
  name: string
  sortOrder: number
}

export interface Bucket {
  id: string
  groupId: string | null
  name: string
  kind: BucketKind
  sortOrder: number
  archived: boolean
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  cash: 'Cash',
  credit_card: 'Credit card',
  other: 'Other',
}

export const BUCKET_KIND_LABELS: Record<BucketKind, string> = {
  spending: 'Spending',
  savings: 'Savings',
  obligation: 'Obligation',
}