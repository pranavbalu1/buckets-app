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
  /** The "Want": how much you would like to put in this bucket each month. */
  monthlyTargetCents: number
  /** Hex color for the dot, or null to pick one automatically. */
  color: string | null
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