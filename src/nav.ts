export const TABS = ['Dashboard', 'Budget', 'Transactions', 'Analytics', 'Accounts'] as const
export type Tab = (typeof TABS)[number]

export type AddKind = 'expense' | 'income' | 'move' | 'transfer'