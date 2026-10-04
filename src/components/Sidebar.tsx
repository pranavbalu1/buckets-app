import { useMemo } from 'react'
import { computeBalances } from '../domain/balances'
import { formatCents } from '../domain/money'
import { TABS } from '../nav'
import type { Tab } from '../nav'
import { useLedger } from '../storage/store'
import Money from './Money'

export default function Sidebar({
  tab,
  onNavigate,
  onAdd,
  onLogout,
}: {
  tab: Tab
  onNavigate: (t: Tab) => void
  onAdd: () => void
  onLogout: () => void
}) {
  const accounts = useLedger((s) => s.accounts)
  const events = useLedger((s) => s.events)
  const balances = useMemo(() => computeBalances(events), [events])

  const active = accounts.filter((a) => !a.archived)
  const total = active.reduce((sum, a) => sum + (balances.accounts[a.id] ?? 0), 0)

  return (
    <aside className="border-b border-line bg-surface md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent font-bold text-accent-ink">B</div>
          <span className="text-lg font-semibold">Buckets</span>
        </div>
        <button className="btn-link md:hidden" onClick={onLogout}>
          Log out
        </button>
      </div>

      <div className="px-3 pb-3">
        <button className="btn btn-primary w-full" onClick={onAdd}>
          + Add transaction
          <kbd className="ml-1 hidden rounded bg-white/20 px-1.5 text-xs md:inline">N</kbd>
        </button>
      </div>

      <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => onNavigate(t)}
            aria-current={tab === t ? 'page' : undefined}
            className={`rounded-lg px-3 py-2 text-left text-sm font-medium whitespace-nowrap ${
              tab === t ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-sunken hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <div className="hidden min-h-0 flex-1 overflow-y-auto px-4 pt-6 md:block">
        <div className="mb-2 flex items-baseline justify-between text-xs font-medium tracking-wide text-muted uppercase">
          <span>Accounts</span>
          <span className="tabular-nums">{formatCents(total)}</span>
        </div>
        {active.length === 0 && <p className="text-sm text-muted">No accounts yet.</p>}
        <ul className="space-y-1">
          {active.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => onNavigate('Accounts')}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-sunken"
              >
                <span className="truncate">{a.name}</span>
                <Money cents={balances.accounts[a.id] ?? 0} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="hidden border-t border-line p-4 md:block">
        <button className="btn w-full" onClick={onLogout}>
          Log out
        </button>
      </div>
    </aside>
  )
}