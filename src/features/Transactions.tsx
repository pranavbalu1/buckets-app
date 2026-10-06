import { useState } from 'react'
import {
  ArrowDownLeft,
  ArrowLeftRight,
  CircleDollarSign,
  Pencil,
  ReceiptText,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button, Card, Input, Modal, Select, Tile, TileBoard } from '../components'
import QuickAdd from './QuickAdd'
import Money from '../app/components/Money'
import { dateLabel } from '../domain/dates'
import { cashEffect, describeEvent, TYPE_LABELS } from '../domain/describe'
import { formatCents, parseDollars } from '../domain/money'
import { isValidDate } from '../domain/validate'
import type { EventType, LedgerEvent } from '../domain/types'
import { useLedger } from '../storage/store'

const FILTERS: ('all' | EventType)[] = [
  'all', 'income', 'expense', 'allocation', 'bucket_move', 'account_transfer', 'adjustment',
]

const eventIcons: Record<EventType, LucideIcon> = {
  income: ArrowDownLeft,
  expense: ReceiptText,
  allocation: CircleDollarSign,
  bucket_move: ArrowLeftRight,
  account_transfer: ArrowLeftRight,
  adjustment: SlidersHorizontal,
}

const eventColors: Record<EventType, string> = {
  income: 'bg-good/10 text-good',
  expense: 'bg-expense-soft text-expense',
  allocation: 'bg-accent-soft text-accent',
  bucket_move: 'bg-sunken text-muted',
  account_transfer: 'bg-sunken text-muted',
  adjustment: 'bg-sunken text-muted',
}

