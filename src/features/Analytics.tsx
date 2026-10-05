import { useMemo, useState } from 'react'
import { addMonths, addWeeks, addYears, format } from 'date-fns'
import { ArrowLeft, ArrowRight, BarChart3, CircleDollarSign, ReceiptText, WalletCards } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { AreaLineGraph, BudgetGaugeGraph, SemiGaugeGraph, StackedBarGraph } from '../components/ui/charts'
import { MetricCard } from '../components/ui/metric-card'
import { Select } from '../components/ui/select'
import { SegmentedControl } from '../components/ui/segmented-control'
import { buildAnalytics } from '../domain/analytics'
import type { AnalyticsPeriod } from '../domain/analytics'
import { todayString } from '../domain/dates'
import { formatCents } from '../domain/money'
import { useLedger } from '../storage/store'
import SankeyChart from '../components/ui/sankey-chart'

const CHART_COLORS = ['#e6ff4b', '#00bdf9', '#03d791', '#f59e0b', '#a855f7', '#f43f5e', '#14b8a6', '#6366f1']
const STACK_COLORS = ['bg-[#e6ff4b]', 'bg-[#b0cc29]', 'bg-[#6d8218]', 'bg-[#42500d]', 'bg-[#00bdf9]']

export default function Analytics() {
  const { events, buckets, groups } = useLedger()
  const [period, setPeriod] = useState<AnalyticsPeriod>('month')
  const [selectedDate, setSelectedDate] = useState(todayString())
  const [budgetGroupId, setBudgetGroupId] = useState('all')
  const [budgetBucketId, setBudgetBucketId] = useState('all')
  const summary = useMemo(() => buildAnalytics(events, buckets, period, selectedDate), [events, buckets, period, selectedDate])
  const changePeriod = (direction: -1 | 1) => {
    const date = new Date(`${selectedDate}T12:00:00`)
    const next = period === 'week' ? addWeeks(date, direction) : period === 'year' ? addYears(date, direction) : addMonths(date, direction)
    setSelectedDate(format(next, 'yyyy-MM-dd'))
  }
  const topSpendRows = summary.spendingByBucket.slice(0, 4)
  const otherSpendRows = summary.spendingByBucket.slice(4)
  const otherSpendCents = otherSpendRows.reduce((total, row) => total + row.amount, 0)
  const stackCategories = [
    ...topSpendRows.map((row, index) => ({ key: row.id, label: row.name, color: STACK_COLORS[index] })),
    ...(otherSpendCents > 0 ? [{ key: 'other', label: 'Other', color: STACK_COLORS[4] }] : []),
  ]
  const categoryByBucketId = new Map<string, string>()
  for (const [index, row] of summary.spendingByBucket.entries()) {
    categoryByBucketId.set(row.id, index < 4 ? row.id : 'other')
  }
  const monthLabels = period === 'month'
    ? Array.from({ length: Math.ceil(new Date(Number(selectedDate.slice(0, 4)), Number(selectedDate.slice(5, 7)), 0).getDate() / 7) }, (_, index) => `Week ${index + 1}`)
    : summary.points.map((point) => point.label)
  const categorySpendByPeriod = new Map<string, Map<string, number>>()
  for (const event of summary.periodEvents) {
    if (event.type !== 'expense') continue
    const date = new Date(`${event.date}T12:00:00`)
    const label = period === 'month' ? `Week ${Math.ceil(date.getDate() / 7)}` : format(date, period === 'year' ? 'MMM' : 'EEE')
    const category = categoryByBucketId.get(event.bucketId ?? '')
    if (!category) continue
    const amounts = categorySpendByPeriod.get(label) ?? new Map<string, number>()
    amounts.set(category, (amounts.get(category) ?? 0) + event.amountCents)
    categorySpendByPeriod.set(label, amounts)
  }
  const spendingBars = monthLabels.map((label) => ({
    label,
    segments: stackCategories.flatMap((category) => {
      const cents = categorySpendByPeriod.get(label)?.get(category.key) ?? 0
      return cents > 0 ? [{ ...category, value: cents / 100 }] : []
    }),
  }))
  const spendingLegend = stackCategories.map(({ label, color }) => ({ label, color }))
  const pieRows = summary.spendingByBucket.slice(0, 4).map((row) => ({ name: row.name, amount: row.amount }))
  if (otherSpendCents > 0) pieRows.push({ name: 'Other', amount: otherSpendCents })
  const piePercentages = pieRows.map((row) => Math.floor(summary.spendingCents > 0 ? row.amount / summary.spendingCents * 100 : 0))
  const unassignedPiePercent = 100 - piePercentages.reduce((total, percentage) => total + percentage, 0)
  const spendingCategories = pieRows.map((row, index) => {
    const percentage = index === pieRows.length - 1
      ? Math.max(0, piePercentages[index] + unassignedPiePercent)
      : piePercentages[index]
    return {
      label: row.name,
      percentage,
      amount: formatCents(row.amount),
      color: CHART_COLORS[index % CHART_COLORS.length],
    }
  })
  const activeBuckets = buckets.filter((bucket) => !bucket.archived)
  const targetScale = period === 'year' ? 12 : period === 'week' ? 1 / 4.33 : 1
  const groupOptions = [
    { value: 'all', label: 'All groups' },
    ...groups.map((group) => ({ value: group.id, label: group.name })),
    { value: 'ungrouped', label: 'Ungrouped' },
  ]
  const bucketOptions = [
    { value: 'all', label: 'All buckets' },
    ...activeBuckets.map((bucket) => {
      const groupName = groups.find((group) => group.id === bucket.groupId)?.name
      return { value: bucket.id, label: groupName ? `${groupName} / ${bucket.name}` : bucket.name }
    }),
  ]
  const totalBudget = activeBuckets.reduce((total, bucket) => total + Math.round(bucket.monthlyTargetCents * targetScale), 0)
  const groupBucketIds = new Set(activeBuckets
    .filter((bucket) => budgetGroupId === 'all' || (budgetGroupId === 'ungrouped' ? !bucket.groupId : bucket.groupId === budgetGroupId))
    .map((bucket) => bucket.id))
  const groupBudget = budgetGroupId === 'all'
    ? totalBudget
    : activeBuckets.filter((bucket) => groupBucketIds.has(bucket.id)).reduce((total, bucket) => total + Math.round(bucket.monthlyTargetCents * targetScale), 0)
  const groupSpent = budgetGroupId === 'all'
    ? summary.spendingCents
    : summary.budget.filter((row) => groupBucketIds.has(row.id)).reduce((total, row) => total + row.amount, 0)
  const bucketBudget = budgetBucketId === 'all'
    ? totalBudget
    : Math.round((activeBuckets.find((bucket) => bucket.id === budgetBucketId)?.monthlyTargetCents ?? 0) * targetScale)
  const bucketSpent = budgetBucketId === 'all'
    ? summary.spendingCents
    : summary.budget.find((row) => row.id === budgetBucketId)?.amount ?? 0
  const selectedGroupLabel = groupOptions.find((option) => option.value === budgetGroupId)?.label ?? 'Selected group'
  const selectedBucketLabel = bucketOptions.find((option) => option.value === budgetBucketId)?.label ?? 'Selected bucket'

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

      <div className="grid items-stretch gap-4 xl:grid-cols-[2fr_1fr]">
        {spendingBars.some((row) => row.segments.length > 0) ? (
          <StackedBarGraph
            key={period}
            title="Spending by category"
            data={spendingBars}
            legend={spendingLegend}
            timeframeOptions={['Week', 'Month', 'Year']}
            defaultTimeframe={period[0].toUpperCase() + period.slice(1)}
            onTimeframeChange={(value) => setPeriod(value.toLowerCase() as AnalyticsPeriod)}
            className="h-full"
          />
        ) : (
          <Card className="p-4 sm:p-5"><h2 className="font-semibold">Spending by category</h2><EmptyChart>No spending recorded in this period.</EmptyChart></Card>
        )}
        {spendingCategories.length ? (
          <SemiGaugeGraph title="Spending by bucket" amount={formatCents(summary.spendingCents)} categories={spendingCategories} />
        ) : (
          <Card className="p-4 sm:p-5"><h2 className="font-semibold">Spending by bucket</h2><EmptyChart>No spending recorded in this period.</EmptyChart></Card>
        )}
      </div>

      <AreaLineGraph
        title="Spending trend"
        subtitle={`${summary.title} · ${period === 'year' ? 'Monthly' : 'Daily'} totals`}
        data={summary.points.map((point) => ({ label: point.label, value: point.spending / 100 }))}
        strokeColor="#e6ff4b"
        gradientStart="rgba(230, 255, 75, 0.28)"
        gradientStop="rgba(230, 255, 75, 0)"
      />

      <Card className="p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2"><WalletCards className="size-4 text-primary" /><div><h2 className="font-semibold">Budget vs. actual</h2><p className="text-xs text-muted-foreground">Spent, budget, and remaining for this {period}.</p></div></div>
          <span className="rounded-lg bg-sunken px-3 py-2 text-xs text-muted-foreground">Total budget <strong className="ml-1 text-foreground">{formatCents(totalBudget)}</strong></span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="min-w-0 space-y-2">
            <div className="flex h-[3.625rem] items-end pb-1 text-xs font-medium text-muted-foreground">Overall view</div>
            <BudgetGaugeGraph title="All spending" subtitle="Every recorded expense" budgetCents={totalBudget} spentCents={summary.spendingCents} />
          </div>
          <div className="min-w-0 space-y-2">
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">Group view
              <Select aria-label="Select budget group" value={budgetGroupId} onChange={(event) => setBudgetGroupId(event.target.value)} options={groupOptions} />
            </label>
            <BudgetGaugeGraph title={selectedGroupLabel} subtitle="Selected group" budgetCents={groupBudget} spentCents={groupSpent} />
          </div>
          <div className="min-w-0 space-y-2">
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">Bucket view
              <Select aria-label="Select budget bucket" value={budgetBucketId} onChange={(event) => setBudgetBucketId(event.target.value)} options={bucketOptions} />
            </label>
            <BudgetGaugeGraph title={selectedBucketLabel} subtitle="Selected bucket" budgetCents={bucketBudget} spentCents={bucketSpent} />
          </div>
        </div>
      </Card>

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
        <div className="mb-2 flex items-center gap-2"><BarChart3 className="size-4 text-primary" /><div><h2 className="font-semibold">Money flow</h2><p className="text-xs text-muted-foreground">Review the full plan, or choose a group to inspect its buckets and top payees.</p></div></div>
        <SankeyChart events={events} buckets={buckets} groups={groups} startDate={summary.startDate} endDate={summary.endDate} />
      </Card>
    </div>
  )
}

function EmptyChart({ children }: { children: string }) {
  return <div className="grid h-56 place-items-center rounded-xl bg-muted/15 px-5 text-center text-sm text-muted-foreground">{children}</div>
}
