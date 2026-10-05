import { useMemo, useRef, useState } from 'react'
import {
  Archive,
  ArrowDownToLine,
  Check,
  GripVertical,
  History,
  Pencil,
  RotateCcw,
  Trash2,
  WalletCards,
} from 'lucide-react'
import QuickAdd from './QuickAdd'
import { Button, Card, FormField, Input, Modal, Select, Tile, TileBoard } from '../components'
import { formatCents, parseDollars } from '../domain/money'
import { TYPE_LABELS } from '../domain/describe'
import { computeBalances } from '../domain/balances'
import { makeEvent } from '../domain/events'
import { todayString } from '../domain/dates'
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS } from '../domain/models'
import type { Account, AccountType } from '../domain/models'
import type { LedgerEvent } from '../domain/types'
import { accountInputSchema, accountTypeSchema, firstIssueMessage } from '../domain/validate'
import { useLedger } from '../storage/store'

export default function Accounts() {
  const { accounts, events, addAccount, addEvent, removeAccount } = useLedger()
  const balances = useMemo(() => computeBalances(events), [events])
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('checking')
  const [startingBalance, setStartingBalance] = useState('')
  const [formError, setFormError] = useState('')
  const [savingAccount, setSavingAccount] = useState(false)
  const [pendingOpeningBalance, setPendingOpeningBalance] = useState<{
    accountId: string
    accountName: string
    amountCents: number
  } | null>(null)
  const [retryingBalance, setRetryingBalance] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [depositOpen, setDepositOpen] = useState(false)
  const [historyAccount, setHistoryAccount] = useState<Account | null>(null)
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const visible = accounts.filter((account) => showArchived || !account.archived)
  const total = accounts
    .filter((account) => !account.archived)
    .reduce((sum, account) => sum + (balances.accounts[account.id] ?? 0), 0)
  const activeCount = accounts.filter((account) => !account.archived).length

  async function reorder(sourceId: string, targetId: string) {
    if (sourceId === targetId) return
    const ordered = [...accounts].sort((a, b) => a.sortOrder - b.sortOrder)
    const source = ordered.find((account) => account.id === sourceId)
    if (!source) return
    const without = ordered.filter((account) => account.id !== sourceId)
    const targetIndex = without.findIndex((account) => account.id === targetId)
    without.splice(targetIndex < 0 ? without.length : targetIndex, 0, source)
    await Promise.all(without.map((account, index) =>
      useLedger.getState().updateAccount(account.id, { sortOrder: index }),
    ))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (savingAccount || pendingOpeningBalance) return
    setFormError('')
    if (!trimmed) {
      setFormError('Enter an account name.')
      return
    }
    const rawBalance = startingBalance.trim()
    const negative = rawBalance.startsWith('-')
    const unsignedBalance = rawBalance.replace(/^[+-]/, '')
    const parsedBalance = rawBalance ? parseDollars(unsignedBalance) : 0
    if (parsedBalance === null) {
      setFormError('Enter a valid balance, like 1250.00 or -1250.00.')
      return
    }

    const openingBalanceCents = negative ? -parsedBalance : parsedBalance
    const validated = accountInputSchema.safeParse({ name: trimmed, type, openingBalanceCents })
    if (!validated.success) {
      setFormError(firstIssueMessage(validated.error, 'Enter valid account details.'))
      return
    }
    if (accounts.some((account) => account.name.trim().toLocaleLowerCase() === validated.data.name.toLocaleLowerCase())) {
      setFormError('An account with that name already exists.')
      return
    }
    setSavingAccount(true)
    const result = await addAccount(validated.data.name, validated.data.type, validated.data.openingBalanceCents)
    setSavingAccount(false)
    if (!result.account) {
      setFormError(useLedger.getState().error ?? 'Could not create the account.')
      return
    }

    setName('')
    if (!result.openingBalanceSaved) {
      setPendingOpeningBalance({ accountId: result.account.id, accountName: result.account.name, amountCents: openingBalanceCents })
      return
    }
    setStartingBalance('')
  }

  async function retryOpeningBalance() {
    if (!pendingOpeningBalance || retryingBalance) return
    setRetryingBalance(true)
    const amountCents = pendingOpeningBalance.amountCents
    const saved = await addEvent(makeEvent({
      type: 'adjustment',
      date: todayString(),
      amountCents: Math.abs(amountCents),
      accountId: pendingOpeningBalance.accountId,
      direction: amountCents > 0 ? 'in' : 'out',
      description: 'Opening balance',
    }))
    setRetryingBalance(false)
    if (saved) {
      setPendingOpeningBalance(null)
      setStartingBalance('')
    }
  }

  async function confirmDeleteAccount() {
    if (!accountToDelete || deletingAccount) return
    setDeletingAccount(true)
    setDeleteError('')
    const deleted = await removeAccount(accountToDelete.id)
    setDeletingAccount(false)
    if (deleted) setAccountToDelete(null)
    else setDeleteError(useLedger.getState().error || 'The account could not be deleted. Please try again.')
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <TileBoard page="accounts" className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <Tile id="account-total" label="Account totals" className="xl:col-span-2">
        <Card className="relative flex min-h-48 flex-col justify-between overflow-hidden border-border bg-gradient-to-br from-surface via-accent-soft/60 to-info/10 p-5 text-foreground shadow-md sm:p-6">
          <div className="absolute -right-10 -top-16 size-52 rounded-full border-[30px] border-accent/10" aria-hidden />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total across accounts</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{formatCents(total)}</h2>
            </div>
            <span className="grid size-10 place-items-center rounded-xl bg-sunken text-muted-foreground"><WalletCards className="size-5" /></span>
          </div>
          <div className="relative mt-6 flex items-end justify-between gap-4 border-t border-border pt-4">
            <div>
              <p className="text-xs text-muted-foreground">Active accounts</p>
              <p className="mt-0.5 text-sm font-semibold">{activeCount} {activeCount === 1 ? 'account' : 'accounts'}</p>
            </div>
            <Button className="border-border bg-surface text-foreground hover:bg-sunken" onClick={() => setDepositOpen(true)}>
              <ArrowDownToLine className="size-4" /> Record deposit
            </Button>
          </div>
        </Card>
      </Tile>

      <Tile id="new-account" label="Add an account" className="xl:col-span-3">
        <Card className="p-5 sm:p-6">
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-[0.13em] text-accent uppercase">Get started</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">Add an account</h2>
            <p className="mt-1 text-sm text-muted">Track the places where you keep your money.</p>
          </div>
          <form onSubmit={(event) => void submit(event)} className="grid gap-3 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto] sm:items-start">
            <FormField label="Account name" htmlFor="new-account-name" required>
              <Input id="new-account-name" className="min-w-0" placeholder="e.g. Everyday checking" value={name} disabled={Boolean(pendingOpeningBalance) || savingAccount} onChange={(event) => { setName(event.target.value); setFormError('') }} aria-invalid={Boolean(formError)} />
            </FormField>
            <FormField label="Account type" htmlFor="new-account-type">
              <Select
                id="new-account-type"
                value={type}
                onChange={(event) => {
                  const result = accountTypeSchema.safeParse(event.target.value)
                  if (result.success) setType(result.data)
                }}
                disabled={Boolean(pendingOpeningBalance) || savingAccount}
                options={ACCOUNT_TYPES.map((item) => ({ value: item, label: ACCOUNT_TYPE_LABELS[item] }))}
                className="h-[42px] rounded-lg border-line bg-surface shadow-none focus-visible:border-accent focus-visible:ring-accent/30"
              />
            </FormField>
            <FormField
              label="Starting/current balance"
              htmlFor="new-account-balance"
              error={formError}
              helperText={type === 'credit_card' ? 'Enter the amount owed as a negative value.' : 'Optional. Enter a negative value for debt.'}
            >
              <Input
                id="new-account-balance"
                inputMode="decimal"
                placeholder="0.00"
                value={startingBalance}
                disabled={Boolean(pendingOpeningBalance) || savingAccount}
                onChange={(event) => { setStartingBalance(event.target.value); setFormError('') }}
                aria-invalid={Boolean(formError)}
              />
            </FormField>
            <Button type="submit" variant="primary" disabled={savingAccount || Boolean(pendingOpeningBalance)} className="shrink-0 sm:mt-[1.375rem]">
              <WalletCards className="size-4" /> {savingAccount ? 'Adding…' : 'Add account'}
            </Button>
          </form>
          {pendingOpeningBalance && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-bad/25 bg-bad-soft/50 px-3 py-2.5" role="alert">
              <p className="min-w-0 text-xs text-muted">
                <strong className="text-ink">{pendingOpeningBalance.accountName}</strong> was created, but its starting balance ({formatCents(pendingOpeningBalance.amountCents)}) was not saved.
              </p>
              <Button size="sm" variant="secondary" disabled={retryingBalance} onClick={() => void retryOpeningBalance()}>
                {retryingBalance ? 'Saving…' : 'Retry balance'}
              </Button>
            </div>
          )}
        </Card>
      </Tile>

      <Tile id="account-list" label="Your accounts" className="col-span-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Your accounts</h2>
          <p className="mt-0.5 text-xs text-muted">Drag an account to change its order.</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium text-muted transition hover:text-ink">
          <input className="accent-accent" type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
          Show archived
        </label>
      </div>

      {visible.length === 0 ? (
        <Card className="flex flex-col items-center px-5 py-12 text-center">
          <span className="grid size-11 place-items-center rounded-xl bg-sunken text-muted"><WalletCards className="size-5" /></span>
          <p className="mt-3 font-medium">No accounts to show</p>
          <p className="mt-1 text-sm text-muted">Add an account above to start tracking balances.</p>
        </Card>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {visible.map((account) => (
            <AccountRow key={account.id} account={account} balance={balances.accounts[account.id] ?? 0}
              onHistory={() => setHistoryAccount(account)}
              onDragStart={() => setDraggedId(account.id)}
              onDragEnd={() => setDraggedId(null)}
              onDrop={() => {
                if (draggedId) void reorder(draggedId, account.id)
                setDraggedId(null)
              }}
              onDelete={() => { setDeleteError(''); setAccountToDelete(account) }} />
          ))}
        </ul>
      )}
      </Tile>
      </TileBoard>

      {depositOpen && (
        <Modal title="Record a deposit" onClose={() => setDepositOpen(false)}>
          <QuickAdd initialKind="deposit" onDone={() => setDepositOpen(false)} />
        </Modal>
      )}

      {historyAccount && <Modal title={`${historyAccount.name} history`} onClose={() => setHistoryAccount(null)}>
        <AccountHistory account={historyAccount} />
      </Modal>}

      {accountToDelete && <Modal title="Delete account?" onClose={() => { if (!deletingAccount) setAccountToDelete(null) }}>
        <div className="space-y-4">
          <div className="rounded-xl border border-bad/25 bg-bad-soft/50 p-3.5">
            <p className="font-semibold text-ink">{accountToDelete.name}</p>
            <p className="mt-1 text-xs text-muted">Current balance: {formatCents(balances.accounts[accountToDelete.id] ?? 0)} · {events.filter((event) => event.accountId === accountToDelete.id || event.toAccountId === accountToDelete.id).length} linked ledger entries</p>
          </div>
          <p className="text-sm leading-6 text-muted">
            This permanently deletes the account and its linked income, expenses, adjustments, transfers, scheduled items, paycheck templates, and reconciliation history. Removing linked transactions can change bucket balances. This cannot be undone.
          </p>
          {deleteError && <p className="text-sm text-bad" role="alert">{deleteError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" disabled={deletingAccount} onClick={() => setAccountToDelete(null)}>Keep account</Button>
            <Button type="button" variant="danger" disabled={deletingAccount} onClick={() => void confirmDeleteAccount()}>
              <Trash2 className="size-4" /> {deletingAccount ? 'Deleting…' : 'Delete account'}
            </Button>
          </div>
        </div>
      </Modal>}
    </div>
  )
}

function AccountRow({ account, balance, onHistory, onDragStart, onDragEnd, onDrop, onDelete }: {
  account: Account
  balance: number
  onHistory: () => void
  onDragStart: () => void
  onDragEnd: () => void
  onDrop: () => void
  onDelete: () => void
}) {
  const updateAccount = useLedger((state) => state.updateAccount)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(account.name)
  const [type, setType] = useState<AccountType>(account.type)
  const saving = useRef(false)

  async function save() {
    if (saving.current) return
    saving.current = true
    const trimmed = name.trim()
    try {
      if (trimmed && (trimmed !== account.name || type !== account.type)) await updateAccount(account.id, { name: trimmed, type })
      else { setName(account.name); setType(account.type) }
      setEditing(false)
    } finally {
      saving.current = false
    }
  }

  return (
    <li
      className={`list-none ${account.archived ? 'opacity-60' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <Card className="flex h-full items-center gap-3 p-4 transition hover:border-accent/35 hover:shadow-md sm:gap-4">
        <GripVertical className="size-4 shrink-0 cursor-grab text-muted/70" aria-label="Drag to reorder" />
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><WalletCards className="size-[18px]" /></span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-1">
              <Input aria-label="Rename account" autoFocus className="h-8 py-1" value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void save()
                if (event.key === 'Escape') { setName(account.name); setType(account.type); setEditing(false) }
              }} />
              <Select aria-label="Account type" value={type}
                onChange={(event) => {
                  const result = accountTypeSchema.safeParse(event.target.value)
                  if (result.success) setType(result.data)
                }}
                options={ACCOUNT_TYPES.map((item) => ({ value: item, label: ACCOUNT_TYPE_LABELS[item] }))}
                className="h-8 py-1 text-xs" />
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-semibold">{account.name}</span>
              {account.archived && <span className="rounded-md bg-sunken px-1.5 py-0.5 text-[10px] font-medium text-muted">Archived</span>}
            </div>
          )}
          {!editing && <div className="mt-0.5 text-xs text-muted">{ACCOUNT_TYPE_LABELS[account.type]}</div>}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-base font-semibold tabular-nums"><span>{formatCents(balance)}</span></div>
          <div className="text-[10px] text-muted">Current balance</div>
        </div>
        <div className="ml-1 flex shrink-0 items-center gap-1 border-l border-line pl-2">
          <button className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-sunken hover:text-ink" aria-label={`View ${account.name} history`} title="View account history" onClick={onHistory}>
            <History className="size-3.5" />
          </button>
          <button className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-sunken hover:text-ink" aria-label={editing ? `Save ${account.name}` : `Rename ${account.name}`} title={editing ? 'Save name' : 'Rename'} onClick={() => editing ? void save() : setEditing(true)}>
            {editing ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
          </button>
          <button className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-sunken hover:text-ink" aria-label={account.archived ? `Restore ${account.name}` : `Archive ${account.name}`} title={account.archived ? 'Restore account' : 'Archive account'} onClick={() => updateAccount(account.id, { archived: !account.archived })}>
            {account.archived ? <RotateCcw className="size-3.5" /> : <Archive className="size-3.5" />}
          </button>
          <button className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-bad-soft hover:text-bad" aria-label={`Delete ${account.name}`} title="Delete account" onClick={onDelete}>
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </Card>
    </li>
  )
}

function AccountHistory({ account }: { account: Account }) {
  const events = useLedger((state) => state.events)
  const history = useMemo(() => buildAccountHistory(events, account.id), [events, account.id])
  const currentBalance = history[0]?.balanceAfter ?? 0

  return <div>
    <div className="mb-2 flex items-center justify-between gap-3 rounded-lg bg-sunken px-3 py-2.5">
      <span className="text-xs text-muted">Current balance</span>
      <strong className="tabular-nums">{formatCents(currentBalance)}</strong>
    </div>
    {history.length ? <ul className="divide-y divide-border/70">
      {history.map(({ event, change, balanceAfter }) => <li key={event.id} className="flex items-center justify-between gap-3 py-3">
        <span className="min-w-0"><strong className="block truncate text-sm">{event.description || TYPE_LABELS[event.type]}</strong><span className="text-xs text-muted-foreground">{event.date} · {TYPE_LABELS[event.type]}</span></span>
        <span className="shrink-0 text-right">
          <strong className={`block tabular-nums ${change > 0 ? 'text-good' : change < 0 ? 'text-bad' : ''}`}>{change > 0 ? '+' : ''}{formatCents(change)}</strong>
          <span className="text-[10px] text-muted-foreground">balance {formatCents(balanceAfter)}</span>
        </span>
      </li>)}
    </ul> : <p className="py-8 text-center text-sm text-muted-foreground">No history for this account yet.</p>}
  </div>
}

function buildAccountHistory(events: LedgerEvent[], accountId: string) {
  const chronological = events.flatMap((event, index) => {
    const change = accountChange(event, accountId)
    return change === null ? [] : [{ event, index, change }]
  }).sort((a, b) => a.event.date.localeCompare(b.event.date) || a.index - b.index)
  let balance = 0
  return chronological.map((item) => {
    balance += item.change
    return { ...item, balanceAfter: balance }
  }).reverse()
}

function accountChange(event: LedgerEvent, accountId: string): number | null {
  switch (event.type) {
    case 'income': return event.accountId === accountId ? event.amountCents : null
    case 'expense': return event.accountId === accountId ? -event.amountCents : null
    case 'account_transfer':
      if (event.accountId === accountId) return -event.amountCents
      if (event.toAccountId === accountId) return event.amountCents
      return null
    case 'adjustment':
      return event.accountId === accountId ? (event.direction === 'in' ? event.amountCents : -event.amountCents) : null
    case 'allocation':
    case 'bucket_move': return null
  }
}
