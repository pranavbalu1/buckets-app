import { useMemo, useState } from 'react'
import Money from '../components/Money'
import { computeBalances } from '../domain/balances'
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS } from '../domain/models'
import type { Account, AccountType } from '../domain/models'
import { useLedger } from '../storage/store'

export default function Accounts() {
  const { accounts, events, addAccount } = useLedger()
  const balances = useMemo(() => computeBalances(events), [events])
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('checking')
  const [showArchived, setShowArchived] = useState(false)

  const visible = accounts.filter((a) => showArchived || !a.archived)
  const total = accounts
    .filter((a) => !a.archived)
    .reduce((sum, a) => sum + (balances.accounts[a.id] ?? 0), 0)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    if (await addAccount(trimmed, type)) setName('')
  }

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="text-sm text-muted">Total across accounts</div>
        <div className="text-3xl font-semibold"><Money cents={total} /></div>
      </div>

      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <input aria-label="New account name" className="input min-w-40 flex-1" placeholder="New account name"
          value={name} onChange={(e) => setName(e.target.value)} />
        <select aria-label="Account type" className="input w-auto" value={type}
          onChange={(e) => setType(e.target.value as AccountType)}>
          {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</option>)}
        </select>
        <button className="btn btn-primary">Add account</button>
      </form>

      <ul className="card divide-y divide-line">
        {visible.length === 0 && <li className="p-4 text-muted">No accounts yet.</li>}
        {visible.map((a) => (
          <AccountRow key={a.id} account={a} balance={balances.accounts[a.id] ?? 0} />
        ))}
      </ul>

      <label className="flex items-center gap-2 text-sm text-muted">
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
    <li className={`flex flex-wrap items-center gap-3 p-4 ${account.archived ? 'opacity-50' : ''}`}>
      <div className="min-w-0 flex-1">
        {editing ? (
          <input aria-label="Rename account" autoFocus className="input py-1" value={name}
            onChange={(e) => setName(e.target.value)} onBlur={save}
            onKeyDown={(e) => e.key === 'Enter' && save()} />
        ) : (
          <div className="truncate font-medium">{account.name}</div>
        )}
        <div className="text-sm text-muted">{ACCOUNT_TYPE_LABELS[account.type]}</div>
      </div>
      <div className="text-lg font-semibold"><Money cents={balance} /></div>
      <button className="btn-link" onClick={() => setEditing(true)}>Rename</button>
      <button className="btn-link"
        onClick={() => updateAccount(account.id, { archived: !account.archived })}>
        {account.archived ? 'Restore' : 'Archive'}
      </button>
    </li>
  )
}