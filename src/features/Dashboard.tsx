import { useMemo } from 'react'
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  CircleDollarSign,
  ReceiptText,
  SlidersHorizontal,
  WalletCards,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Money from '../components/Money'
import ProgressBar from '../components/ProgressBar'
import { Card } from '../components/ui/card'
import { Tile, TileBoard } from '../components/TileLayout'
import { List, type ListItemData } from '../components/ui/list'
import { MetricCard } from '../components/ui/metric-card'
import { Button } from '../components/ui/button'
import { computeBalances } from '../domain/balances'
import { computeMonthBudget } from '../domain/budget'
import { currentMonth, dateLabel, monthLabel } from '../domain/dates'
import { cashEffect, describeEvent, TYPE_LABELS } from '../domain/describe'
import { formatCents } from '../domain/money'
import { buildAnalytics } from '../domain/analytics'
import type { AddKind, Tab } from '../nav'
import type { EventType } from '../domain/types'
import { useLedger } from '../storage/store'

const sum = (record: Record<string, number>) => Object.values(record).reduce((total, value) => total + value, 0)

const eventIcons: Record<EventType, LucideIcon> = {
  income: ArrowDownLeft,
  expense: ReceiptText,
  allocation: CircleDollarSign,
  bucket_move: ArrowLeftRight,
  account_transfer: ArrowLeftRight,
  adjustment: SlidersHorizontal,
}

const eventIconVariants: Record<EventType, string> = {
  income: 'bg-good/10 text-good',
  expense: 'bg-expense-soft text-expense',
  allocation: 'bg-accent-soft text-accent',
  bucket_move: 'bg-sunken text-muted',
  account_transfer: 'bg-sunken text-muted',
  adjustment: 'bg-sunken text-muted',
}

