import { useMemo, useState } from 'react'
import { addMonths, addWeeks, addYears, format } from 'date-fns'
import { ArrowLeft, ArrowRight, BarChart3, CircleDollarSign, ReceiptText, WalletCards } from 'lucide-react'
import { AreaLineGraph, BudgetGaugeGraph, Button, Card, MetricCard, Select, SegmentedControl, SemiGaugeGraph, StackedBarGraph, Tile, TileBoard } from '../components'
import { buildAnalytics } from '../domain/analytics'
import type { AnalyticsPeriod } from '../domain/analytics'
import { todayString } from '../domain/dates'
import { formatCents } from '../domain/money'
import { isExpenseBucket } from '../domain/models'
import { dateSchema, firstIssueMessage } from '../domain/validate'
import { useLedger } from '../storage/store'
import SankeyChart from './analytics/MoneyFlowSankey'

const CHART_COLORS = [
  'var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)',
  'var(--color-chart-5)', 'var(--color-chart-6)', 'var(--color-chart-7)', 'var(--color-chart-8)',
]
const STACK_COLORS = [
  'var(--color-chart-1)', 'color-mix(in srgb, var(--color-chart-1) 75%, var(--color-surface))',
  'color-mix(in srgb, var(--color-chart-1) 50%, var(--color-surface))',
  'color-mix(in srgb, var(--color-chart-1) 30%, var(--color-surface))', 'var(--color-chart-2)',
]

