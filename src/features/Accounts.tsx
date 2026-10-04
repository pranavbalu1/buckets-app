import { useMemo, useState } from 'react'
import { computeBalances } from '../domain/balances'
import { formatCents } from '../domain/money'
import type { Account, AccountType } from '../domain/models'
import { useLedger } from '../storage/store'
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS } from '../domain/models'

export default function Accounts() {
  const { accounts, events, addAccount } = useLedger()
  const balances = useMemo(() => computeBalances(events), [events])
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('checking')
  const [showArchived, setShowArchived] = useState(false)

  const visible = accounts.filter((a) => showArchived || !a.archived)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    await addAccount(trimmed, type)
    setName('')
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Accounts</h2>

      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <input className="min-w-40 flex-1 rounded border p-2" placeholder="New account name"
          value={name} onChange={(e) => setName(e.target.value)} />
        <select aria-label="Account type"   className="rounded border p-2" value={type}
          onChange={(e) => setType(e.target.value as AccountType)}>
          {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</option>)}
        </select>
        <button className="rounded bg-black px-4 py-2 text-white">Add</button>
      </form>

      <ul className="divide-y rounded border">
        {visible.length === 0 && <li className="p-3 text-gray-500">No accounts yet.</li>}
        {visible.map((a) => (
          <AccountRow key={a.id} account={a} balance={balances.accounts[a.id] ?? 0} />
        ))}
      </ul>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        Show archived
      </label>
    </div>
  )
}

function AccountRow({ account, balance }: { account: Account; balance: number }) {
  const updateAccount = useLedger((s) => s.updateAccount)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(account.name)

  async function save() {
    const trimmed = name.trim()
    if (trimmed && trimmed !== account.name) await updateAccount(account.id, { name: trimmed })
    setEditing(false)
  }

  return (
    <li className={`flex items-center gap-3 p-3 ${account.archived ? 'opacity-50' : ''}`}>
      <div className="flex-1">
        {editing ? (
          <input aria-label="Rename account" autoFocus className="rounded border p-1" value={name}
            onChange={(e) => setName(e.target.value)} onBlur={save}
            onKeyDown={(e) => e.key === 'Enter' && save()} />
        ) : (
          <div className="font-medium">{account.name}</div>
        )}
        <div className="text-sm text-gray-500">{ACCOUNT_TYPE_LABELS[account.type]}</div>
      </div>
      <div className={`tabular-nums ${balance < 0 ? 'text-red-600' : ''}`}>{formatCents(balance)}</div>
      <button className="text-sm underline" onClick={() => setEditing(true)}>Rename</button>
      <button className="text-sm underline"
        onClick={() => updateAccount(account.id, { archived: !account.archived })}>
        {account.archived ? 'Restore' : 'Archive'}
      </button>
    </li>
  )
}