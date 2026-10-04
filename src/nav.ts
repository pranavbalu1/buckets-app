export const TABS = ['Dashboard', 'Budget', 'Transactions', 'Analytics', 'Accounts', 'Settings'] as const
export type Tab = (typeof TABS)[number]

export type AddKind = 'expense' | 'income' | 'deposit' | 'move' | 'transfer'
