export const ACCOUNT_TYPES = ['checking', 'savings', 'cash', 'credit_card', 'other'] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]

export const BUCKET_KINDS = [
  'plain',
  'recurring',
  'save_by_date',
  'save_by_deposit',
  'save_until_date',
] as const
export type BucketKind = (typeof BUCKET_KINDS)[number]
export const LEGACY_BUCKET_KINDS = ['spending', 'savings', 'obligation'] as const
export type LegacyBucketKind = (typeof LEGACY_BUCKET_KINDS)[number]
export type StoredBucketKind = BucketKind | LegacyBucketKind

export interface Account {
  id: string
  name: string
  type: AccountType
  sortOrder: number
  archived: boolean
}

export interface BucketGroup {
  id: string
  name: string
  sortOrder: number
  color: string | null
}

export interface Bucket {
  id: string
  groupId: string | null
  name: string
  kind: StoredBucketKind
  sortOrder: number
  archived: boolean
  /** Monthly spending plan for expense buckets or contribution target for savings buckets. */
  monthlyTargetCents: number
  targetCents: number | null
  targetDate: string | null
  /** Hex color for the dot, or null to pick one automatically. */
  color: string | null
}

/** Savings and future-goal buckets use explicit funding rules, not expense coverage. */
export function isSavingsBucket(bucket: Pick<Bucket, 'kind'>): boolean {
  return bucket.kind === 'savings' || bucket.kind.startsWith('save_')
}

/** Plain and recurring buckets represent planned expenses, including legacy expense kinds. */
export function isExpenseBucket(bucket: Pick<Bucket, 'kind'>): boolean {
  return !isSavingsBucket(bucket)
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  cash: 'Cash',
  credit_card: 'Credit card',
  other: 'Other',
}

export const BUCKET_KIND_LABELS: Record<StoredBucketKind, string> = {
  plain: 'Plain old bucket',
  recurring: 'Recurring expense',
  save_by_date: 'Save X by Y date',
  save_by_deposit: 'Save X by depositing Z/mo',
  save_until_date: 'Save Z/mo until Y date',
  spending: 'Plain old bucket',
  savings: 'Save X by depositing Z/mo',
  obligation: 'Recurring expense',
}

export const BUCKET_KIND_DESCRIPTIONS: Record<BucketKind, string> = {
  plain: 'Hold money until you decide to spend it.',
  recurring: 'Set a monthly spending plan. Assignments are based on actual expenses, not this target.',
  save_by_date: 'Reach a target amount by a specific date.',
  save_by_deposit: 'Save a target amount at an affordable monthly pace.',
  save_until_date: 'Set a monthly amount and see what you will have by a date.',
}

export const BUCKET_COLORS = [
  '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899',
  '#14b8a6', '#eab308', '#ef4444', '#6366f1', '#64748b',
]

/** The bucket's chosen color, or a stable automatic one derived from its id. */
export function bucketColor(b: Bucket): string {
  if (b.color) return b.color
  let h = 0
  for (const ch of b.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return BUCKET_COLORS[h % BUCKET_COLORS.length]
}