export default function Analytics() {
  const { events, buckets, groups } = useLedger()
  const [period, setPeriod] = useState<AnalyticsPeriod>('month')
  const [selectedDate, setSelectedDate] = useState(todayString())
  const [dateError, setDateError] = useState('')
  const [budgetGroupId, setBudgetGroupId] = useState('all')
  const [budgetBucketId, setBudgetBucketId] = useState('all')
  const [spendingView, setSpendingView] = useState<'actual' | 'variance'>('actual')
  const summary = useMemo(() => buildAnalytics(events, buckets, period, selectedDate), [events, buckets, period, selectedDate])
  const trendData = buildCumulativeTrend(summary.points)
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
  const expenseBuckets = buckets.filter((bucket) => !bucket.archived && isExpenseBucket(bucket))
  const groupOptions = [
    { value: 'all', label: 'All groups' },
    ...groups.map((group) => ({ value: group.id, label: group.name })),
    { value: 'ungrouped', label: 'Ungrouped' },
  ]
  const bucketOptions = [
    { value: 'all', label: 'All buckets' },
    ...expenseBuckets.map((bucket) => {
      const groupName = groups.find((group) => group.id === bucket.groupId)?.name
      return { value: bucket.id, label: groupName ? `${groupName} / ${bucket.name}` : bucket.name }
    }),
  ]
  const totalBudget = summary.plannedCents
  const groupBucketIds = new Set(expenseBuckets
    .filter((bucket) => budgetGroupId === 'all' || (budgetGroupId === 'ungrouped' ? !bucket.groupId : bucket.groupId === budgetGroupId))
    .map((bucket) => bucket.id))
  const groupBudget = budgetGroupId === 'all'
    ? totalBudget
    : summary.budget.filter((row) => groupBucketIds.has(row.id)).reduce((total, row) => total + row.planned, 0)
  const groupSpent = budgetGroupId === 'all'
    ? summary.spendingCents
    : summary.budget.filter((row) => groupBucketIds.has(row.id)).reduce((total, row) => total + row.spent, 0)
  const bucketBudget = budgetBucketId === 'all'
    ? totalBudget
    : summary.budget.find((row) => row.id === budgetBucketId)?.planned ?? 0
  const bucketSpent = budgetBucketId === 'all'
    ? summary.spendingCents
    : summary.budget.find((row) => row.id === budgetBucketId)?.spent ?? 0
  const selectedGroupLabel = groupOptions.find((option) => option.value === budgetGroupId)?.label ?? 'Selected group'
  const selectedBucketLabel = bucketOptions.find((option) => option.value === budgetBucketId)?.label ?? 'Selected bucket'

  return (
    <TileBoard page="analytics-layout-v2" className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-6 xl:gap-5">
      <Tile id="period-controls" label="Analytics period" className="col-span-full">
      <Card className="flex min-w-0 flex-col gap-4 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><BarChart3 className="size-5" /></span>
          <div className="min-w-0">
            <h2 className="font-semibold">{summary.title}</h2>
            <p className="text-xs text-muted-foreground">Income, spending, savings, and budget progress</p>
          </div>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button size="icon" aria-label="Previous period" onClick={() => changePeriod(-1)}><ArrowLeft className="size-4" /></Button>
          <label className="min-w-0 flex-1 space-y-1 sm:flex-none">
            <span className="sr-only">Choose analytics date</span>
            <input aria-label="Choose analytics date" aria-invalid={Boolean(dateError)} className="input h-9 w-full sm:w-40" type="date" value={selectedDate} onChange={(event) => {
              const result = dateSchema.safeParse(event.target.value)
              if (result.success) { setSelectedDate(result.data); setDateError('') }
              else setDateError(firstIssueMessage(result.error, 'Choose a valid date.'))
            }} />
            {dateError && <span className="block max-w-40 text-xs text-bad" role="alert">{dateError}</span>}
          </label>
          <Button size="icon" aria-label="Next period" onClick={() => changePeriod(1)}><ArrowRight className="size-4" /></Button>
        </div>
      </Card>
      </Tile>

      <Tile id="period-selector" label="Choose analytics period" className="col-span-full">
      <SegmentedControl
        value={period}
        onChange={(value) => {
          if (value === 'week' || value === 'month' || value === 'year') setPeriod(value)
        }}
        options={[{ id: 'week', label: 'Week' }, { id: 'month', label: 'Month' }, { id: 'year', label: 'Year' }]}
        className="sm:max-w-md"
      />
      </Tile>

      <Tile id="income-total" label="Period income">
        <MetricCard className="p-3.5 sm:p-5" type="compact" priority="medium" title="Income" amount={formatCents(summary.incomeCents)} subtitle="Received in period" />
      </Tile>
      <Tile id="spending-total" label="Period spending">
        <MetricCard className="p-3.5 sm:p-5" type="compact" priority="medium" title="Actual spending" amount={formatCents(summary.spendingCents)} subtitle="Recorded expenses" />
      </Tile>
      <Tile id="planned-total" label="Planned expense total">
        <MetricCard className="p-3.5 sm:p-5" type="compact" priority="medium" title="Planned" amount={formatCents(summary.plannedCents)} subtitle="Active expense bucket targets" />
      </Tile>
      <Tile id="budget-variance" label="Budget variance">
        <MetricCard
          className="p-3.5 sm:p-5"
          type="compact"
          priority={summary.budgetVarianceCents < 0 ? 'high' : 'low'}
          title={summary.budgetVarianceCents < 0 ? 'Over plan' : summary.budgetVarianceCents > 0 ? 'Remaining' : 'On plan'}
          amount={formatCents(Math.abs(summary.budgetVarianceCents))}
          subtitle={summary.budgetVarianceCents < 0 ? 'Above planned spending' : summary.budgetVarianceCents > 0 ? 'Left in the spending plan' : 'Planned amount fully spent'}
        />
      </Tile>
      <Tile id="available-to-assign" label="Available to assign">
        <MetricCard className="p-3.5 sm:p-5" type="compact" priority="high" title="Unallocated" amount={formatCents(summary.unallocatedCents)} subtitle="Assignable at period end" />
      </Tile>
      <Tile id="net-activity-total" label="Net cash flow">
        <MetricCard className="p-3.5 sm:p-5" type="compact" priority="low" title="Net cash flow" amount={formatCents(summary.netActivityCents)} subtitle="Surplus or deficit" />
      </Tile>
      <Tile id="savings-total" label="Savings contributions" className="col-span-full xl:col-span-3">
        <MetricCard className="p-3.5 sm:p-5" type="compact" priority="high" title="Savings contributions" amount={formatCents(summary.savingsCents)} subtitle={`${summary.savingsRate.toFixed(1)}% rate · ${formatCents(summary.savingsGrowthCents)} growth`} />
      </Tile>
      <Tile id="average-expense-total" label="Average expense" className="col-span-full xl:col-span-3">
        <MetricCard className="p-3.5 sm:p-5" type="compact" priority="low" title="Average expense" amount={formatCents(summary.averageExpenseCents)} subtitle={`${summary.largestExpenses.length ? 'Largest expense' : 'No expenses'}${summary.largestExpenses[0] ? ` · ${formatCents(summary.largestExpenses[0].amountCents)}` : ''}`} />
      </Tile>

      <Tile id="spending-category-chart" label="Spending by category" className="col-span-full xl:col-span-4">
        {spendingView === 'actual' ? spendingBars.some((row) => row.segments.length > 0) ? (
            <StackedBarGraph
              key={period}
              title="Spending by category"
              headerContent={<SegmentedControl
                value={spendingView}
                onChange={(value) => { if (value === 'actual' || value === 'variance') setSpendingView(value) }}
                options={[{ id: 'actual', label: 'Actual spending' }, { id: 'variance', label: 'Plan variance' }]}
                className="w-full sm:w-fit"
              />}
              data={spendingBars}
              legend={spendingLegend}
              timeframeOptions={['Week', 'Month', 'Year']}
              defaultTimeframe={period[0].toUpperCase() + period.slice(1)}
              onTimeframeChange={(value) => {
                const normalized = value.toLowerCase()
                if (normalized === 'week' || normalized === 'month' || normalized === 'year') setPeriod(normalized)
              }}
              className="h-full"
            />
          ) : (
            <Card className="p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">Spending by category</h2>
                <SegmentedControl
                  value={spendingView}
                  onChange={(value) => { if (value === 'actual' || value === 'variance') setSpendingView(value) }}
                  options={[{ id: 'actual', label: 'Actual spending' }, { id: 'variance', label: 'Plan variance' }]}
                  className="w-full sm:w-fit"
                />
              </div>
              <EmptyChart>No spending recorded in this period.</EmptyChart>
            </Card>
          ) : (
            <Card className="p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Plan variance by bucket</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Positive values are remaining in the plan; negative values are over plan.</p>
                </div>
                <SegmentedControl
                  value={spendingView}
                  onChange={(value) => { if (value === 'actual' || value === 'variance') setSpendingView(value) }}
                  options={[{ id: 'actual', label: 'Actual spending' }, { id: 'variance', label: 'Plan variance' }]}
                  className="w-full sm:w-fit"
                />
              </div>
              {summary.budget.length ? <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-sm">
                  <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="py-2 pr-2 font-medium">Bucket</th><th className="px-2 text-right font-medium">Planned</th><th className="px-2 text-right font-medium">Spent</th><th className="px-2 text-right font-medium">Covered</th><th className="pl-2 text-right font-medium">Variance</th></tr></thead>
                  <tbody>{summary.budget.map((row) => <tr key={row.id} className="border-b border-border/50"><td className="max-w-40 truncate py-2.5 pr-2">{row.name}</td><td className="px-2 text-right tabular-nums">{formatCents(row.planned)}</td><td className="px-2 text-right tabular-nums">{formatCents(row.spent)}</td><td className="px-2 text-right tabular-nums">{formatCents(row.covered)}</td><td className={`pl-2 text-right tabular-nums ${row.variance < 0 ? 'text-bad' : row.variance > 0 ? 'text-good' : ''}`}>{formatCents(Math.abs(row.variance))} <span className="text-xs">{row.variance < 0 ? 'over' : row.variance > 0 ? 'remaining' : 'on plan'}</span></td></tr>)}</tbody>
                </table>
              </div> : <EmptyChart>No expense bucket targets are set for this period.</EmptyChart>}
            </Card>
          )}
      </Tile>
      <Tile id="spending-bucket-chart" label="Spending by bucket" className="col-span-full xl:col-span-2">
        {spendingCategories.length ? (
          <SemiGaugeGraph title="Spending by bucket" amount={formatCents(summary.spendingCents)} categories={spendingCategories} />
        ) : (
          <Card className="p-4 sm:p-5"><h2 className="font-semibold">Spending by bucket</h2><EmptyChart>No spending recorded in this period.</EmptyChart></Card>
        )}
      </Tile>

      <Tile id="spending-trend" label="Spending trend" className="col-span-full">
      <AreaLineGraph
        title="Spending trend"
        subtitle={`${summary.title} · Cumulative actual spending against planned pace`}
        data={trendData}
        strokeColor="var(--color-chart-1)"
        gradientStart="color-mix(in srgb, var(--color-chart-1) 28%, transparent)"
        gradientStop="transparent"
      />
      </Tile>

      <Tile id="budget-vs-actual" label="Budget versus actual" className="col-span-full">
      <Card className="p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2"><WalletCards className="size-4 text-primary" /><div><h2 className="font-semibold">Budget vs. actual</h2><p className="text-xs text-muted-foreground">Actual spending compared with planned expense targets for this {period}.</p></div></div>
          <span className="rounded-lg bg-sunken px-3 py-2 text-xs text-muted-foreground">Planned <strong className="ml-1 text-foreground">{formatCents(totalBudget)}</strong> · Spent <strong className="text-foreground">{formatCents(summary.spendingCents)}</strong> · {summary.budgetVarianceCents < 0 ? 'Over plan' : summary.budgetVarianceCents > 0 ? 'Remaining' : 'On plan'} <strong className={summary.budgetVarianceCents < 0 ? 'text-bad' : 'text-good'}>{formatCents(Math.abs(summary.budgetVarianceCents))}</strong></span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="min-w-0 space-y-2">
            <div className="flex h-[3.625rem] items-end pb-1 text-xs font-medium text-muted-foreground">Overall view</div>
            <BudgetGaugeGraph title="All spending" subtitle="Expense buckets only" budgetCents={totalBudget} spentCents={summary.spendingCents} />
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
      </Tile>

      <Tile id="largest-expenses" label="Largest expenses" className="col-span-full xl:col-span-3">
        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2"><ReceiptText className="size-4 text-primary" /><div><h2 className="font-semibold">Largest expenses</h2><p className="text-xs text-muted-foreground">Highest individual entries in this period.</p></div></div>
          {summary.largestExpenses.length ? <ul className="divide-y divide-border/70">
            {summary.largestExpenses.map((event) => <li key={event.id} className="flex items-center justify-between gap-3 py-3"><span className="min-w-0"><strong className="block truncate text-sm">{event.payee || event.description || event.bucketName}</strong><span className="text-xs text-muted-foreground">{event.bucketName} · {event.date}</span></span><strong className="shrink-0 tabular-nums">{formatCents(event.amountCents)}</strong></li>)}
          </ul> : <EmptyChart>No expenses in this period.</EmptyChart>}
        </Card>
      </Tile>
      <Tile id="income-by-source" label="Income by source" className="col-span-full xl:col-span-3">
        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2"><CircleDollarSign className="size-4 text-primary" /><div><h2 className="font-semibold">Income by source</h2><p className="text-xs text-muted-foreground">Source comes from the payee or description.</p></div></div>
          {summary.incomeBySource.length ? <ul className="divide-y divide-border/70">
            {summary.incomeBySource.slice(0, 8).map((row, index) => <li key={row.id} className="flex items-center justify-between gap-3 py-3"><span className="flex min-w-0 items-center gap-2"><i className="size-2.5 rounded-full" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} /><span className="truncate text-sm">{row.name}</span></span><strong className="shrink-0 tabular-nums">{formatCents(row.amount)}</strong></li>)}
          </ul> : <EmptyChart>No income recorded in this period.</EmptyChart>}
        </Card>
      </Tile>

      <Tile id="bucket-activity" label="Bucket activity" className="col-span-full xl:col-span-3">
        <Card className="p-4 sm:p-5">
          <div className="mb-4"><h2 className="font-semibold">Bucket activity</h2><p className="mt-1 text-xs text-muted-foreground">Planned spending, actual expenses, coverage, and variance.</p></div>
          {summary.bucketActivity.length ? <div className="overflow-x-auto"><table className="w-full min-w-[44rem] text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="py-2 pr-2 font-medium">Bucket</th><th className="px-2 text-right font-medium">Planned</th><th className="px-2 text-right font-medium">Spent</th><th className="px-2 text-right font-medium">Covered</th><th className="px-2 text-right font-medium">Uncovered</th><th className="px-2 text-right font-medium">Variance</th><th className="py-2 pl-2 text-right font-medium">Assigned</th></tr></thead>
            <tbody>{summary.bucketActivity.slice(0, 10).map((row) => <tr key={row.id} className="border-b border-border/50"><td className="max-w-40 truncate py-2.5 pr-2">{row.name}</td><td className="px-2 text-right tabular-nums">{row.isExpense ? formatCents(row.planned) : '—'}</td><td className="px-2 text-right tabular-nums">{formatCents(row.spent)}</td><td className="px-2 text-right tabular-nums">{row.isExpense ? formatCents(row.covered) : '—'}</td><td className="px-2 text-right tabular-nums">{row.isExpense ? formatCents(row.uncovered) : '—'}</td><td className={`px-2 text-right tabular-nums ${row.variance < 0 ? 'text-bad' : row.isExpense ? 'text-good' : ''}`}>{row.isExpense ? formatCents(row.variance) : '—'}</td><td className="pl-2 text-right tabular-nums">{formatCents(row.allocated)}</td></tr>)}</tbody>
          </table></div> : <EmptyChart>No bucket activity in this period.</EmptyChart>}
        </Card>
      </Tile>
      <Tile id="period-transactions" label="Period transactions" className="col-span-full xl:col-span-3">
        <Card className="p-4 sm:p-5">
          <div className="mb-4"><h2 className="font-semibold">Period transactions</h2><p className="mt-1 text-xs text-muted-foreground">Income, expenses, moves, assignments, and adjustments.</p></div>
          {summary.periodEvents.length ? <ul className="divide-y divide-border/70">
            {summary.periodEvents.slice(0, 10).map((event) => <li key={event.id} className="flex items-center justify-between gap-3 py-2.5"><span className="min-w-0"><strong className="block truncate text-sm">{event.description || event.type.replace('_', ' ')}</strong><span className="text-xs text-muted-foreground">{event.date} · {event.type.replace('_', ' ')}</span></span><strong className="shrink-0 tabular-nums">{formatCents(event.amountCents)}</strong></li>)}
          </ul> : <EmptyChart>No transactions in this period.</EmptyChart>}
        </Card>
      </Tile>

      <Tile id="money-flow" label="Money flow" className="col-span-full">
      <Card className="p-4 sm:p-5">
        <div className="mb-2 flex items-center gap-2"><BarChart3 className="size-4 text-primary" /><div><h2 className="font-semibold">Money flow</h2><p className="text-xs text-muted-foreground">An explanatory view of assignments toward actual expense coverage and savings contributions, not a second bank transaction flow.</p></div></div>
        <SankeyChart events={events} buckets={buckets} groups={groups} startDate={summary.startDate} endDate={summary.endDate} />
      </Card>
      </Tile>
    </TileBoard>
  )
}

function EmptyChart({ children }: { children: string }) {
  return <div className="grid h-56 place-items-center rounded-xl bg-muted/15 px-5 text-center text-sm text-muted-foreground">{children}</div>
}

function buildCumulativeTrend(points: { label: string; spending: number; planned: number }[]) {
  let spendingCents = 0
  let plannedCents = 0
  return points.map((point) => {
    spendingCents += point.spending
    plannedCents += point.planned
    return { label: point.label, value: spendingCents / 100, planned: plannedCents / 100 }
  })
}
