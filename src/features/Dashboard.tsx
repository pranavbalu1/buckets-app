import { useMemo } from 'react'
import Money from '../components/Money'
import { computeBalances } from '../domain/balances'
import { computeMonthBudget } from '../domain/budget'
import { currentMonth, monthLabel } from '../domain/dates'
import { cashEffect, describeEvent, TYPE_LABELS } from '../domain/describe'
import type { AddKind, Tab } from '../nav'
import { useLedger } from '../storage/store'

const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0)

export default function Dashboard({ onAdd, onNavigate }: {
  onAdd: (kind: AddKind) => void
  onNavigate: (tab: Tab) => void
}) {
  const { events, accounts, buckets } = useLedger()
  const month = currentMonth()

  const b = useMemo(() => computeBalances(events), [events])
  const m = useMemo(
    () => computeMonthBudget(events, buckets.map((x) => x.id), month),
    [events, buckets, month],
  )

  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? '—'
  const bucketName = (id: string | null) => buckets.find((x) => x.id === id)?.name ?? '—'
  const recent = [...events].reverse().sort((a, c) => c.date.localeCompare(a.date)).slice(0, 6)
  const overspent = m.buckets.filter((r) => r.availableCents < 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" onClick={() => onAdd('expense')}>Add expense</button>
        <button className="btn" onClick={() => onAdd('income')}>Add income</button>
        <button className="btn" onClick={() => onAdd('move')}>Move money</button>
        <button className="btn" onClick={() => onNavigate('Budget')}>Open budget</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Money in accounts" cents={sum(b.accounts)} />
        <Stat label="Assigned to buckets" cents={sum(b.buckets)} />
        <Stat label="Left to assign" cents={b.unallocated} />
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">{monthLabel(month)}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Income" cents={m.incomeCents} />
          <Stat label="Assigned" cents={m.allocatedCents} />
          <Stat label="Spent" cents={m.spentCents} />
        </div>
      </section>

      {overspent.length > 0 && (
        <section className="card border-bad/40 p-4">
          <h2 className="mb-2 font-semibold text-bad">Needs attention</h2>
          <ul className="space-y-1 text-sm">
            {overspent.map((r) => (
              <li key={r.bucketId} className="flex justify-between">
                <span>{bucketName(r.bucketId)} is overspent</span>
                <Money cents={r.availableCents} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Recent transactions</h2>
        {recent.length === 0 && <p className="text-muted">Nothing yet.</p>}
        {recent.length > 0 && (
          <ul className="card divide-y divide-line">
            {recent.map((e) => {
              const effect = cashEffect(e)
              return (
                <li key={e.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{e.description || TYPE_LABELS[e.type]}</div>
                    <div className="truncate text-sm text-muted">
                      {e.date} · {describeEvent(e, accountName, bucketName)}
                    </div>
                  </div>
                  <Money cents={effect ?? e.amountCents}
                    className={effect !== null && effect > 0 ? 'text-good' : ''} />
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className="text-2xl font-semibold"><Money cents={cents} /></div>
    </div>
  )
}