export default function Transactions() {
  const { events, accounts, buckets, removeEvent } = useLedger()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | EventType>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [bucketFilter, setBucketFilter] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [editing, setEditing] = useState<LedgerEvent | null>(null)

  const accountName = (id: string | null) => accounts.find((account) => account.id === id)?.name ?? '—'
  const bucketName = (id: string | null) => buckets.find((bucket) => bucket.id === id)?.name ?? '—'
  const q = query.trim().toLowerCase()
  const minCents = minAmount ? parseDollars(minAmount) : null
  const maxCents = maxAmount ? parseDollars(maxAmount) : null
  const filterError =
    (fromDate && !isValidDate(fromDate)) || (toDate && !isValidDate(toDate))
      ? 'Enter valid dates for the transaction range.'
      : fromDate && toDate && fromDate > toDate
        ? 'The start date must be on or before the end date.'
        : minAmount && minCents === null
          ? 'Enter a valid minimum amount.'
          : maxAmount && maxCents === null
            ? 'Enter a valid maximum amount.'
            : minCents !== null && maxCents !== null && minCents > maxCents
              ? 'The minimum amount cannot be greater than the maximum amount.'
              : ''
  const matches = (event: LedgerEvent) =>
    !filterError &&
    (filter === 'all' || event.type === filter) &&
    (!fromDate || event.date >= fromDate) &&
    (!toDate || event.date <= toDate) &&
    (!accountFilter || event.accountId === accountFilter || event.toAccountId === accountFilter) &&
    (!bucketFilter || event.bucketId === bucketFilter || event.toBucketId === bucketFilter) &&
    (!minAmount || (minCents !== null && event.amountCents >= minCents)) &&
    (!maxAmount || (maxCents !== null && event.amountCents <= maxCents)) &&
    (!q || [
      event.description,
      event.payee ?? '',
      event.customType ?? '',
      TYPE_LABELS[event.type],
      describeEvent(event, accountName, bucketName),
      (event.amountCents / 100).toFixed(2),
    ].join(' ').toLowerCase().includes(q))

  // Reversing before the stable sort keeps the latest entry first within a day.
  const filtered = [...events].reverse().sort((a, b) => b.date.localeCompare(a.date)).filter(matches)
  const filteredAmountTotal = filtered.reduce((sum, event) => sum + event.amountCents, 0)
  const filteredCashImpact = filtered.reduce((sum, event) => sum + (cashEffect(event) ?? 0), 0)
  const byDate: { date: string; items: LedgerEvent[] }[] = []
  for (const event of filtered) {
    const last = byDate[byDate.length - 1]
    if (last && last.date === event.date) last.items.push(event)
    else byDate.push({ date: event.date, items: [event] })
  }

  async function remove(event: LedgerEvent) {
    const what = `${TYPE_LABELS[event.type].toLowerCase()} of ${formatCents(event.amountCents)}`
    if (window.confirm(`Delete this ${what}? Balances will be recalculated.`)) await removeEvent(event.id)
  }

  const hasFilters = Boolean(q || filter !== 'all' || fromDate || toDate || accountFilter || bucketFilter || minAmount || maxAmount)
  function clearFilters() {
    setQuery(''); setFilter('all'); setFromDate(''); setToDate('')
    setAccountFilter(''); setBucketFilter(''); setMinAmount(''); setMaxAmount('')
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <TileBoard page="transactions" className="grid grid-cols-1 gap-5 md:gap-6">
      <Tile id="filters" label="Transaction filters">
      <Card className="p-3.5 md:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input
              aria-label="Search transactions"
              placeholder="Search description, account, bucket…"
              className="pl-9 pr-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && <button className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:bg-sunken hover:text-ink" aria-label="Clear search" onClick={() => setQuery('')}><X className="size-3.5" /></button>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((value) => {
              const selected = filter === value
              return (
                <button
                  key={value}
                  aria-pressed={selected}
                  onClick={() => setFilter(value)}
                  className={`min-h-10 rounded-lg px-3 py-2 text-xs font-medium transition ${selected ? 'bg-accent text-accent-ink shadow-sm' : 'bg-sunken/70 text-muted hover:bg-sunken hover:text-ink'}`}
                >
                  {value === 'all' ? 'All' : TYPE_LABELS[value]}
                </button>
              )
            })}
          </div>
        </div>
        <div className="mt-4 grid gap-3 border-t border-line pt-3 sm:grid-cols-2 xl:grid-cols-6">
          <label className="text-xs text-muted">From date<Input type="date" aria-label="Filter from date" className="mt-1 h-9" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
          <label className="text-xs text-muted">To date<Input type="date" aria-label="Filter to date" className="mt-1 h-9" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
          <label className="text-xs text-muted">Account<Select aria-label="Filter account" value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)} options={[{ value: '', label: 'Any account' }, ...accounts.map((account) => ({ value: account.id, label: account.name }))]} className="mt-1 h-9" /></label>
          <label className="text-xs text-muted">Bucket<Select aria-label="Filter bucket" value={bucketFilter} onChange={(event) => setBucketFilter(event.target.value)} options={[{ value: '', label: 'Any bucket' }, ...buckets.map((bucket) => ({ value: bucket.id, label: bucket.name }))]} className="mt-1 h-9" /></label>
          <label className="text-xs text-muted">Min amount<Input inputMode="decimal" aria-label="Filter minimum amount" className="mt-1 h-9" placeholder="0.00" value={minAmount} onChange={(event) => setMinAmount(event.target.value)} /></label>
          <label className="text-xs text-muted">Max amount<Input inputMode="decimal" aria-label="Filter maximum amount" className="mt-1 h-9" placeholder="0.00" value={maxAmount} onChange={(event) => setMaxAmount(event.target.value)} /></label>
        </div>
        {filterError && <p className="mt-2 text-sm text-bad" role="alert">{filterError}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3 text-xs text-muted">
          <SlidersHorizontal className="size-3.5" />
          <span>Showing <strong className="font-semibold text-ink">{filtered.length}</strong> of {events.length} transactions</span>
          <span>Recorded total <strong className="font-semibold tabular-nums text-ink">{formatCents(filteredAmountTotal)}</strong></span>
          <span title="Includes income, expenses, and adjustments; excludes account transfers, bucket moves, and assignments.">Net cash impact <Money cents={filteredCashImpact} className="font-semibold" /></span>
          {hasFilters && <button className="ml-auto font-medium text-primary hover:underline" onClick={clearFilters}>Clear filters</button>}
        </div>
      </Card>
      </Tile>

      {events.length === 0 && (
        <Tile id="empty-history" label="Empty transaction history">
        <Card className="flex flex-col items-center px-5 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent"><ReceiptText className="size-5" /></span>
          <h2 className="mt-4 font-semibold">Your transaction history starts here</h2>
          <p className="mt-1 max-w-sm text-sm text-muted">Once you record income, spending, or a transfer, it will appear here.</p>
        </Card>
        </Tile>
      )}
      {events.length > 0 && filtered.length === 0 && (
        <Tile id="empty-filter-results" label="No matching transactions">
        <Card className="px-5 py-12 text-center">
          <p className="font-medium">No transactions match those filters.</p>
          <p className="mt-1 text-sm text-muted">Try a different search or clear the current filters.</p>
        </Card>
        </Tile>
      )}

      {byDate.map((group) => (
        <Tile key={group.date} id={`date-${group.date}`} label={`Transactions ${dateLabel(group.date)}`}>
        <section key={group.date} className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">{dateLabel(group.date)}</h2>
            <span className="text-xs text-muted">{group.items.length} {group.items.length === 1 ? 'entry' : 'entries'}</span>
          </div>
          <Card className="overflow-hidden divide-y divide-line">
            {group.items.map((event) => {
              const Icon = eventIcons[event.type]
              const effect = cashEffect(event)
              return (
                <div key={event.id} className="group flex min-w-0 flex-wrap items-center gap-3 px-3 py-3 transition hover:bg-sunken/45 sm:flex-nowrap sm:gap-4 sm:px-4">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${eventColors[event.type]}`}><Icon className="size-[18px]" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="truncate text-sm font-semibold">{event.description || TYPE_LABELS[event.type]}</span>
                      <span className="rounded-md bg-sunken px-1.5 py-0.5 text-[10px] font-medium text-muted">{TYPE_LABELS[event.type]}</span>
                      {event.customType && <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{event.customType}</span>}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted">{describeEvent(event, accountName, bucketName)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Money cents={effect ?? event.amountCents} className={effect !== null && effect > 0 ? 'font-semibold text-good' : 'font-medium'} />
                    <div className="mt-0.5 hidden text-[10px] text-muted sm:block">{formatCents(event.amountCents)} recorded</div>
                  </div>
                  <div className="ml-auto flex w-full shrink-0 justify-end gap-1 sm:ml-0 sm:w-auto">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${TYPE_LABELS[event.type]} on ${event.date}`}
                    title="Edit transaction"
                    className="size-10 shrink-0 rounded-lg opacity-100 sm:size-8 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                    onClick={() => setEditing(event)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="danger"
                    size="icon"
                    aria-label={`Delete ${TYPE_LABELS[event.type]} on ${event.date}`}
                    title="Delete transaction"
                    className="size-10 shrink-0 rounded-lg opacity-100 sm:size-8 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                    onClick={() => remove(event)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                  </div>
                </div>
              )
            })}
          </Card>
        </section>
        </Tile>
      ))}
      </TileBoard>

      {editing && <Modal title="Edit transaction" onClose={() => setEditing(null)}>
        <QuickAdd key={editing.id} initialEvent={editing} onDone={() => setEditing(null)} />
      </Modal>}
    </div>
  )
}
