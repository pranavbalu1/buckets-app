import { useMemo } from 'react'
import {
  ArrowLeftRight,
  BarChart3,
  Settings2,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Wallet,
  WalletCards,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { computeBalances } from '../domain/balances'
import { formatCents } from '../domain/money'
import { TABS } from '../nav'
import type { Tab } from '../nav'
import { useLedger } from '../storage/store'

const tabIcons: Record<Tab, LucideIcon> = {
  Dashboard: LayoutDashboard,
  Budget: Wallet,
  Transactions: ArrowLeftRight,
  Analytics: BarChart3,
  Accounts: WalletCards,
  Settings: Settings2,
}

export default function Sidebar({
  tab,
  onNavigate,
  onAdd,
  onOpenCommandMenu,
  onLogout,
}: {
  tab: Tab
  onNavigate: (tab: Tab) => void
  onAdd: () => void
  onOpenCommandMenu: () => void
  onLogout: () => void
}) {
  const accounts = useLedger((state) => state.accounts)
  const events = useLedger((state) => state.events)
  const balances = useMemo(() => computeBalances(events), [events])
  const active = accounts.filter((account) => !account.archived)
  const total = active.reduce((sum, account) => sum + (balances.accounts[account.id] ?? 0), 0)

  return (
    <aside className="border-b border-line bg-surface text-ink md:sticky md:top-0 md:flex md:h-screen md:w-[17rem] md:shrink-0 md:flex-col md:border-b-0 md:border-r">
      <div className="flex items-center justify-between px-4 py-4 md:px-5 md:py-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-ink shadow-sm">
            <WalletCards className="size-5" strokeWidth={2.3} />
          </span>
          <div>
            <span className="block text-base font-semibold tracking-tight text-ink">Buckets</span>
            <span className="block text-[10px] font-medium tracking-[0.15em] text-muted uppercase">Money, with intention</span>
          </div>
        </div>
        <button className="rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-sunken hover:text-ink md:hidden" onClick={onLogout}>
          Log out
        </button>
      </div>

      <div className="space-y-2 px-3 pb-4 md:px-4">
        <button
          className="flex w-full items-center justify-between rounded-xl bg-accent px-3.5 py-3 text-sm font-semibold text-accent-ink shadow-sm transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          onClick={onAdd}
        >
          <span className="flex items-center gap-2"><Plus className="size-4" /> New transaction</span>
          <kbd className="rounded-md bg-accent-ink/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent-ink">N</kbd>
        </button>
        <button
          type="button"
          onClick={onOpenCommandMenu}
          className="flex w-full items-center justify-between rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-muted transition hover:border-accent/40 hover:bg-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label="Search pages and actions"
        >
          <span className="flex items-center gap-2"><Search className="size-4" /> Search pages and actions</span>
          <kbd className="rounded-md border border-line bg-sunken px-1.5 py-0.5 text-[10px] font-medium">Ctrl K</kbd>
        </button>
      </div>

      <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3 md:pb-0">
        {TABS.map((item) => {
          const Icon = tabIcons[item]
          const selected = tab === item
          return (
            <button
              key={item}
              onClick={() => onNavigate(item)}
              aria-current={selected ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium whitespace-nowrap transition md:w-full ${
                selected ? 'bg-accent text-accent-ink shadow-sm' : 'text-muted hover:bg-sunken/70 hover:text-ink'
              }`}
            >
              <Icon className={`size-4 ${selected ? 'text-accent-ink' : ''}`} strokeWidth={selected ? 2.3 : 1.8} />
              <span>{item}</span>
              {selected && <span className="ml-auto hidden size-1.5 rounded-full bg-accent-ink md:block" />}
            </button>
          )
        })}
      </nav>

      <div className="hidden min-h-0 flex-1 overflow-y-auto px-4 pt-8 md:block">
        <div className="mb-3 flex items-center justify-between px-1 text-[10px] font-semibold tracking-[0.15em] text-muted uppercase">
          <span>Accounts</span>
          <span>{active.length}</span>
        </div>
        <div className="rounded-xl border border-line bg-sunken/60 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-xs text-muted">Net balances</span>
            <span className="text-sm font-semibold tabular-nums text-ink">{formatCents(total)}</span>
          </div>
          {active.length === 0 && <p className="text-xs leading-5 text-muted">Your accounts will show up here.</p>}
          <ul className="space-y-1 border-t border-line pt-2">
            {active.map((account) => (
              <li key={account.id}>
                <button
                  onClick={() => onNavigate('Accounts')}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-xs text-muted transition hover:bg-sunken hover:text-ink"
                >
                  <span className="truncate">{account.name}</span>
                  <span className="shrink-0 tabular-nums text-ink">{formatCents(balances.accounts[account.id] ?? 0)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="hidden border-t border-line p-4 md:block">
        <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-sunken hover:text-ink" onClick={onLogout}>
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    </aside>
  )
}