export default function Dashboard({ onAdd, onNavigate }: {
  onAdd: (kind: AddKind) => void
  onNavigate: (tab: Tab) => void
}) {
  const { events, accounts, buckets } = useLedger()
  const month = currentMonth()

  const balances = useMemo(() => computeBalances(events), [events])
  const monthly = useMemo(
    () => computeMonthBudget(events, buckets.map((bucket) => bucket.id), month),
    [events, buckets, month],
  )
  const monthlyAnalytics = useMemo(
    () => buildAnalytics(events, buckets, 'month', `${month}-01`),
    [events, buckets, month],
  )

  const accountName = (id: string | null) => accounts.find((account) => account.id === id)?.name ?? '—'
  const bucketName = (id: string | null) => buckets.find((bucket) => bucket.id === id)?.name ?? '—'
  const recent = [...events].reverse().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)
  const recentItems: ListItemData[] = recent.map((event) => {
    const effect = cashEffect(event)
    return {
      id: event.id,
      title: event.description || TYPE_LABELS[event.type],
      subtitle: describeEvent(event, accountName, bucketName),
      date: dateLabel(event.date),
      amount: formatCents(effect ?? event.amountCents),
      isPositive: effect !== null && effect > 0,
      type: event.type === 'income' || event.type === 'expense' ? event.type : 'other',
      icon: eventIcons[event.type],
      iconVariant: eventIconVariants[event.type],
    }
  })

  const overspent = monthly.buckets.filter((row) => row.availableCents < 0)
  const target = buckets
    .filter((bucket) => !bucket.archived)
    .reduce((total, bucket) => total + bucket.monthlyTargetCents, 0)
  const targetProgress = target > 0 ? Math.max(0, Math.min(100, Math.round((monthly.allocatedCents / target) * 100))) : 0
  const cashflowScale = Math.max(monthly.incomeCents, monthly.spentCents, 1)
  const activeAccountTotal = accounts
    .filter((account) => !account.archived)
    .reduce((total, account) => total + (balances.accounts[account.id] ?? 0), 0)

  return (
    <TileBoard page="dashboard" className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
      <Tile id="hero" label="Money overview" className="col-span-full">
      <section className="hero-panel relative overflow-hidden rounded-[1.75rem] p-6 text-foreground shadow-lg md:p-8">
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/70 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur">
              <span className="size-1.5 rounded-full bg-emerald-300" />
              {monthLabel(month)} overview
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">A clear plan for your money.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
              {balances.unallocated >= 0 ? (
                <>You have <strong className="font-semibold text-foreground">{formatCents(balances.unallocated)}</strong> ready to assign. Give it a bucket, cover a goal, or keep it flexible.</>
              ) : (
                <>Your buckets are ahead of your accounts by <strong className="font-semibold text-foreground">{formatCents(-balances.unallocated)}</strong>. Review the budget to bring them back in line.</>
              )}
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Button variant="primary" className="border-transparent bg-accent text-accent-ink shadow-sm hover:opacity-90" onClick={() => onAdd('expense')}>
                <ReceiptText className="size-4" /> Add expense
              </Button>
              <Button className="border-border/70 bg-surface/70 text-foreground hover:bg-sunken" onClick={() => onNavigate('Budget')}>
                Open budget <ArrowUpRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-surface/70 p-4 backdrop-blur-sm sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">This month so far</p>
                <p className="mt-1 text-lg font-semibold">Cash flow</p>
              </div>
              <span className="grid size-9 place-items-center rounded-xl bg-sunken text-muted-foreground">
                <ArrowLeftRight className="size-4" />
              </span>
            </div>
            <div className="mt-5 space-y-3">
              <CashflowBar label="Income" cents={monthly.incomeCents} scale={cashflowScale} color="var(--color-chart-1)" />
              <CashflowBar label="Spent" cents={monthly.spentCents} scale={cashflowScale} color="var(--color-chart-3)" />
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-4 text-xs">
              <span className="text-muted-foreground">Net this month</span>
              <strong className="text-sm font-semibold text-foreground">{formatCents(monthly.incomeCents - monthly.spentCents)}</strong>
            </div>
          </div>
        </div>
        <div className="hero-orb" aria-hidden />
      </section>
      </Tile>

      <Tile id="account-total" label="Money in accounts">
        <MetricCard type="compact" priority="medium" title="In your accounts" amount={formatCents(activeAccountTotal)} />
      </Tile>
      <Tile id="bucket-total" label="Money in buckets">
        <MetricCard type="compact" priority="medium" title="In your buckets" amount={formatCents(sum(balances.buckets))} />
      </Tile>
      <Tile id="ready-to-assign" label="Ready to assign">
        <MetricCard type="compact" priority={balances.unallocated === 0 ? 'medium' : 'high'} title={balances.unallocated >= 0 ? 'Ready to assign' : 'Buckets ahead of cash'} amount={formatCents(balances.unallocated)} />
      </Tile>
      <Tile id="monthly-target" label="Monthly target">
        <MetricCard type="compact" priority="low" title={target ? `Monthly target · ${targetProgress}% funded` : 'Monthly target'} amount={formatCents(target)} />
      </Tile>

      <Tile id="monthly-snapshot" label="Monthly snapshot" className="col-span-full xl:col-span-2">
        <Card className="p-5 md:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.13em] text-muted uppercase">Monthly snapshot</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">{monthLabel(month)}</h2>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0" onClick={() => onNavigate('Budget')}>
              View budget <ArrowUpRight className="size-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-sunken/70 p-4 sm:grid-cols-4">
            <MiniStat label="Income" cents={monthly.incomeCents} />
            <MiniStat label="Assigned" cents={monthly.allocatedCents} />
            <MiniStat label="Spent" cents={monthly.spentCents} />
            <MiniStat label="Saved" cents={monthlyAnalytics.savingsCents} />
          </div>
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="text-muted">Monthly target progress</span>
              <span className="font-semibold">{target > 0 ? `${targetProgress}%` : 'No targets yet'}</span>
            </div>
            <ProgressBar pct={targetProgress} />
            {target > 0 && <p className="mt-2 text-xs text-muted">{formatCents(monthly.allocatedCents)} assigned toward {formatCents(target)}</p>}
          </div>
        </Card>
      </Tile>

      <Tile id="quick-actions" label="Quick actions" className="col-span-full xl:col-span-2">
        <Card className="p-5 md:p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent"><WalletCards className="size-4" /></span>
            <div>
              <h2 className="font-semibold tracking-tight">Quick actions</h2>
              <p className="text-xs text-muted">Common things, one click away</p>
            </div>
          </div>
          <div className="grid gap-2">
            <ActionButton label="Add income" hint="Record money coming in" icon={ArrowDownLeft} onClick={() => onAdd('income')} />
            <ActionButton label="Move money" hint="Rebalance your buckets" icon={ArrowLeftRight} onClick={() => onAdd('move')} />
            <ActionButton label="Manage accounts" hint="Review balances and accounts" icon={WalletCards} onClick={() => onNavigate('Accounts')} />
            <ActionButton label="Analytics and money flow" hint="See weekly, monthly, and yearly patterns" icon={BarChart3} onClick={() => onNavigate('Analytics')} />
          </div>
        </Card>
      </Tile>

      {overspent.length > 0 && (
        <Tile id="needs-attention" label="Overdrawn buckets" className="col-span-full">
        <Card className="border-bad/35 bg-bad-soft/45 p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-bad uppercase">Needs attention</p>
              <h2 className="mt-1 font-semibold">A few buckets are overdrawn</h2>
            </div>
            <Button variant="ghost" size="sm" className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-bad" onClick={() => onNavigate('Budget')}>Review budget <ArrowUpRight className="size-3.5" /></Button>
          </div>
          <ul className="divide-y divide-bad/10">
            {overspent.map((row) => (
              <li key={row.bucketId} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>{bucketName(row.bucketId)}</span>
                <Money cents={row.availableCents} />
              </li>
            ))}
          </ul>
        </Card>
        </Tile>
      )}

      <Tile id="recent-activity" label="Recent activity" className="col-span-full">
      {recentItems.length > 0 ? (
        <List
          title="Recent activity"
          subtitle={`${events.length} ${events.length === 1 ? 'transaction' : 'transactions'} recorded`}
          actionLabel="All transactions"
          onActionClick={() => onNavigate('Transactions')}
          items={recentItems}
          heightClass="h-[360px]"
          filterTabs={[
            { id: 'all', label: 'All activity' },
            { id: 'income', label: 'Income' },
            { id: 'expense', label: 'Expenses' },
          ]}
        />
      ) : (
        <Card className="flex flex-col items-center px-5 py-10 text-center">
          <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent"><ReceiptText className="size-5" /></span>
          <h2 className="mt-3 font-semibold">Your activity will appear here</h2>
          <p className="mt-1 text-sm text-muted">Record an expense or income to see your money move.</p>
        </Card>
      )}
      </Tile>
    </TileBoard>
  )
}

