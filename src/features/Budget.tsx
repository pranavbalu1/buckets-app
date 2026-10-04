import { Fragment, useMemo, useState } from 'react'
import { Plus, Sparkles, Users } from 'lucide-react'
import { Modal } from '../components/ui/modal'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import Money from '../components/Money'
import ProgressBar from '../components/ProgressBar'
import { computeBalances } from '../domain/balances'
import { computeMonthBudget, maxReturnable, planRain } from '../domain/budget'
import type { BucketMonth } from '../domain/budget'
import { addMonths, currentMonth, dateLabel, monthLabel, todayString } from '../domain/dates'
import { makeEvent } from '../domain/events'
import { centsToInput, formatCents, parseDollars, parseSignedDollars } from '../domain/money'
import { BUCKET_KIND_LABELS, bucketColor } from '../domain/models'
import type { Bucket, BucketGroup } from '../domain/models'
import { useLedger } from '../storage/store'
import BudgetEditor from './BudgetEditor'

type Dialog =
  | { kind: 'rain' }
  | { kind: 'editor'; target: { type: 'bucket'; value?: Bucket } | { type: 'group'; value?: BucketGroup } }
  | null

type Section = { key: string; title: string; group: BucketGroup | null; items: Bucket[] }

const TABLE_HEAD = (
  <>
    <colgroup>
      <col />
      <col className="w-28" />
      <col className="w-32" />
      <col className="w-32" />
      <col className="w-28" />
      <col className="w-24" />
      <col className="w-28" />
      <col className="w-44" />
      <col className="w-14" />
    </colgroup>
    <thead className="sticky top-0 z-[1] bg-surface/95 text-[10px] tracking-wide text-muted uppercase backdrop-blur">
      <tr>
        <th className="px-3 py-2 text-left font-medium"><span className="sr-only">Bucket</span></th>
        <th className="px-3 py-2 text-right font-medium">Available</th>
        <th className="px-3 py-2 text-right font-medium" title="The bucket balance carried in from before this month">Opening balance</th>
        <th className="px-3 py-2 text-center font-medium">In / Out</th>
        <th className="px-3 py-2 text-right font-medium">Monthly want</th>
        <th className="px-3 py-2 text-right font-medium">Net funded</th>
        <th className="px-3 py-2 text-right font-medium">Spent</th>
        <th className="px-3 py-2 text-left font-medium">Want progress</th>
        <th className="px-3 py-2"><span className="sr-only">Actions</span></th>
      </tr>
    </thead>
  </>
)

