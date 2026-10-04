import { useState } from 'react'
import Field from '../components/Field'
import { todayString } from '../domain/dates'
import { makeEvent } from '../domain/events'
import { parseDollars } from '../domain/money'
import type { DraftEvent } from '../domain/types'
import { validateEvent } from '../domain/validate'
import type { AddKind } from '../nav'
import { useLedger } from '../storage/store'

const KINDS: { id: AddKind; label: string }[] = [
  { id: 'expense', label: 'Expense' },
  { id: 'income', label: 'Income' },
  { id: 'move', label: 'Move money' },
  { id: 'transfer', label: 'Transfer' },
]

function Select({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { id: string; name: string }[]
}) {
  return (
    <Field label={label}>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </Field>
  )
}

export default function QuickAdd({
  initialKind = 'expense',
  onDone,
}: {
  initialKind?: AddKind
  onDone?: () => void
}) {
  const accounts = useLedger((s) => s.accounts).filter((a) => !a.archived)
  const buckets = useLedger((s) => s.buckets).filter((b) => !b.archived)
  const addEvent = useLedger((s) => s.addEvent)

  const [kind, setKind] = useState<AddKind>(initialKind)
  const [date, setDate] = useState(todayString())
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [accountId, setAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [bucketId, setBucketId] = useState('')
  const [toBucketId, setToBucketId] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function build(cents: number): DraftEvent {
    const common = { date, amountCents: cents, description: description.trim() }
    switch (kind) {
      case 'expense':
        return makeEvent({ type: 'expense', ...common, accountId, bucketId })
      case 'income':
        return makeEvent({ type: 'income', ...common, accountId })
      case 'move':
        return makeEvent({ type: 'bucket_move', ...common, bucketId, toBucketId })
      case 'transfer':
        return makeEvent({ type: 'account_transfer', ...common, accountId, toAccountId })
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
    const event = build(cents)
    const problem = validateEvent(event)
    if (problem) {
      setError(problem)
      return
    }
    setBusy(true)
    const ok = await addEvent(event)
    setBusy(false)
    if (ok) {
      setAmount('')
      setDescription('')
      onDone?.()
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="inline-flex flex-wrap rounded-lg bg-sunken p-1" role="group" aria-label="Transaction type">
        {KINDS.map((k) => (
          <button key={k.id} type="button" aria-pressed={kind === k.id}
            onClick={() => { setKind(k.id); setError('') }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              kind === k.id ? 'bg-surface shadow-sm' : 'text-muted hover:text-ink'
            }`}>
            {k.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Amount">
          <input className="input" inputMode="decimal" placeholder="0.00" autoFocus value={amount}
            onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Date">
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        {kind === 'expense' && (
          <>
            <Select label="Bucket" value={bucketId} onChange={setBucketId} options={buckets} />
            <Select label="Paid from" value={accountId} onChange={setAccountId} options={accounts} />
          </>
        )}
        {kind === 'income' && (
          <Select label="Deposit to" value={accountId} onChange={setAccountId} options={accounts} />
        )}
        {kind === 'move' && (
          <>
            <Select label="From bucket" value={bucketId} onChange={setBucketId} options={buckets} />
            <Select label="To bucket" value={toBucketId} onChange={setToBucketId} options={buckets} />
          </>
        )}
        {kind === 'transfer' && (
          <>
            <Select label="From account" value={accountId} onChange={setAccountId} options={accounts} />
            <Select label="To account" value={toAccountId} onChange={setToAccountId} options={accounts} />
          </>
        )}

        <div className="sm:col-span-2">
          <Field label="Description (optional)">
            <input className="input" placeholder="e.g. Walmart, Paycheck" value={description}
              onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
      </div>

      {error && <p className="text-sm text-bad">{error}</p>}
      <button disabled={busy} className="btn btn-primary w-full sm:w-auto">
        {busy ? 'Saving…' : 'Add'}
      </button>
    </form>
  )
}