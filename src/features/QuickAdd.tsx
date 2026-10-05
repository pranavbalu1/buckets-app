import { useState } from 'react'
import { todayString } from '../domain/dates'
import { makeEvent } from '../domain/events'
import { maxAllocatable, maxReturnable } from '../domain/budget'
import { centsToInput, formatCents, parseDollars } from '../domain/money'
import type { DraftEvent, EventType, LedgerEvent } from '../domain/types'
import { validateEvent } from '../domain/validate'
import type { AddKind } from '../nav'
import { useLedger } from '../storage/store'
import { Button } from '../components/ui/button'
import { FormField } from '../components/ui/form-field'
import { Input } from '../components/ui/input'

const KINDS: { id: AddKind; label: string }[] = [
  { id: 'expense', label: 'Expense' },
  { id: 'income', label: 'Income' },
  { id: 'deposit', label: 'Deposit' },
  { id: 'move', label: 'Move money' },
  { id: 'transfer', label: 'Transfer' },
]

type QuickKind = AddKind | 'allocation' | 'adjustment'

function initialKind(event?: LedgerEvent): QuickKind | null {
  if (!event) return null
  const kinds: Record<EventType, QuickKind> = {
    income: 'income', expense: 'expense', allocation: 'allocation',
    account_transfer: 'transfer', bucket_move: 'move', adjustment: 'adjustment',
  }
  return kinds[event.type]
}

function Select({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { id: string; name: string }[]
}) {
  return (
    <FormField label={label}>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </FormField>
  )
}