export default function Budget() {
  const { groups, buckets, events, addEvent } = useLedger()
  const [month, setMonth] = useState(currentMonth())
  const [dialog, setDialog] = useState<Dialog>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [expandedBuckets, setExpandedBuckets] = useState<Record<string, boolean>>({})
  const [draggedBucket, setDraggedBucket] = useState<string | null>(null)
  const [draggedGroup, setDraggedGroup] = useState<string | null>(null)

  const budget = useMemo(
    () => computeMonthBudget(events, buckets.map((b) => b.id), month),
    [events, buckets, month],
  )
  const bank = useMemo(() => {
    const b = computeBalances(events, `${month}-31`)
    return Object.values(b.accounts).reduce((a, c) => a + c, 0)
  }, [events, month])

  const rows = new Map(budget.buckets.map((r) => [r.bucketId, r]))
  const availableOf = (b: Bucket) => rows.get(b.id)?.availableCents ?? 0
  const spentOf = (b: Bucket) => rows.get(b.id)?.spentCents ?? 0
  const inOf = (b: Bucket) => {
    const r = rows.get(b.id)
    return r ? r.allocatedCents + r.movedInCents - r.movedOutCents : 0
  }

  // Archived buckets stay visible while they still hold (or owe) money.
  const shown = buckets.filter((b) => !b.archived || showArchived || availableOf(b) !== 0)
  const sections: Section[] = [
    ...groups.map((g) => ({
      key: g.id,
      title: g.name,
      group: g,
      items: shown.filter((b) => b.groupId === g.id),
    })),
    { key: 'none', title: 'Ungrouped', group: null, items: shown.filter((b) => !b.groupId) },
  ].filter((s) => s.group !== null || s.items.length > 0)

  const totalWant = buckets.filter((b) => !b.archived).reduce((s, b) => s + b.monthlyTargetCents, 0)
  const rain = budget.unallocatedCents
  const toggle = (key: string) => setCollapsed((c) => ({ ...c, [key]: !c[key] }))
  const toggleBucketDetails = (key: string) => setExpandedBuckets((state) => ({ ...state, [key]: !state[key] }))

  async function reorderBuckets(sourceId: string, targetId: string, targetGroupId: string | null) {
    if (sourceId === targetId) return
    const ordered = [...buckets].sort((a, b) => a.sortOrder - b.sortOrder)
    const source = ordered.find((b) => b.id === sourceId)
    if (!source) return
    const without = ordered.filter((b) => b.id !== sourceId)
    const targetIndex = without.findIndex((b) => b.id === targetId)
    without.splice(targetIndex < 0 ? without.length : targetIndex, 0, { ...source, groupId: targetGroupId })
    await Promise.all(without.map((bucket, index) =>
      useLedger.getState().updateBucket(bucket.id, { sortOrder: index, groupId: bucket.groupId }),
    ))
  }

  async function reorderGroups(sourceId: string, targetId: string) {
    if (sourceId === targetId) return
    const ordered = [...groups].sort((a, b) => a.sortOrder - b.sortOrder)
    const source = ordered.find((g) => g.id === sourceId)
    if (!source) return
    const without = ordered.filter((g) => g.id !== sourceId)
    const targetIndex = without.findIndex((g) => g.id === targetId)
    without.splice(targetIndex < 0 ? without.length : targetIndex, 0, source)
    await Promise.all(without.map((group, index) =>
      useLedger.getState().updateGroup(group.id, { sortOrder: index }),
    ))
  }

  /** Positive cents put money in from Rain; negative takes it back. Returns an error message or null. */
  async function moveInOut(bucket: Bucket, cents: number): Promise<string | null> {
    if (cents < 0) {
      const max = maxReturnable(events, bucket.id, month)
      if (-cents > max) return `Only ${formatCents(max)} can come out`
    }
    const ok = await addEvent(
      makeEvent({
        type: 'allocation',
        date: todayString(),
        month: `${month}-01`,
        amountCents: Math.abs(cents),
        bucketId: bucket.id,
        direction: cents < 0 ? 'out' : null,
        description: cents < 0 ? 'Returned to Rain' : 'Assigned',
      }),
    )
    return ok ? null : 'Could not save'
  }

  return (
    <div className="space-y-4">
      <Card className="sticky top-3 z-10 flex flex-wrap items-center gap-x-8 gap-y-3 p-4 shadow-md backdrop-blur-xl">
        <Figure label="Rain · unassigned" cents={rain} big accent={rain >= 0} />
        <div className="flex items-center gap-4">
          <Figure label="Income" cents={budget.incomeCents} />
          <Figure label="Net assigned" cents={budget.allocatedCents} />
          <span className="text-muted">−</span>
          <Figure label="Spending" cents={budget.spentCents} />
          <span className="text-muted">=</span>
          <Figure label="Income − spending" cents={budget.incomeCents - budget.spentCents} />
        </div>
        <Figure label="Net account balances" cents={bank} />

        <div className="ml-auto flex items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-line bg-surface">
            <button aria-label="Previous month" className="px-3 py-2 hover:bg-sunken"
              onClick={() => setMonth(addMonths(month, -1))}>‹</button>
            <span className="min-w-36 text-center text-sm font-semibold">{monthLabel(month)}</span>
            <button aria-label="Next month" className="px-3 py-2 hover:bg-sunken"
              onClick={() => setMonth(addMonths(month, 1))}>›</button>
          </div>
          <button className="btn-link" onClick={() => setMonth(currentMonth())}>Today</button>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={() => setDialog({ kind: 'rain' })}><Sparkles className="size-4" /> Make it rain!</Button>
        <Button variant="secondary" onClick={() => setDialog({ kind: 'editor', target: { type: 'bucket' } })}><Plus className="size-4" /> New bucket</Button>
        <Button variant="secondary" onClick={() => setDialog({ kind: 'editor', target: { type: 'group' } })}><Users className="size-4" /> New group</Button>
        <div className="ml-1 rounded-lg bg-sunken/60 px-3 py-2 text-xs sm:ml-2 sm:text-sm">
          <span className="font-semibold tabular-nums">{formatCents(totalWant)}</span>{' '}
          <span className="text-muted">total monthly wants</span>
        </div>
        <label className="ml-auto flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs text-muted hover:bg-sunken/70">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived
        </label>
      </div>

      {sections.length === 0 && (
        <p className="py-8 text-center text-muted">
          No buckets yet. Create a group, then add buckets to it.
        </p>
      )}

      {sections.map((s) => {
        const { group } = s
        const isCollapsed = collapsed[s.key] ?? false
        const sum = (f: (b: Bucket) => number) => s.items.reduce((t, b) => t + f(b), 0)
        const groupIn = sum(inOf)
        const groupSpent = sum(spentOf)

        return (
          <section key={s.key} className="card overflow-hidden shadow-sm transition-shadow hover:shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[68rem] table-fixed text-sm">
                {TABLE_HEAD}
                <tbody>
                  <tr className="bg-sunken/75 font-medium transition-colors hover:bg-sunken"
                    draggable={Boolean(group)}
                    onDragStart={() => group && setDraggedGroup(group.id)}
                    onDragEnd={() => setDraggedGroup(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (group && draggedBucket) {
                        const firstBucket = s.items[0]
                        if (firstBucket) void reorderBuckets(draggedBucket, firstBucket.id, group.id)
                        else void useLedger.getState().updateBucket(draggedBucket, { groupId: group.id })
                      } else if (group && draggedGroup) {
                        void reorderGroups(draggedGroup, group.id)
                      }
                      setDraggedGroup(null)
                      setDraggedBucket(null)
                    }}>
                    <td className="px-3 py-2">
                      <button aria-expanded={!isCollapsed} onClick={() => toggle(s.key)}
                        className="flex items-center gap-2">
                        <span aria-hidden className="w-4 text-center text-muted">{isCollapsed ? '+' : '−'}</span>
                        {group && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: group.color ?? '#64748b' }} />}
                        {s.title}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right"><Money cents={sum(availableOf)} /></td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted"><Money cents={sum((b) => rows.get(b.id)?.carryoverCents ?? 0)} /></td>
                    <td />
                    <td className="px-3 py-2 text-right tabular-nums">{formatCents(sum((b) => b.monthlyTargetCents))}</td>
                    <td className="px-3 py-2 text-right tabular-nums"><Money cents={groupIn} /></td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCents(groupSpent)}</td>
                    <td />
                    <td className="px-2 text-right">
                      {group && <button className="btn-link" aria-label={`Edit group ${group.name}`}
                        onClick={() => setDialog({ kind: 'editor', target: { type: 'group', value: group } })}>Edit</button>}
                    </td>
                  </tr>

                  {!isCollapsed && s.items.length === 0 && (
                    <tr><td colSpan={9} className="px-3 py-3 text-muted">No buckets in this group yet.</td></tr>
                  )}

                  {!isCollapsed && s.items.map((b) => {
                    const funded = inOf(b)
                    const spent = spentOf(b)
                    const bucketMonth = rows.get(b.id)
                    const isExpanded = expandedBuckets[b.id] ?? false
                    return (
                      <Fragment key={b.id}>
                      <tr className={`group border-t border-line transition-colors hover:bg-sunken/35 ${b.archived ? 'opacity-60' : ''}`}
                        draggable
                        onDragStart={() => setDraggedBucket(b.id)}
                        onDragEnd={() => setDraggedBucket(null)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          if (draggedBucket) void reorderBuckets(draggedBucket, b.id, group?.id ?? null)
                          setDraggedBucket(null)
                        }}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2.5">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: b.color ?? group?.color ?? bucketColor(b) }} />
                            <span className="truncate font-medium">{b.name}</span>
                            {b.archived && <span className="text-xs text-muted">archived</span>}
                            {b.kind !== 'spending' && (
                              <span className="rounded-full bg-sunken px-2 py-0.5 text-xs text-muted">
                                {BUCKET_KIND_LABELS[b.kind]}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          <Money cents={availableOf(b)} />
                          {availableOf(b) < 0 && <span className="mt-0.5 block text-[10px] font-normal text-bad">overspent</span>}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted">
                          <Money cents={bucketMonth?.carryoverCents ?? 0} />
                        </td>
                        <td className="px-1 py-1 align-top">
                          {!b.archived && <InOutCell name={b.name} onSubmit={(c) => moveInOut(b, c)} />}
                        </td>
                        <td className="px-1 py-1 align-top">
                          <WantCell key={`${b.id}-${b.monthlyTargetCents}`} bucket={b} />
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted">
                          {funded === 0 ? '—' : <Money cents={funded} />}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted">
                          {spent === 0 ? '—' : formatCents(spent)}
                        </td>
                        <td className="px-3 py-2">
                          {b.monthlyTargetCents > 0 ? (
                            <div className="space-y-1">
                              <ProgressBar pct={(funded / b.monthlyTargetCents) * 100} over={funded > b.monthlyTargetCents} />
                              <div className="text-xs text-muted">
                                {funded < 0
                                  ? `${formatCents(-funded)} returned to Rain`
                                  : `${formatCents(funded)} of ${formatCents(b.monthlyTargetCents)}`}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        <button className="btn-link mt-1 text-xs"
                          aria-label={`${isExpanded ? 'Hide' : 'Show'} calculation for ${b.name}`} aria-expanded={isExpanded}
                          aria-controls={`bucket-details-${b.id}`} onClick={() => toggleBucketDetails(b.id)}>
                          {isExpanded ? 'Hide calculation' : 'Show calculation'}
                        </button>
                      </td>
                        <td className="px-2 text-right">
                          <button className="btn-link" aria-label={`Edit ${b.name}`}
                            onClick={() => setDialog({ kind: 'editor', target: { type: 'bucket', value: b } })}>Edit</button>
                        </td>
                      </tr>
                      {isExpanded && bucketMonth && <tr id={`bucket-details-${b.id}`} className="border-t border-line bg-sunken/30">
                        <td colSpan={9} className="p-3 sm:p-4">
                          <BucketBreakdown bucket={b} row={bucketMonth} month={month}
                            groupName={groups.find((item) => item.id === b.groupId)?.name ?? 'Ungrouped'} />
                        </td>
                      </tr>}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}

      {dialog?.kind === 'rain' && <RainDialog month={month} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'editor' && (
        <div className="card p-4">
          <BudgetEditor key={dialog.target.value?.id ?? 'new'} target={dialog.target} onClose={() => setDialog(null)} />
        </div>
      )}
    </div>
  )
}

function BucketBreakdown({ bucket, row, month, groupName }: {
  bucket: Bucket
  row: BucketMonth
  month: string
  groupName: string
}) {
  const netFunding = row.allocatedCents + row.movedInCents - row.movedOutCents
  const hasGoal = bucket.targetCents !== null && bucket.targetCents > 0
  const goalProgress = hasGoal ? row.availableCents / bucket.targetCents! * 100 : 0
  const goalRemaining = hasGoal ? bucket.targetCents! - row.availableCents : 0
  const selectedMonthIndex = monthIndex(month)
  const targetMonthIndex = bucket.targetDate ? monthIndex(bucket.targetDate.slice(0, 7)) : selectedMonthIndex
  const futureDeposits = Math.max(0, targetMonthIndex - selectedMonthIndex)
  const projectedAtTarget = row.availableCents + futureDeposits * bucket.monthlyTargetCents
  const targetDatePassed = Boolean(bucket.targetDate && targetMonthIndex < selectedMonthIndex)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-semibold">{bucket.name}: month calculation</h3>
          <p className="text-xs text-muted">{groupName} · {BUCKET_KIND_LABELS[bucket.kind]} · {monthLabel(month)}</p>
        </div>
        <p className="text-xs text-muted">Net funded includes assignments and bucket moves.</p>
      </div>

      <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <BreakdownValue label="Carryover" cents={row.carryoverCents} />
        <BreakdownValue label="Assigned" cents={row.allocatedCents} />
        <BreakdownValue label="Moved in" cents={row.movedInCents} />
        <BreakdownValue label="Moved out" cents={row.movedOutCents} />
        <BreakdownValue label="Spent" cents={row.spentCents} />
        <BreakdownValue label="Available at month end" cents={row.availableCents} strong />
      </dl>

      <p className="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-muted">
        {formatCents(row.carryoverCents)} carryover + {formatCents(row.allocatedCents)} assigned + {formatCents(row.movedInCents)} moved in − {formatCents(row.movedOutCents)} moved out − {formatCents(row.spentCents)} spent = <strong className="text-ink">{formatCents(row.availableCents)}</strong> available.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-3">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs font-medium text-muted">Monthly want</p><p className="mt-1 text-lg font-semibold tabular-nums">{formatCents(bucket.monthlyTargetCents)}</p></div>
            <div className="text-right"><p className="text-xs text-muted">Net funded</p><p className="mt-1 text-sm font-semibold tabular-nums">{formatCents(netFunding)}</p></div>
          </div>
          {bucket.monthlyTargetCents > 0 ? <>
            <ProgressBar pct={netFunding / bucket.monthlyTargetCents * 100} over={netFunding > bucket.monthlyTargetCents} />
            <p className="mt-1 text-xs text-muted">
              {netFunding > bucket.monthlyTargetCents
                ? `${formatCents(netFunding - bucket.monthlyTargetCents)} over want`
                : netFunding === bucket.monthlyTargetCents
                  ? 'Fully funded'
                  : `${formatCents(bucket.monthlyTargetCents - netFunding)} left to fund`}
            </p>
          </> : <p className="mt-2 text-xs text-muted">Set a monthly want to track how much you plan to fund this bucket.</p>}
        </div>

        {hasGoal ? <div className="rounded-xl border border-line bg-surface p-3">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs font-medium text-muted">Goal balance</p><p className="mt-1 text-lg font-semibold tabular-nums">{formatCents(row.availableCents)} <span className="text-sm font-normal text-muted">of {formatCents(bucket.targetCents!)}</span></p></div>
            {bucket.targetDate && <div className="text-right"><p className="text-xs text-muted">Target date</p><p className="mt-1 text-sm font-medium">{dateLabel(bucket.targetDate)}</p></div>}
          </div>
          <ProgressBar pct={goalProgress} over={goalProgress > 100} />
          <p className="mt-1 text-xs text-muted">
            {goalRemaining > 0 ? `${Math.round(goalProgress)}% funded · ${formatCents(goalRemaining)} remaining`
              : goalRemaining === 0 ? 'Goal reached'
                : `${Math.round(goalProgress)}% funded · ${formatCents(-goalRemaining)} above goal`}
          </p>
        </div> : bucket.kind === 'save_until_date' && bucket.targetDate ? <div className="rounded-xl border border-line bg-surface p-3">
          <p className="text-xs font-medium text-muted">{targetDatePassed ? 'Available this month' : 'Projected at target date'}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{formatCents(targetDatePassed ? row.availableCents : projectedAtTarget)}</p>
          {targetDatePassed
            ? <p className="mt-1 text-xs text-muted">Target date was {dateLabel(bucket.targetDate)}.</p>
            : <p className="mt-1 text-xs text-muted">Assuming no spending or withdrawals: {formatCents(bucket.monthlyTargetCents)} per month for {futureDeposits} future {futureDeposits === 1 ? 'deposit' : 'deposits'} through {dateLabel(bucket.targetDate)}.</p>}
        </div> : <div className="rounded-xl border border-dashed border-line p-3">
          <p className="text-xs font-medium text-muted">No balance goal set</p>
          <p className="mt-1 text-xs text-muted">This bucket keeps its available balance until you move or spend it.</p>
        </div>}
      </div>
    </div>
  )
}

function BreakdownValue({ label, cents, strong = false }: { label: string; cents: number; strong?: boolean }) {
  return <div className="rounded-lg bg-surface px-3 py-2">
    <dt className="text-[11px] text-muted">{label}</dt>
    <dd className={`mt-1 tabular-nums ${strong ? 'font-semibold' : 'font-medium'}`}><Money cents={cents} /></dd>
  </div>
}

function monthIndex(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  return year * 12 + monthNumber - 1
}

function Figure({ label, cents, big = false, accent = false }: {
  label: string
  cents: number
  big?: boolean
  accent?: boolean
}) {
  return (
    <div>
      <div className={`${big ? 'text-3xl' : 'text-xl'} font-semibold`}>
        <Money cents={cents} className={accent ? 'text-accent' : ''} />
      </div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  )
}

function InOutCell({ name, onSubmit }: { name: string; onSubmit: (cents: number) => Promise<string | null> }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  async function submit() {
    if (!value.trim()) return
    const cents = parseSignedDollars(value)
    if (cents === null) {
      setError('Invalid amount')
      return
    }
    const problem = await onSubmit(cents)
    if (problem) setError(problem)
    else {
      setError('')
      setValue('')
    }
  }

  return (
    <div>
      <input
        aria-label={`Put in or take out of ${name}`}
        title="Type an amount and press Enter. Use a minus sign to take money out."
        className="input-bare"
        inputMode="decimal"
        placeholder="In / Out"
        value={value}
        onChange={(e) => { setValue(e.target.value); setError('') }}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      {error && <div className="px-2 text-right text-xs text-bad">{error}</div>}
    </div>
  )
}

function WantCell({ bucket }: { bucket: Bucket }) {
  const updateBucket = useLedger((s) => s.updateBucket)
  const original = bucket.monthlyTargetCents ? centsToInput(bucket.monthlyTargetCents) : ''
  const [value, setValue] = useState(original)

  async function save() {
    const trimmed = value.trim()
    const cents = trimmed === '' ? 0 : parseDollars(trimmed)
    if (cents === null) {
      setValue(original)
      return
    }
    if (cents !== bucket.monthlyTargetCents) await updateBucket(bucket.id, { monthlyTargetCents: cents })
  }

  return (
    <input
      aria-label={`Monthly want for ${bucket.name}`}
      className="input-bare"
      inputMode="decimal"
      placeholder="0.00"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  )
}

function RainDialog({ month, onClose }: { month: string; onClose: () => void }) {
  const buckets = useLedger((s) => s.buckets)
  const events = useLedger((s) => s.events)
  const addEvents = useLedger((s) => s.addEvents)
  const [busy, setBusy] = useState(false)

  const plan = useMemo(
    () => planRain(events, buckets.filter((b) => !b.archived), month),
    [events, buckets, month],
  )
  const nameOf = (id: string) => buckets.find((b) => b.id === id)?.name ?? '—'

  async function confirm() {
    setBusy(true)
    const ok = await addEvents(
      plan.steps.map((s) =>
        makeEvent({
          type: 'allocation',
          date: todayString(),
          month: `${month}-01`,
          amountCents: s.cents,
          bucketId: s.bucketId,
          description: 'Make it rain',
        }),
      ),
    )
    setBusy(false)
    if (ok) onClose()
  }

  return (
    <Modal title={`Make it rain · ${monthLabel(month)}`} onClose={onClose}>
      {plan.steps.length === 0 ? (
        <p className="text-sm text-muted">
          Nothing to hand out. Either there is no Rain right now, or every bucket already has its Want for
          this month. Set a Want on each bucket first if you haven't.
        </p>
      ) : (
        <div className="space-y-4">
          <ul className="divide-y divide-line rounded-lg border border-line text-sm">
            {plan.steps.map((s) => (
              <li key={s.bucketId} className="flex justify-between px-3 py-2">
                <span>{nameOf(s.bucketId)}</span>
                <span className="tabular-nums">{formatCents(s.cents)}</span>
              </li>
            ))}
            <li className="flex justify-between bg-sunken px-3 py-2 font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatCents(plan.givenCents)}</span>
            </li>
          </ul>
          {plan.shortfallCents > 0 && (
            <p className="text-sm text-bad">
              Not enough Rain to cover every Want. Short by {formatCents(plan.shortfallCents)}. Buckets are
              filled in the order shown on the Budget screen.
            </p>
          )}
          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={busy} onClick={confirm}>
              {busy ? 'Saving…' : 'Make it so'}
            </button>
            <button className="btn" onClick={onClose}>Cancel</button>
          </div>
        </div>
      )}
    </Modal>
  )
}
