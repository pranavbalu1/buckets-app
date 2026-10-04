import { useMemo, useState } from 'react'
import { addMonths, addWeeks, addYears, format } from 'date-fns'
import { ArrowLeft, ArrowRight, BarChart3, CircleDollarSign, ReceiptText, WalletCards } from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { MetricCard } from '../components/ui/metric-card'
import { SegmentedControl } from '../components/ui/segmented-control'
import { buildAnalytics } from '../domain/analytics'
import type { AnalyticsPeriod } from '../domain/analytics'
import { todayString } from '../domain/dates'
import { formatCents } from '../domain/money'
import { useLedger } from '../storage/store'
import MoneyFlowSankey from './MoneyFlowSankey'

const CHART_COLORS = ['#e6ff4b', '#00bdf9', '#03d791', '#f59e0b', '#a855f7', '#f43f5e', '#14b8a6', '#6366f1']

export default function Analytics() {
  const { events, buckets, groups } = useLedger()
  const [period, setPeriod] = useState<AnalyticsPeriod>('month')
  const [selectedDate, setSelectedDate] = useState(todayString())
  const summary = useMemo(() => buildAnalytics(events, buckets, period, selectedDate), [events, buckets, period, selectedDate])
  const changePeriod = (direction: -1 | 1) => {
    const date = new Date(`${selectedDate}T12:00:00`)
    const next = period === 'week' ? addWeeks(date, direction) : period === 'year' ? addYears(date, direction) : addMonths(date, direction)
    setSelectedDate(format(next, 'yyyy-MM-dd'))
  }
  const budgetRows = summary.budget.slice(0, 8).map((row) => ({ name: row.name, Planned: (row.planned ?? 0) / 100, Spent: row.amount / 100 }))
  const pieRows = summary.spendingByBucket.slice(0, 7).map((row) => ({ name: row.name, value: row.amount / 100 }))
  const moneyTooltip = (value: unknown) => formatCents(Number(value ?? 0) * 100)

  return (
    <div className="space-y-5 md:space-y-6">
      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><BarChart3 className="size-5" /></span>
          <div>
            <h2 className="font-semibold">{summary.title}</h2>
            <p className="text-xs text-muted-foreground">Income, spending, savings, and budget progress</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="icon" aria-label="Previous period" onClick={() => changePeriod(-1)}><ArrowLeft className="size-4" /></Button>
          <input aria-label="Choose analytics date" className="input h-9 w-40" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          <Button size="icon" aria-label="Next period" onClick={() => changePeriod(1)}><ArrowRight className="size-4" /></Button>
        </div>
      </Card>

      <SegmentedControl
        value={period}
        onChange={(value) => setPeriod(value as AnalyticsPeriod)}
        options={[{ id: 'week', label: 'Week' }, { id: 'month', label: 'Month' }, { id: 'year', label: 'Year' }]}
        className="sm:max-w-md"
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Period totals">
        <MetricCard type="compact" priority="medium" title="Income" amount={formatCents(summary.incomeCents)} subtitle="Received in period" />
        <MetricCard type="compact" priority="medium" title="Spending" amount={formatCents(summary.spendingCents)} subtitle="Recorded expenses" />
        <MetricCard type="compact" priority="high" title="Savings contributions" amount={formatCents(summary.savingsCents)} subtitle={`${summary.savingsRate.toFixed(1)}% rate · ${formatCents(summary.savingsGrowthCents)} growth`} />
        <MetricCard type="compact" priority="low" title="Net activity" amount={formatCents(summary.netActivityCents)} subtitle="Income minus spending" />
        <MetricCard type="compact" priority="low" title="Average expense" amount={formatCents(summary.averageExpenseCents)} subtitle={`${summary.largestExpenses.length ? 'Largest expense' : 'No expenses'}${summary.largestExpenses[0] ? ` · ${formatCents(summary.largestExpenses[0].amountCents)}` : ''}`} />
      </section>

      <Card className="p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2"><BarChart3 className="size-4 text-primary" /><div><h2 className="font-semibold">Activity over time</h2><p className="text-xs text-muted-foreground">Daily within a week or month; monthly within a year.</p></div></div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={summary.points} margin={{ top: 8, right: 10, bottom: 0, left: 4 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="var(--color-muted)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis stroke="var(--color-muted)" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} tickFormatter={(value) => `$${value / 100}`} />
              <Tooltip formatter={(_, name, item) => [formatCents(Number(item?.value ?? 0)), String(name)]} contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12 }} />
              <Legend />
              <Line type="monotone" dataKey="income" name="Income" stroke="#00bdf9" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="spending" name="Spending" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="savings" name="Savings contributions" stroke="#e6ff4b" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2"><WalletCards className="size-4 text-primary" /><div><h2 className="font-semibold">Budget vs. actual</h2><p className="text-xs text-muted-foreground">Monthly targets are scaled for the selected period.</p></div></div>
          {budgetRows.length ? <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetRows} layout="vertical" margin={{ top: 2, right: 12, bottom: 4, left: 10 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke="var(--color-muted)" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} tickFormatter={(value) => `$${value}`} />
                <YAxis type="category" dataKey="name" width={100} stroke="var(--color-muted)" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                <Tooltip formatter={moneyTooltip} contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12 }} />
                <Legend />
                <Bar dataKey="Planned" fill="#00bdf9" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Spent" fill="#e6ff4b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div> : <EmptyChart>No budget targets or spending in this period.</EmptyChart>}
          {budgetRows.length > 0 && <ul className="mt-3 divide-y divide-border/60 border-t border-border/60">
            {summary.budget.slice(0, 5).map((row) => {
              const remaining = (row.planned ?? 0) - row.amount
              return <li key={row.id} className="flex items-center justify-between gap-3 py-2 text-xs"><span className="truncate">{row.name}</span><span className={remaining < 0 ? 'shrink-0 font-medium text-destructive' : 'shrink-0 text-muted-foreground'}>{remaining < 0 ? `Over by ${formatCents(-remaining)}` : `${formatCents(remaining)} remaining`}</span></li>
            })}
          </ul>}
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="mb-2 flex items-center gap-2"><CircleDollarSign className="size-4 text-primary" /><div><h2 className="font-semibold">Spending by bucket</h2><p className="text-xs text-muted-foreground">Recorded expenses grouped by their envelope.</p></div></div>
          {pieRows.length ? <div className="grid min-h-64 items-center gap-2 sm:grid-cols-[1fr_1fr]">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%"><PieChart>
                <Pie data={pieRows} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                  {pieRows.map((row, index) => <Cell key={row.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={moneyTooltip} contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12 }} />
              </PieChart></ResponsiveContainer>
            </div>
            <ul className="space-y-2 text-sm">
              {summary.spendingByBucket.slice(0, 7).map((row, index) => <li key={row.id} className="flex items-center justify-between gap-3"><span className="flex min-w-0 items-center gap-2"><i className="size-2.5 shrink-0 rounded-full" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} /><span className="truncate">{row.name}</span></span><strong className="shrink-0 tabular-nums">{formatCents(row.amount)}</strong></li>)}
            </ul>
          </div> : <EmptyChart>No spending recorded in this period.</EmptyChart>}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2"><ReceiptText className="size-4 text-primary" /><div><h2 className="font-semibold">Largest expenses</h2><p className="text-xs text-muted-foreground">Highest individual entries in this period.</p></div></div>
          {summary.largestExpenses.length ? <ul className="divide-y divide-border/70">
            {summary.largestExpenses.map((event) => <li key={event.id} className="flex items-center justify-between gap-3 py-3"><span className="min-w-0"><strong className="block truncate text-sm">{event.payee || event.description || event.bucketName}</strong><span className="text-xs text-muted-foreground">{event.bucketName} · {event.date}</span></span><strong className="shrink-0 tabular-nums">{formatCents(event.amountCents)}</strong></li>)}
          </ul> : <EmptyChart>No expenses in this period.</EmptyChart>}
        </Card>
        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2"><CircleDollarSign className="size-4 text-primary" /><div><h2 className="font-semibold">Income by source</h2><p className="text-xs text-muted-foreground">Source comes from the payee or description.</p></div></div>
          {summary.incomeBySource.length ? <ul className="divide-y divide-border/70">
            {summary.incomeBySource.slice(0, 8).map((row, index) => <li key={row.id} className="flex items-center justify-between gap-3 py-3"><span className="flex min-w-0 items-center gap-2"><i className="size-2.5 rounded-full" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} /><span className="truncate text-sm">{row.name}</span></span><strong className="shrink-0 tabular-nums">{formatCents(row.amount)}</strong></li>)}
          </ul> : <EmptyChart>No income recorded in this period.</EmptyChart>}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <div className="mb-4"><h2 className="font-semibold">Bucket activity</h2><p className="mt-1 text-xs text-muted-foreground">Assignments, expenses, and internal bucket moves.</p></div>
          {summary.bucketActivity.length ? <div className="overflow-x-auto"><table className="w-full min-w-[30rem] text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="py-2 pr-2 font-medium">Bucket</th><th className="py-2 px-2 text-right font-medium">Assigned</th><th className="py-2 px-2 text-right font-medium">Spent</th><th className="py-2 px-2 text-right font-medium">Moved in</th><th className="py-2 pl-2 text-right font-medium">Moved out</th></tr></thead>
            <tbody>{summary.bucketActivity.slice(0, 10).map((row) => <tr key={row.id} className="border-b border-border/50"><td className="max-w-40 truncate py-2.5 pr-2">{row.name}</td><td className="px-2 text-right tabular-nums">{formatCents(row.allocated)}</td><td className="px-2 text-right tabular-nums">{formatCents(row.spent)}</td><td className="px-2 text-right tabular-nums">{formatCents(row.movedIn)}</td><td className="pl-2 text-right tabular-nums">{formatCents(row.movedOut)}</td></tr>)}</tbody>
          </table></div> : <EmptyChart>No bucket activity in this period.</EmptyChart>}
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="mb-4"><h2 className="font-semibold">Period transactions</h2><p className="mt-1 text-xs text-muted-foreground">Income, expenses, moves, assignments, and adjustments.</p></div>
          {summary.periodEvents.length ? <ul className="divide-y divide-border/70">
            {summary.periodEvents.slice(0, 10).map((event) => <li key={event.id} className="flex items-center justify-between gap-3 py-2.5"><span className="min-w-0"><strong className="block truncate text-sm">{event.description || event.type.replace('_', ' ')}</strong><span className="text-xs text-muted-foreground">{event.date} · {event.type.replace('_', ' ')}</span></span><strong className="shrink-0 tabular-nums">{formatCents(event.amountCents)}</strong></li>)}
          </ul> : <EmptyChart>No transactions in this period.</EmptyChart>}
        </Card>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="mb-2 flex items-center gap-2"><BarChart3 className="size-4 text-primary" /><div><h2 className="font-semibold">Money flow</h2><p className="text-xs text-muted-foreground">Income → available money → groups → buckets → spending and unspent balances.</p></div></div>
        <MoneyFlowSankey events={events} buckets={buckets} groups={groups} startDate={summary.startDate} endDate={summary.endDate} />
      </Card>
    </div>
  )
}

function EmptyChart({ children }: { children: string }) {
  return <div className="grid h-56 place-items-center rounded-xl bg-muted/15 px-5 text-center text-sm text-muted-foreground">{children}</div>
}