function CashflowBar({ label, cents, scale, color }: { label: string; cents: number; scale: number; color: string }) {
  const width = cents > 0 ? Math.max(4, (cents / scale) * 100) : 0
  return (
    <div className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-sunken">
        <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
      <span className="min-w-20 text-right font-semibold tabular-nums">{formatCents(cents)}</span>
    </div>
  )
}

function MiniStat({ label, cents }: { label: string; cents: number }) {
  return <div className="min-w-0"><div className="truncate text-xs text-muted">{label}</div><div className="mt-1 truncate text-base font-semibold tabular-nums sm:text-lg"><Money cents={cents} /></div></div>
}

function ActionButton({ label, hint, icon: Icon, onClick }: { label: string; hint: string; icon: LucideIcon; onClick: () => void }) {
  return (
    <Button onClick={onClick} className="group flex h-auto w-full items-center justify-between rounded-xl border border-line p-3 text-left transition hover:border-accent/40 hover:bg-accent-soft/70">
      <span className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sunken text-muted transition group-hover:bg-surface group-hover:text-accent"><Icon className="size-4" /></span>
        <span><span className="block text-sm font-medium">{label}</span><span className="text-xs text-muted">{hint}</span></span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-muted transition group-hover:text-accent" aria-hidden />
    </Button>
  )
}
