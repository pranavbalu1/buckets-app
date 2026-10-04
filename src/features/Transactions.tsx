import { useState } from 'react'
import Money from '../components/Money'
import { dateLabel } from '../domain/dates'
import { cashEffect, describeEvent, TYPE_LABELS } from '../domain/describe'
import { formatCents } from '../domain/money'
import type { EventType, LedgerEvent } from '../domain/types'
import { useLedger } from '../storage/store'

const FILTERS: ('all' | EventType)[] = [
  'all', 'income', 'expense', 'allocation', 'bucket_move', 'account_transfer', 'adjustment',
]

export default function Transactions() {
  const { events, accounts, buckets, removeEvent } = useLedger()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | EventType>('all')

  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? '—'
  const bucketName = (id: string | null) => buckets.find((b) => b.id === id)?.name ?? '—'

  const q = query.trim().toLowerCase()
  const matches = (e: LedgerEvent) =>
    (filter === 'all' || e.type === filter) &&
    (!q ||
      [
        e.description,
        e.payee ?? '',
        TYPE_LABELS[e.type],
        describeEvent(e, accountName, bucketName),
        (e.amountCents / 100).toFixed(2),
      ]
        .join(' ')
        .toLowerCase()
        .includes(q))

  // Newest first; reversing before the stable sort puts the latest entry first within a day.
  const filtered = [...events].reverse().sort((a, b) => b.date.localeCompare(a.date)).filter(matches)

  const byDate: { date: string; items: LedgerEvent[] }[] = []
  for (const e of filtered) {
    const last = byDate[byDate.length - 1]
    if (last && last.date === e.date) last.items.push(e)
    else byDate.push({ date: e.date, items: [e] })
  }

  async function remove(e: LedgerEvent) {
    const what = `${TYPE_LABELS[e.type].toLowerCase()} of ${formatCents(e.amountCents)}`
    if (window.confirm(`Delete this ${what}? Balances will be recalculated.`)) await removeEvent(e.id)
  }

  return (
    <div className="space-y-4">
      <input aria-label="Search transactions" className="input" placeholder="Search transactions"
        value={query} onChange={(e) => setQuery(e.target.value)} />

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-sm ${
              filter === f ? 'border-transparent bg-accent text-accent-ink' : 'border-line bg-surface text-muted hover:text-ink'
            }`}>
            {f === 'all' ? 'All' : TYPE_LABELS[f]}
          </button>
        ))}
      </div>

      {events.length === 0 && <p className="text-muted">No transactions yet.</p>}
      {events.length > 0 && filtered.length === 0 && <p className="text-muted">No matches.</p>}

      {byDate.map((group) => (
        <section key={group.date} className="space-y-1.5">
          <h2 className="text-xs font-medium tracking-wide text-muted uppercase">{dateLabel(group.date)}</h2>
          <ul className="card divide-y divide-line">
            {group.items.map((e) => {
              const effect = cashEffect(e)
              return (
                <li key={e.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{e.description || TYPE_LABELS[e.type]}</div>
                    <div className="truncate text-sm text-muted">
                      {TYPE_LABELS[e.type]} · {describeEvent(e, accountName, bucketName)}
                    </div>
                  </div>
                  <Money cents={effect ?? e.amountCents}
                    className={effect !== null && effect > 0 ? 'text-good' : ''} />
                  <button className="btn-link" aria-label={`Delete ${TYPE_LABELS[e.type]} on ${e.date}`}
                    onClick={() => remove(e)}>Delete</button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}