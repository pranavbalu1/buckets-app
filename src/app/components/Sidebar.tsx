import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftRight,
  BarChart3,
  Settings2,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Move,
  Plus,
  Search,
  Wallet,
  WalletCards,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { computeBalances } from '../../domain/balances'
import { formatCents } from '../../domain/money'
import { Card } from '../../components'
import { TABS } from '../../nav'
import type { Tab } from '../../nav'
import { useLedger } from '../../storage/store'
import BrandMark from './BrandMark'
import profileAvatar from '../../assets/demo-profile-avatar.jpg'

function ProfileCard({ name, email }: { name: string; email: string }) {
  return (
    <Card className="flex min-w-0 items-center gap-3 border-line p-2.5 shadow-none">
      <img src={profileAvatar} alt="Demo cat profile" className="size-11 shrink-0 rounded-full object-cover ring-2 ring-accent/25" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">Profile</p>
        <p className="truncate text-sm font-semibold text-ink" title={name}>{name}</p>
        <p className="truncate text-xs text-muted" title={email}>{email}</p>
      </div>
    </Card>
  )
}

function MobileProfile({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <img src={profileAvatar} alt="Demo cat profile" className="size-9 shrink-0 rounded-full object-cover ring-2 ring-accent/25" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-5 text-ink" title={name}>{name}</p>
        <p className="truncate text-[11px] leading-4 text-muted" title={email}>{email}</p>
      </div>
    </div>
  )
}

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
  moveMode,
  onToggleMoveMode,
  onOpenCommandMenu,
  onLogout,
  userName,
  userEmail,
}: {
  tab: Tab
  onNavigate: (tab: Tab) => void
  onAdd: () => void
  moveMode: boolean
  onToggleMoveMode: () => void
  onOpenCommandMenu: () => void
  onLogout: () => void
  userName: string
  userEmail: string
}) {
  const accounts = useLedger((state) => state.accounts)
  const events = useLedger((state) => state.events)
  const balances = useMemo(() => computeBalances(events), [events])
  const active = accounts.filter((account) => !account.archived)
  const total = active.reduce((sum, account) => sum + (balances.accounts[account.id] ?? 0), 0)
  const [moreOpen, setMoreOpen] = useState(false)
  const mobileTabs: Tab[] = ['Dashboard', 'Budget', 'Transactions', 'Analytics']
  const moreTabs: Tab[] = ['Accounts', 'Settings']

  useEffect(() => {
    if (!moreOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [moreOpen])

  function navigate(tab: Tab) {
    setMoreOpen(false)
    onNavigate(tab)
  }

  return (
    <>
    <aside className="border-b border-line bg-surface text-ink md:sticky md:top-0 md:flex md:h-screen md:w-[17rem] md:shrink-0 md:flex-col md:border-b-0 md:border-r">
      <div className="flex items-center justify-between px-3 py-3 md:px-5 md:py-5">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-ink shadow-sm md:size-10">
            <BrandMark className="size-5 md:size-6" />
          </span>
          <div>
            <span className="block text-base font-semibold tracking-tight text-ink">Buckets</span>
            <span className="hidden text-[10px] font-medium tracking-[0.15em] text-muted uppercase md:block">Money, with intention</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-line px-3 pb-3 md:hidden">
        <MobileProfile name={userName} email={userEmail} />
        <button type="button" className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3 text-xs font-semibold text-accent-ink shadow-sm transition hover:opacity-90" onClick={onAdd} aria-label="Add transaction">
          <Plus className="size-4" /> Add
        </button>
      </div>

      <div className="hidden space-y-2 px-3 pb-3 md:block md:px-4 md:pb-4">
        <button
          className="flex w-full items-center justify-between rounded-xl bg-accent px-3.5 py-3 text-sm font-semibold text-accent-ink shadow-sm transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          onClick={onAdd}
        >
          <span className="flex items-center gap-2"><Plus className="size-4" /> New transaction</span>
          <kbd className="hidden rounded-md bg-accent-ink/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent-ink md:inline">N</kbd>
        </button>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
          <button
            type="button"
            onClick={onOpenCommandMenu}
            className="flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-2.5 py-2.5 text-sm text-muted transition hover:border-accent/40 hover:bg-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:justify-between md:px-3.5"
            aria-label="Search pages and actions"
          >
            <span className="flex min-w-0 items-center gap-2"><Search className="size-4 shrink-0" /><span className="truncate md:hidden">Search</span><span className="hidden truncate md:inline">Search pages and actions</span></span>
            <kbd className="hidden rounded-md border border-line bg-sunken px-1.5 py-0.5 text-[10px] font-medium lg:inline">Ctrl K</kbd>
          </button>
          <button
            type="button"
            onClick={onToggleMoveMode}
            aria-pressed={moveMode}
            className={`flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border px-2.5 py-2.5 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:justify-between md:px-3.5 ${moveMode ? 'border-accent/40 bg-accent text-accent-ink' : 'border-line bg-surface text-muted hover:bg-sunken hover:text-ink'}`}
          >
            <span className="flex min-w-0 items-center gap-2"><Move className="size-4 shrink-0" /><span className="truncate md:hidden">{moveMode ? 'Done' : 'Move tiles'}</span><span className="hidden truncate md:inline">{moveMode ? 'Finish moving tiles' : 'Move tiles'}</span></span>
            {moveMode && <span className="size-1.5 shrink-0 rounded-full bg-accent-ink" aria-hidden />}
          </button>
        </div>
      </div>

      <nav aria-label="Main" className="hidden gap-1 px-3 pb-3 md:flex md:flex-col md:overflow-x-visible md:px-3 md:pb-0">
        {TABS.map((item) => {
          const Icon = tabIcons[item]
          const selected = tab === item
          return (
            <button
              key={item}
              onClick={() => navigate(item)}
              aria-current={selected ? 'page' : undefined}
              className={`flex min-h-11 shrink-0 touch-manipulation items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium whitespace-nowrap transition md:w-full ${
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
        <ProfileCard name={userName} email={userEmail} />
        <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-sunken hover:text-ink" onClick={onLogout}>
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    </aside>
      {moreOpen && <button type="button" tabIndex={-1} aria-label="Close more pages menu" className="fixed inset-0 z-40 bg-black/15 md:hidden" onClick={() => setMoreOpen(false)} />}
      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] text-ink shadow-[0_-8px_24px_rgba(0,0,0,0.18)] backdrop-blur-xl md:hidden">
        <div className="mx-auto grid min-h-14 max-w-xl grid-cols-5">
          {mobileTabs.map((item) => {
            const Icon = tabIcons[item]
            const selected = tab === item
            const label = item === 'Dashboard' ? 'Home' : item === 'Transactions' ? 'Activity' : item
            return <button key={item} type="button" onClick={() => navigate(item)} aria-current={selected ? 'page' : undefined} className={`flex min-h-14 touch-manipulation flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors ${selected ? 'text-accent' : 'text-muted hover:text-ink'}`}>
              <Icon className="size-5" strokeWidth={selected ? 2.4 : 1.8} />
              <span className="max-w-full truncate">{label}</span>
            </button>
          })}
          <button type="button" onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen} aria-controls={moreOpen ? 'mobile-more-menu' : undefined} aria-label="More pages" className={`flex min-h-14 touch-manipulation flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors ${moreOpen || moreTabs.includes(tab) ? 'text-accent' : 'text-muted hover:text-ink'}`}>
            <MoreHorizontal className="size-5" />
            <span>More</span>
          </button>
        </div>
        {moreOpen && <div id="mobile-more-menu" role="group" aria-label="More pages and actions" className="absolute inset-x-3 bottom-[calc(100%+0.5rem)] rounded-2xl border border-line bg-surface p-2 shadow-xl">
          {moreTabs.map((item) => {
            const Icon = tabIcons[item]
            return <button key={item} type="button" onClick={() => navigate(item)} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-ink hover:bg-sunken" aria-current={tab === item ? 'page' : undefined}>
              <Icon className="size-4 text-muted" /> {item}
            </button>
          })}
          <div className="my-1 border-t border-line" />
          <button type="button" onClick={() => { setMoreOpen(false); onOpenCommandMenu() }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-ink hover:bg-sunken">
            <Search className="size-4 text-muted" /> Search pages and actions
          </button>
          <button type="button" onClick={() => { setMoreOpen(false); onToggleMoveMode() }} aria-pressed={moveMode} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-ink hover:bg-sunken">
            <Move className="size-4 text-muted" /> {moveMode ? 'Finish moving tiles' : 'Move tiles'}
          </button>
          <button type="button" onClick={() => { setMoreOpen(false); onLogout() }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-ink hover:bg-sunken">
            <LogOut className="size-4 text-muted" /> Sign out
          </button>
        </div>}
      </nav>
    </>
  )
}