export default function QuickAdd({
  initialKind: requestedKind = 'expense',
  initialEvent,
  onDone,
}: {
  initialKind?: AddKind
  initialEvent?: LedgerEvent
  onDone?: () => void
}) {
  const allAccounts = useLedger((s) => s.accounts)
  const allBuckets = useLedger((s) => s.buckets)
  const groups = useLedger((s) => s.groups)
  const events = useLedger((s) => s.events)
  const accounts = allAccounts.filter((a) => !a.archived || a.id === initialEvent?.accountId || a.id === initialEvent?.toAccountId)
  const buckets = allBuckets.filter((b) => !b.archived || b.id === initialEvent?.bucketId || b.id === initialEvent?.toBucketId)
  const addEvent = useLedger((s) => s.addEvent)
  const editEvent = useLedger((s) => s.editEvent)

  const [kind, setKind] = useState<QuickKind>(initialKind(initialEvent) ?? requestedKind)
  const [date, setDate] = useState(initialEvent?.date ?? todayString())
  const [amount, setAmount] = useState(initialEvent ? centsToInput(initialEvent.amountCents) : '')
  const [description, setDescription] = useState(initialEvent?.description ?? '')
  const [payee, setPayee] = useState(initialEvent?.payee ?? '')
  const [notes, setNotes] = useState(initialEvent?.notes ?? '')
  const [customType, setCustomType] = useState(initialEvent?.customType ?? '')
  const [accountId, setAccountId] = useState(initialEvent?.accountId ?? '')
  const [toAccountId, setToAccountId] = useState(initialEvent?.toAccountId ?? '')
  const [bucketId, setBucketId] = useState(initialEvent?.bucketId ?? '')
  const [toBucketId, setToBucketId] = useState(initialEvent?.toBucketId ?? '')
  const [direction, setDirection] = useState<'in' | 'out'>(initialEvent?.direction ?? 'in')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const categoryOptions = buckets.map((bucket) => {
    const groupName = groups.find((group) => group.id === bucket.groupId)?.name
    return { id: bucket.id, name: groupName ? `${groupName} / ${bucket.name}` : bucket.name }
  })
  const knownCustomTypes = [...new Set(events.flatMap((event) => event.customType?.trim() ? [event.customType.trim()] : []))]
    .sort((a, b) => a.localeCompare(b))

  function build(cents: number): DraftEvent {
    const common = {
      date,
      amountCents: cents,
      description: description.trim(),
      payee: payee.trim() || null,
      notes: notes.trim() || null,
      customType: customType.trim() || null,
    }
    switch (kind) {
      case 'expense': return makeEvent({ type: 'expense', ...common, accountId, bucketId })
      case 'income':
      case 'deposit': return makeEvent({ type: 'income', ...common, accountId })
      case 'move': return makeEvent({ type: 'bucket_move', ...common, bucketId, toBucketId })
      case 'transfer': return makeEvent({ type: 'account_transfer', ...common, accountId, toAccountId })
      case 'allocation': return makeEvent({
        type: 'allocation', ...common, bucketId, direction,
        month: `${date.slice(0, 7)}-01`,
      })
      case 'adjustment': return makeEvent({ type: 'adjustment', ...common, accountId, direction })
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const cents = parseDollars(amount)
    if (cents === null || cents <= 0) {
      setError('Enter a valid amount, like 12.50')
      return
    }
    if (customType.trim().length > 40) {
      setError('Custom transaction types must be 40 characters or fewer.')
      return
    }
    const event = build(cents)
    const problem = validateEvent(event)
    if (problem) {
      setError(problem)
      return
    }
    if (event.type === 'allocation' && event.bucketId && event.month) {
      const otherEvents = events.filter((item) => item.id !== initialEvent?.id)
      const month = event.month.slice(0, 7)
      const available = event.direction === 'out'
        ? maxReturnable(otherEvents, event.bucketId, month)
        : maxAllocatable(otherEvents, month)
      if (cents > available) {
        setError(event.direction === 'out'
          ? `Only ${formatCents(available)} can come out of this bucket.`
          : `Only ${formatCents(available)} is available to assign.`)
        return
      }
    }
    setBusy(true)
    const ok = initialEvent
      ? await editEvent(initialEvent.id, event)
      : await addEvent(event)
    setBusy(false)
    if (ok) onDone?.()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {!initialEvent && (
        <div className="inline-flex flex-wrap rounded-lg bg-sunken p-1" role="group" aria-label="Transaction type">
          {KINDS.map((k) => (
            <button key={k.id} type="button" aria-pressed={kind === k.id}
              onClick={() => { setKind(k.id); setError('') }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${kind === k.id ? 'bg-surface shadow-sm' : 'text-muted hover:text-ink'}`}>
              {k.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Amount">
          <Input inputMode="decimal" placeholder="0.00" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} />
        </FormField>
        <FormField label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>

        {kind === 'expense' && <Select label="Category" value={bucketId} onChange={setBucketId} options={categoryOptions} />}
        {kind === 'allocation' && <Select label="Bucket" value={bucketId} onChange={setBucketId} options={buckets} />}
        {kind === 'expense' && <Select label="Paid from" value={accountId} onChange={setAccountId} options={accounts} />}
        {(kind === 'income' || kind === 'deposit') && <Select label="Deposit to" value={accountId} onChange={setAccountId} options={accounts} />}
        {kind === 'move' && <>
          <Select label="From bucket" value={bucketId} onChange={setBucketId} options={buckets} />
          <Select label="To bucket" value={toBucketId} onChange={setToBucketId} options={buckets} />
        </>}
        {kind === 'transfer' && <>
          <Select label="From account" value={accountId} onChange={setAccountId} options={accounts} />
          <Select label="To account" value={toAccountId} onChange={setToAccountId} options={accounts} />
        </>}
        {kind === 'adjustment' && <Select label="Account" value={accountId} onChange={setAccountId} options={accounts} />}
        {(kind === 'allocation' || kind === 'adjustment') && (
          <FormField label={kind === 'allocation' ? 'Money movement' : 'Adjustment direction'}>
            <select className="input" value={direction} onChange={(e) => setDirection(e.target.value as 'in' | 'out')}>
              {kind === 'allocation' ? <><option value="in">Assign to bucket</option><option value="out">Return to available</option></> : <><option value="in">Balance increases</option><option value="out">Balance decreases</option></>}
            </select>
          </FormField>
        )}

        <FormField label="Description (optional)">
          <Input placeholder="e.g. Grocery run, paycheck" value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormField>
        <FormField label="Payee (optional)">
          <Input placeholder="e.g. Market Street" value={payee} onChange={(e) => setPayee(e.target.value)} />
        </FormField>
        <div>
          <FormField label="Custom transaction type (optional)" helperText="Choose a saved type or enter a new one. It will be suggested after you save this transaction.">
            <Input list="custom-transaction-types" placeholder="e.g. Medical, Reimbursement" value={customType} onChange={(e) => setCustomType(e.target.value)} />
          </FormField>
          <datalist id="custom-transaction-types">
            {knownCustomTypes.map((label) => <option key={label} value={label} />)}
          </datalist>
        </div>
        <div className="sm:col-span-2">
          <FormField label="Notes (optional)">
            <Input placeholder="Add a note" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      <Button disabled={busy} variant="primary" className="w-full sm:w-auto">
        {busy ? 'Saving…' : initialEvent ? 'Save changes' : 'Add'}
      </Button>
    </form>
  )
}
