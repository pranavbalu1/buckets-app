import { useMemo, useState } from 'react'
import type { DragEvent } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronDown, CircleDollarSign, GripVertical, Plus, ReceiptText, Users } from 'lucide-react'
import { Button, Card, List, Modal, ProgressBar, Skeleton, Tile, TileBoard } from '../components'
import type { ListItemData } from '../components'
import Money from '../app/components/Money'
import { computeBalances } from '../domain/balances'
import { computeMonthBudget, maxAllocatable, maxReturnable, planExpenseCoverage, planSavingsFunding } from '../domain/budget'
import type { BucketMonth } from '../domain/budget'
import { addMonths, currentMonth, dateLabel, monthLabel, todayString } from '../domain/dates'
import { makeEvent } from '../domain/events'
import { centsToInput, formatCents, parseDollars, parseSignedDollars } from '../domain/money'
import { BUCKET_KIND_LABELS, bucketColor, isExpenseBucket, isSavingsBucket } from '../domain/models'
import type { Bucket, BucketGroup } from '../domain/models'
import { useLedger } from '../storage/store'
import BudgetEditor from './BudgetEditor'

type Dialog =
  | { kind: 'cover-expenses' | 'fund-savings' }
  | { kind: 'editor'; target: { type: 'bucket'; value?: Bucket } | { type: 'group'; value?: BucketGroup } }
  | null

type Section = { key: string; title: string; group: BucketGroup | null; items: Bucket[] }

const budgetGridColumns = 'grid min-w-0 grid-cols-2 items-start gap-x-2 gap-y-2 sm:gap-x-3 2xl:min-w-[1010px] 2xl:grid-cols-[minmax(210px,1.35fr)_minmax(190px,1.2fr)_minmax(130px,.9fr)_minmax(105px,.75fr)_minmax(220px,1.4fr)_minmax(90px,.6fr)] 2xl:items-center'

export default function Budget() {
  const { groups, buckets, events, addEvent } = useLedger()
  const [month, setMonth] = useState(currentMonth())
  const [dialog, setDialog] = useState<Dialog>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [expandedBuckets, setExpandedBuckets] = useState<Record<string, boolean>>({})
  const [draggedBucket, setDraggedBucket] = useState<string | null>(null)
  const [draggedGroup, setDraggedGroup] = useState<string | null>(null)
  const [dragOverBucket, setDragOverBucket] = useState<string | null>(null)
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null)
  const [dragPlacement, setDragPlacement] = useState<'before' | 'after'>('before')

  const budget = useMemo(
    () => computeMonthBudget(events, buckets, month),
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
  const shown = buckets.filter((b) => !b.archived || showArchived || availableOf(b) !== 0).sort((a, b) => a.sortOrder - b.sortOrder)
  const orderedGroups = [...groups].sort((a, b) => a.sortOrder - b.sortOrder)
  const archivedCount = buckets.filter((b) => b.archived).length
  const sections: Section[] = [
    ...orderedGroups.map((g) => ({
      key: g.id,
      title: g.name,
      group: g,
      items: shown.filter((b) => b.groupId === g.id),
    })),
    { key: 'none', title: 'Ungrouped', group: null, items: shown.filter((b) => !b.groupId) },
  ].filter((s) => s.group !== null || s.items.length > 0)

  const totalWant = buckets.filter((b) => !b.archived && isExpenseBucket(b)).reduce((s, b) => s + b.monthlyTargetCents, 0)
  const rain = budget.unallocatedCents
  const toggle = (key: string) => setCollapsed((c) => ({ ...c, [key]: !c[key] }))
  const toggleBucketDetails = (key: string) => setExpandedBuckets((state) => ({ ...state, [key]: !state[key] }))

  async function reorderBuckets(
    sourceId: string,
    targetId: string,
    targetGroupId: string | null,
    placement: 'before' | 'after' = 'before',
  ) {
    if (sourceId === targetId) return
    const ordered = [...buckets].sort((a, b) => a.sortOrder - b.sortOrder)
    const source = ordered.find((b) => b.id === sourceId)
    if (!source) return
    const without = ordered.filter((b) => b.id !== sourceId)
    const targetIndex = without.findIndex((b) => b.id === targetId)
    const insertionIndex = targetIndex < 0 ? without.length : targetIndex + (placement === 'after' ? 1 : 0)
    without.splice(insertionIndex, 0, { ...source, groupId: targetGroupId })
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

  function moveBucketBy(bucketId: string, section: Section, offset: -1 | 1) {
    const index = section.items.findIndex((bucket) => bucket.id === bucketId)
    const target = section.items[index + offset]
    if (!target) return
    void reorderBuckets(bucketId, target.id, target.groupId, offset < 0 ? 'before' : 'after')
  }

  function moveGroupBy(groupId: string, offset: -1 | 1) {
    const ordered = [...groups].sort((a, b) => a.sortOrder - b.sortOrder)
    const index = ordered.findIndex((group) => group.id === groupId)
    const target = ordered[index + offset]
    if (!target) return
    if (offset < 0) void reorderGroups(groupId, target.id)
    else {
      const without = ordered.filter((group) => group.id !== groupId)
      const targetIndex = without.findIndex((group) => group.id === target.id)
      const source = ordered[index]
      without.splice(targetIndex + 1, 0, source)
      void Promise.all(without.map((group, order) =>
        useLedger.getState().updateGroup(group.id, { sortOrder: order }),
      ))
    }
  }

  function startBucketDrag(event: DragEvent, bucketId: string) {
    event.stopPropagation()
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', `bucket:${bucketId}`)
    setDraggedBucket(bucketId)
    setDraggedGroup(null)
  }

  function startGroupDrag(event: DragEvent, groupId: string) {
    event.stopPropagation()
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', `group:${groupId}`)
    setDraggedGroup(groupId)
    setDraggedBucket(null)
  }

  function endDrag() {
    setDraggedBucket(null)
    setDraggedGroup(null)
    setDragOverBucket(null)
    setDragOverGroup(null)
    setDragPlacement('before')
  }

  function allowGroupDrop(event: DragEvent, section: Section) {
    if (!draggedBucket && !(draggedGroup && section.group)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverGroup(section.key)
  }

  function dropOnGroup(event: DragEvent, section: Section) {
    if (!draggedBucket && !(draggedGroup && section.group)) return
    event.preventDefault()
    event.stopPropagation()
    if (draggedBucket) {
      const lastBucket = section.items.at(-1)
      if (lastBucket) {
        void reorderBuckets(draggedBucket, lastBucket.id, section.group?.id ?? null, 'after')
      } else {
        const nextOrder = Math.max(0, ...buckets.map((bucket) => bucket.sortOrder)) + 1
        void useLedger.getState().updateBucket(draggedBucket, { groupId: section.group?.id ?? null, sortOrder: nextOrder })
      }
    } else if (draggedGroup && section.group) {
      void reorderGroups(draggedGroup, section.group.id)
    }
    endDrag()
  }

  function allowBucketDrop(event: DragEvent, bucketId: string) {
    if (!draggedBucket) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    setDragOverBucket(bucketId)
    const bounds = event.currentTarget.getBoundingClientRect()
    setDragPlacement(event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after')
  }

  function dropOnBucket(event: DragEvent, bucket: Bucket) {
    if (!draggedBucket) return
    event.preventDefault()
    event.stopPropagation()
    const bounds = event.currentTarget.getBoundingClientRect()
    const placement = event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after'
    void reorderBuckets(draggedBucket, bucket.id, bucket.groupId, placement)
    endDrag()
  }

  /** Positive cents assign money; negative cents return it to the unallocated pool. */
  async function moveInOut(bucket: Bucket, cents: number): Promise<string | null> {
    if (cents > 0) {
      const max = maxAllocatable(events, month)
      if (cents > max) return `Only ${formatCents(max)} is available to assign`
    } else if (cents < 0) {
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
        description: cents < 0 ? 'Returned to unallocated' : 'Assigned to bucket',
      }),
    )
    return ok ? null : 'Could not save'
  }

  return (
    <div className="space-y-3">
      <TileBoard page="budget" className="grid grid-cols-1 gap-3">
      <Tile id="budget-summary" label="Budget totals">
      <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 p-3 shadow-md backdrop-blur-xl 2xl:sticky 2xl:top-2 2xl:z-10">
        <Figure label="Unallocated · available to assign" cents={rain} big accent={rain >= 0} />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-3">
          <Figure label="Income" cents={budget.incomeCents} />
          <Figure label="Planned" cents={budget.plannedCents} />
          <Figure label="Spent" cents={budget.spentCents} />
        <Figure label={budget.budgetVarianceCents < 0 ? 'Over plan' : budget.budgetVarianceCents > 0 ? 'Under plan' : 'On plan'} cents={Math.abs(budget.budgetVarianceCents)} tone={budget.budgetVarianceCents < 0 ? 'bad' : 'good'} />
        </div>
        <Figure label="Assigned" cents={budget.allocatedCents} />
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

      </Tile>

      <Tile id="budget-actions" label="Budget actions and display options">
      <div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={() => setDialog({ kind: 'cover-expenses' })}><ReceiptText className="size-4" /> Cover expenses</Button>
        {buckets.some((bucket) => !bucket.archived && isSavingsBucket(bucket)) && <Button variant="secondary" onClick={() => setDialog({ kind: 'fund-savings' })}><CircleDollarSign className="size-4" /> Fund savings goals</Button>}
        <Button variant="secondary" onClick={() => setDialog({ kind: 'editor', target: { type: 'bucket' } })}><Plus className="size-4" /> New bucket</Button>
        <Button variant="secondary" onClick={() => setDialog({ kind: 'editor', target: { type: 'group' } })}><Users className="size-4" /> New group</Button>
        <div className="ml-1 rounded-lg bg-sunken/60 px-3 py-2 text-xs sm:ml-2 sm:text-sm">
          <span className="font-semibold tabular-nums">{formatCents(totalWant)}</span>{' '}
          <span className="text-muted">planned monthly expenses</span>
        </div>
        <label className="ml-auto flex cursor-pointer items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-xs font-medium text-muted transition hover:bg-sunken/70 hover:text-ink">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            disabled={archivedCount === 0}
          />
          Show archived buckets
          <span className="tabular-nums text-muted-foreground">({archivedCount})</span>
        </label>
      </div>
        <p className="flex items-start gap-1.5 text-xs leading-5 text-muted-foreground">
        <GripVertical className="size-3.5 shrink-0" aria-hidden />
        <span className="2xl:hidden">Use the up and down arrows to reorder on this device. Edit a bucket to change its group.</span>
        <span className="hidden 2xl:inline">Drag the handles to reorder. Drop on a bucket to place before or after it, or drop on a group to move to its end.</span>
      </p>
      </div>
      </Tile>

      {sections.length === 0 && (
        <Tile id="budget-empty" label="No budget groups">
        <p className="py-8 text-center text-muted">
          {archivedCount > 0
            ? 'All buckets are archived. Turn on “Show archived buckets” above to view them.'
            : 'No buckets yet. Create a group, then add buckets to it.'}
        </p>
        </Tile>
      )}

      {sections.map((section) => {
        const { group } = section
        const groupIndex = group ? orderedGroups.findIndex((candidate) => candidate.id === group.id) : -1
        const isCollapsed = collapsed[section.key] ?? false
        const sum = (getValue: (bucket: Bucket) => number) =>
          section.items.reduce((total, bucket) => total + getValue(bucket), 0)
        const groupAvailable = sum(availableOf)
        const groupWant = sum((bucket) => isExpenseBucket(bucket) ? bucket.monthlyTargetCents : 0)
        const groupFunded = sum(inOf)
        const groupExpenseSpent = sum((bucket) => isExpenseBucket(bucket) ? spentOf(bucket) : 0)
        const groupCovered = sum((bucket) => isExpenseBucket(bucket) ? rows.get(bucket.id)?.coveredCents ?? 0 : 0)
        const groupUncovered = sum((bucket) => isExpenseBucket(bucket) ? rows.get(bucket.id)?.uncoveredCents ?? 0 : 0)
        const listItems: ListItemData[] = section.items.map((bucket) => ({
          id: bucket.id,
          title: bucket.name,
        }))

        return (
          <Tile key={section.key} id={`group-${section.key}`} label={`${section.title} group`}>
          <List
            key={section.key}
            aria-label={section.title + ' budget'}
            density="compact"
            filterTabs={[]}
            heightClass="h-auto"
            items={isCollapsed ? [] : listItems}
            emptyMessage={
              isCollapsed
                ? ''
                : draggedBucket && dragOverGroup === section.key
                  ? 'Drop to add this bucket to the end of the group.'
                  : 'No buckets yet. Drop a bucket here or add one with New bucket.'
            }
            className={
              'transition-colors ' +
              (dragOverGroup === section.key ? 'ring-2 ring-accent/30' : '')
            }
            style={dragOverGroup === section.key ? {
              borderColor: 'var(--color-accent)',
              backgroundColor: 'var(--color-accent-soft)',
              boxShadow: '0 0 0 2px color-mix(in srgb, var(--color-accent) 28%, transparent)',
            } : {
              borderColor: 'color-mix(in srgb, var(--color-ink) 20%, var(--color-line))',
            }}
            onDragOver={(event) => allowGroupDrop(event, section)}
            onDragLeave={(event) => {
              if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
                setDragOverGroup(null)
              }
            }}
            onDrop={(event) => dropOnGroup(event, section)}
            headerContent={
              <div className="px-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-1.5">
                    {group && (
                      <button
                        type="button"
                        draggable
                        aria-label={'Drag to reorder ' + group.name}
                        title="Drag this handle to reorder groups"
                        className="hidden size-8 shrink-0 cursor-grab place-items-center rounded-lg text-muted transition hover:bg-sunken hover:text-ink active:cursor-grabbing 2xl:grid"
                        onDragStart={(event) => startGroupDrag(event, group.id)}
                        onDragEnd={endDrag}
                      >
                        <GripVertical className="size-4" aria-hidden />
                      </button>
                    )}
                    {group && <div className="flex shrink-0 2xl:hidden" role="group" aria-label={`Reorder ${group.name}`}>
                      <button type="button" className="grid size-10 place-items-center rounded-lg text-muted hover:bg-sunken disabled:opacity-35" aria-label={`Move ${group.name} up`} title="Move group up" disabled={groupIndex <= 0} onClick={() => moveGroupBy(group.id, -1)}><ArrowUp className="size-4" /></button>
                      <button type="button" className="grid size-10 place-items-center rounded-lg text-muted hover:bg-sunken disabled:opacity-35" aria-label={`Move ${group.name} down`} title="Move group down" disabled={groupIndex < 0 || groupIndex === groups.length - 1} onClick={() => moveGroupBy(group.id, 1)}><ArrowDown className="size-4" /></button>
                    </div>}
                    <button
                      type="button"
                      aria-expanded={!isCollapsed}
                      onClick={() => toggle(section.key)}
                      className="flex min-h-10 min-w-0 items-center gap-1.5 rounded-lg py-0.5 text-left text-sm font-semibold hover:text-accent"
                    >
                      <ChevronDown className={'size-4 shrink-0 text-muted transition-transform ' + (isCollapsed ? '-rotate-90' : '')} aria-hidden />
                      {group && (
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: group.color ?? '#64748b' }}
                          aria-hidden
                        />
                      )}
                      <span className="truncate">{section.title}</span>
                    </button>
                    <span className="shrink-0 rounded-full border border-border bg-sunken px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                      {section.items.length}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right leading-tight">
                      <p className="text-sm font-semibold tabular-nums"><Money cents={groupAvailable} /></p>
                      <p className="text-[11px] text-muted-foreground">available</p>
                    </div>
                    {group && (
                      <button
                        type="button"
                        className="btn-link inline-flex min-h-10 items-center text-sm"
                        aria-label={'Edit group ' + group.name}
                        onClick={() => setDialog({ kind: 'editor', target: { type: 'group', value: group } })}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Planned <strong className="font-semibold text-ink">{formatCents(groupWant)}</strong></span>
                  <span>Assigned <strong className="font-semibold text-ink">{formatCents(groupFunded)}</strong></span>
                  <span>Spent <strong className="font-semibold text-ink">{formatCents(groupExpenseSpent)}</strong></span>
                  <span>Covered <strong className="font-semibold text-ink">{formatCents(groupCovered)}</strong></span>
                  {groupUncovered > 0 && <span className="text-bad">Needs coverage <strong className="font-semibold">{formatCents(groupUncovered)}</strong></span>}
                  <span className={groupWant - groupExpenseSpent < 0 ? 'text-bad' : ''}>{groupWant - groupExpenseSpent < 0 ? 'Over plan' : groupWant - groupExpenseSpent > 0 ? 'Under plan' : 'On plan'} <strong className="font-semibold text-ink">{formatCents(Math.abs(groupWant - groupExpenseSpent))}</strong></span>
                </div>
                {!isCollapsed && section.items.length > 0 && (
                  <div className={`${budgetGridColumns} mt-2 hidden border-y border-border/80 bg-sunken/35 px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground 2xl:grid`}>
                    <span>Bucket</span>
                    <span>Balance</span>
                    <span>In / Out</span>
                    <span>Planned / target</span>
                    <span className="px-2">Activity</span>
                    <span className="text-right">Details</span>
                  </div>
                )}
                {dragOverGroup === section.key && (
                  <p className="mt-1 text-xs font-medium text-accent" aria-live="polite">
                    {draggedGroup ? 'Drop to place this group before ' + section.title + '.' : 'Drop to move the bucket to the end of this group.'}
                  </p>
                )}
              </div>
            }
            renderItem={(item) => {
              const bucket = section.items.find((candidate) => candidate.id === item.id)
              if (!bucket) return null
              const funded = inOf(bucket)
              const spent = spentOf(bucket)
              const bucketMonth = rows.get(bucket.id)
              const isExpanded = expandedBuckets[bucket.id] ?? false
              const available = availableOf(bucket)
              const isDropTarget = dragOverBucket === bucket.id && draggedBucket !== bucket.id

              return (
                <div
                  className={
                    'w-full rounded-lg px-2 py-1 transition-colors ' +
                    (isDropTarget ? '' : 'hover:bg-sunken/70 ') +
                    (bucket.archived ? 'opacity-75 ' : '') +
                    (draggedBucket === bucket.id ? 'opacity-45 ' : '') +
                    (!isDropTarget && section.items.at(-1)?.id !== bucket.id ? 'border-b border-border/60' : '')
                  }
                  style={isDropTarget ? {
                    backgroundColor: 'var(--color-accent-soft)',
                    boxShadow: dragPlacement === 'before'
                      ? 'inset 0 2px 0 var(--color-accent)'
                      : 'inset 0 -2px 0 var(--color-accent)',
                  } : undefined}
                  onDragOver={(event) => allowBucketDrop(event, bucket.id)}
                  onDrop={(event) => dropOnBucket(event, bucket)}
                >
                  <div className={`${budgetGridColumns} px-1`}>
                    <div className="flex min-w-0 items-center gap-2">
                      <button
                        type="button"
                        draggable
                        aria-label={'Drag to reorder ' + bucket.name}
                        title="Drag to reorder. Drop on another bucket to place before or after it, or on a group to move it there."
                        className="hidden size-8 shrink-0 cursor-grab place-items-center rounded-md text-muted transition hover:bg-sunken hover:text-ink active:cursor-grabbing 2xl:grid"
                        onDragStart={(event) => startBucketDrag(event, bucket.id)}
                        onDragEnd={endDrag}
                      >
                        <GripVertical className="size-4" aria-hidden />
                      </button>
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: bucketColor(bucket) }}
                        aria-hidden
                      />
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="truncate text-sm font-semibold" title={bucket.name}>{bucket.name}</span>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {bucket.archived ? 'Archived' : BUCKET_KIND_LABELS[bucket.kind]}
                        </span>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground 2xl:hidden">Balance</span>
                      <p className={`truncate text-sm font-semibold tabular-nums ${available < 0 ? 'text-bad' : ''}`}><Money cents={available} /></p>
                      {!isExpanded && <p
                        className="truncate text-[11px] leading-4 text-muted-foreground"
                        title={`Opening ${formatCents(bucketMonth?.carryoverCents ?? 0)} · Assigned ${formatCents(funded)}`}
                      >
                        Open {formatCents(bucketMonth?.carryoverCents ?? 0)} · Assigned {formatCents(funded)}
                      </p>}
                    </div>
                    <div className="min-w-0">
                      <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground 2xl:hidden">In / Out</span>
                      {!bucket.archived
                        ? <InOutCell name={bucket.name} onSubmit={(cents) => moveInOut(bucket, cents)} />
                        : <span className="text-xs text-muted-foreground">Archived</span>}
                    </div>
                    <div className="min-w-0">
                      <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground 2xl:hidden">{isExpenseBucket(bucket) ? 'Planned' : 'Contribution'}</span>
                      <WantCell key={bucket.id + '-' + bucket.monthlyTargetCents} bucket={bucket} />
                    </div>
                    {!isExpanded && <div className="col-span-2 min-w-0 space-y-1 2xl:col-span-1 2xl:px-2">
                      <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground 2xl:hidden">Activity</span>
                      {isExpenseBucket(bucket) ? (
                        <div title={`Planned ${formatCents(bucket.monthlyTargetCents)} · Spent ${formatCents(spent)} · Covered ${formatCents(bucketMonth?.coveredCents ?? 0)} · Uncovered ${formatCents(bucketMonth?.uncoveredCents ?? 0)}`}>
                          <p className="truncate text-[11px] leading-4 tabular-nums">
                            <span className="text-muted-foreground">Spent </span>{formatCents(spent)}
                            <span className="text-muted-foreground"> · Covered </span>{formatCents(bucketMonth?.coveredCents ?? 0)}
                          </p>
                          {spent > 0 && <ProgressBar pct={(bucketMonth?.coveredCents ?? 0) / spent * 100} over={(bucketMonth?.uncoveredCents ?? 0) > 0} color={bucketColor(bucket)} />}
                          <p className={`truncate text-[10px] ${bucketMonth && bucketMonth.varianceCents < 0 ? 'text-bad' : 'text-muted-foreground'}`}>
                            {bucketMonth?.uncoveredCents ? `${formatCents(bucketMonth.uncoveredCents)} needs coverage` : bucketMonth && bucketMonth.varianceCents < 0 ? `${formatCents(-bucketMonth.varianceCents)} over plan` : `${formatCents(bucket.monthlyTargetCents)} planned`}
                          </p>
                        </div>
                      ) : bucket.monthlyTargetCents > 0 ? (
                        <div title={`Savings assigned ${formatCents(funded)} of ${formatCents(bucket.monthlyTargetCents)} monthly contribution target`}>
                          <p className="truncate text-[11px] leading-4 tabular-nums"><span className="text-muted-foreground">Assigned </span>{formatCents(funded)} / {formatCents(bucket.monthlyTargetCents)}</p>
                          <ProgressBar pct={(funded / bucket.monthlyTargetCents) * 100} over={funded > bucket.monthlyTargetCents} color={bucketColor(bucket)} />
                          <p className="truncate text-[10px] text-muted-foreground">Savings contribution target</p>
                        </div>
                      ) : <p className="truncate text-[11px] text-muted-foreground">Spent {formatCents(spent)} · No monthly target</p>}
                    </div>}
                    {isExpanded && <span className="hidden 2xl:block" aria-hidden="true" />}
                    <div className="col-span-2 flex items-center justify-between gap-2 2xl:col-span-1 2xl:justify-end">
                      <div className="flex 2xl:hidden" role="group" aria-label={`Reorder ${bucket.name}`}>
                        <button type="button" className="grid size-10 place-items-center rounded-lg text-muted hover:bg-sunken disabled:opacity-35" aria-label={`Move ${bucket.name} up`} title="Move bucket up" disabled={section.items[0]?.id === bucket.id} onClick={() => moveBucketBy(bucket.id, section, -1)}><ArrowUp className="size-4" /></button>
                        <button type="button" className="grid size-10 place-items-center rounded-lg text-muted hover:bg-sunken disabled:opacity-35" aria-label={`Move ${bucket.name} down`} title="Move bucket down" disabled={section.items.at(-1)?.id === bucket.id} onClick={() => moveBucketBy(bucket.id, section, 1)}><ArrowDown className="size-4" /></button>
                      </div>
                      <button
                        type="button"
                        className="btn-link inline-flex min-h-10 items-center text-xs"
                        aria-label={'Edit ' + bucket.name}
                        onClick={() => setDialog({ kind: 'editor', target: { type: 'bucket', value: bucket } })}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-link inline-flex min-h-10 items-center whitespace-nowrap text-xs"
                        aria-label={(isExpanded ? 'Hide' : 'Show') + ' calculation for ' + bucket.name}
                        aria-expanded={isExpanded}
                        aria-controls={'bucket-details-' + bucket.id}
                        onClick={() => toggleBucketDetails(bucket.id)}
                      >
                        {isExpanded ? 'Hide' : 'Details'}
                      </button>
                    </div>
                  </div>

                  {isDropTarget && (
                    <p className="mt-1 text-right text-xs font-medium text-accent" aria-live="polite">
                      Drop to place {dragPlacement} this bucket
                    </p>
                  )}

                  {isExpanded && bucketMonth && (
                    <div id={'bucket-details-' + bucket.id} className="mt-3 border-t border-foreground/20 pt-3">
                      <BucketBreakdown
                        bucket={bucket}
                        row={bucketMonth}
                        month={month}
                        groupName={groups.find((candidate) => candidate.id === bucket.groupId)?.name ?? 'Ungrouped'}
                      />
                    </div>
                  )}
                </div>
              )
            }}
          />
          </Tile>
        )
      })}
      </TileBoard>
      {(dialog?.kind === 'cover-expenses' || dialog?.kind === 'fund-savings') && <FundingDialog month={month} purpose={dialog.kind} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'editor' && (
        <div className="card p-4">
          <BudgetEditor key={dialog.target.value?.id ?? 'new'} target={dialog.target} onClose={() => setDialog(null)} />
        </div>
      )}
    </div>
  )
}

export function BudgetSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading budget">
      <span className="sr-only">Loading your budget…</span>
      <Card className="flex flex-wrap items-center gap-x-6 gap-y-3 p-3">
        <div className="space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-7 w-36" /></div>
        <div className="space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-5 w-24" /></div>
        <div className="space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-5 w-24" /></div>
        <div className="ml-auto flex items-center gap-2"><Skeleton className="h-9 w-40 rounded-lg" /><Skeleton className="h-8 w-12" /></div>
      </Card>

      <div className="flex flex-wrap items-center gap-2" aria-hidden="true">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
        <Skeleton className="ml-auto h-5 w-28" />
      </div>

      {[3, 2, 2].map((bucketCount, groupIndex) => (
        <Card key={groupIndex} className="space-y-2 p-2.5" aria-hidden="true">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Skeleton className="size-4 rounded" /><Skeleton className="size-2.5 rounded-full" /><Skeleton className="h-4 w-28" /></div>
            <div className="flex items-center gap-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-8" /></div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Skeleton className="h-3 w-36" /><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-28" />
          </div>
          <div className={`${budgetGridColumns} hidden border-y border-border/80 bg-sunken/35 px-2 py-1.5 2xl:grid`}>
            {['w-24', 'w-20', 'w-16', 'w-14', 'w-20', 'w-12'].map((width, index) => <Skeleton key={index} className={`h-2.5 ${width}`} />)}
          </div>
          <div>
            {Array.from({ length: bucketCount }, (_, rowIndex) => (
              <div key={rowIndex} className={`${budgetGridColumns} border-b border-border/60 px-1 py-2`}>
                <div className="flex min-w-0 items-center gap-1.5"><Skeleton className="hidden size-4 rounded 2xl:block" /><Skeleton className="size-2.5 shrink-0 rounded-full" /><Skeleton className="h-3.5 w-24 max-w-full" /><Skeleton className="hidden h-2.5 w-16 2xl:block" /></div>
                <Skeleton className="h-7 w-24 max-w-full" />
                <Skeleton className="h-7 w-full max-w-28" />
                <Skeleton className="h-7 w-20 max-w-full" />
                <div className="col-span-2 space-y-1 2xl:col-span-1"><Skeleton className="h-2.5 w-40 max-w-full" /><Skeleton className="h-1.5 w-24 max-w-full rounded-full" /></div>
                <div className="col-span-2 flex justify-between gap-2 2xl:col-span-1 2xl:justify-end"><Skeleton className="h-10 w-20 rounded-lg 2xl:hidden" /><div className="ml-auto flex gap-2"><Skeleton className="h-3 w-8" /><Skeleton className="h-3 w-12" /></div></div>
              </div>
            ))}
          </div>
        </Card>
      ))}
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

  const expenseBucket = isExpenseBucket(bucket)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-semibold">{bucket.name}: month calculation</h3>
          <p className="text-sm text-muted-foreground">{groupName} · {BUCKET_KIND_LABELS[bucket.kind]} · {monthLabel(month)}</p>
        </div>
        <p className="text-xs text-muted">Net funded includes assignments and bucket moves.</p>
      </div>

      <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <BreakdownValue label={expenseBucket ? 'Planned' : 'Monthly contribution target'} cents={expenseBucket ? row.plannedCents : bucket.monthlyTargetCents} />
        <BreakdownValue label="Spent" cents={row.spentCents} />
        {expenseBucket ? <>
          <BreakdownValue label="Covered" cents={row.coveredCents} />
          <BreakdownValue label="Uncovered" cents={row.uncoveredCents} />
          <BreakdownValue label={row.varianceCents < 0 ? 'Over plan' : 'Under plan'} cents={Math.abs(row.varianceCents)} />
        </> : <BreakdownValue label="Assigned this month" cents={netFunding} />}
        <BreakdownValue label="Carryover" cents={row.carryoverCents} />
        <BreakdownValue label="Assigned" cents={row.allocatedCents} />
        <BreakdownValue label="Moved in" cents={row.movedInCents} />
        <BreakdownValue label="Moved out" cents={row.movedOutCents} />
        <BreakdownValue label="Spent" cents={row.spentCents} />
        <BreakdownValue label="Available at month end" cents={row.availableCents} strong />
      </dl>

      <p className="rounded-lg border border-foreground/20 bg-surface px-3 py-2 text-sm text-muted-foreground">
        {formatCents(row.carryoverCents)} carryover + {formatCents(row.allocatedCents)} assigned + {formatCents(row.movedInCents)} moved in − {formatCents(row.movedOutCents)} moved out − {formatCents(row.spentCents)} spent = <strong className="text-ink">{formatCents(row.availableCents)}</strong> available.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-foreground/20 bg-surface p-3">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs font-medium text-muted">{expenseBucket ? 'Planned spending' : 'Monthly contribution target'}</p><p className="mt-1 text-lg font-semibold tabular-nums">{formatCents(bucket.monthlyTargetCents)}</p></div>
            <div className="text-right"><p className="text-xs text-muted">{expenseBucket ? 'Actual spending' : 'Assigned this month'}</p><p className="mt-1 text-sm font-semibold tabular-nums">{formatCents(expenseBucket ? row.spentCents : netFunding)}</p></div>
          </div>
          {expenseBucket ? <>
            <ProgressBar pct={row.spentCents > 0 ? row.coveredCents / row.spentCents * 100 : 0} over={row.uncoveredCents > 0} color={bucketColor(bucket)} />
            <p className={`mt-1 text-xs ${row.varianceCents < 0 ? 'text-bad' : 'text-muted'}`}>
              {row.uncoveredCents > 0 ? `${formatCents(row.uncoveredCents)} of spending still needs coverage` : row.varianceCents < 0 ? `${formatCents(-row.varianceCents)} over plan` : row.varianceCents > 0 ? `${formatCents(row.varianceCents)} under plan` : 'On plan'}
            </p>
          </> : bucket.monthlyTargetCents > 0 ? <>
            <ProgressBar pct={netFunding / bucket.monthlyTargetCents * 100} over={netFunding > bucket.monthlyTargetCents} color={bucketColor(bucket)} />
            <p className="mt-1 text-xs text-muted">{netFunding > bucket.monthlyTargetCents ? `${formatCents(netFunding - bucket.monthlyTargetCents)} above target` : netFunding === bucket.monthlyTargetCents ? 'Contribution target met' : `${formatCents(bucket.monthlyTargetCents - netFunding)} left to assign`}</p>
          </> : <p className="mt-2 text-xs text-muted">Set a monthly contribution target for this savings goal.</p>}
        </div>

        {hasGoal ? <div className="rounded-xl border border-foreground/20 bg-surface p-3">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs font-medium text-muted">Goal balance</p><p className="mt-1 text-lg font-semibold tabular-nums">{formatCents(row.availableCents)} <span className="text-sm font-normal text-muted">of {formatCents(bucket.targetCents!)}</span></p></div>
            {bucket.targetDate && <div className="text-right"><p className="text-xs text-muted">Target date</p><p className="mt-1 text-sm font-medium">{dateLabel(bucket.targetDate)}</p></div>}
          </div>
          <ProgressBar pct={goalProgress} over={goalProgress > 100} color={bucketColor(bucket)} />
          <p className="mt-1 text-xs text-muted">
            {goalRemaining > 0 ? `${Math.round(goalProgress)}% funded · ${formatCents(goalRemaining)} remaining`
              : goalRemaining === 0 ? 'Goal reached'
                : `${Math.round(goalProgress)}% funded · ${formatCents(-goalRemaining)} above goal`}
          </p>
        </div> : bucket.kind === 'save_until_date' && bucket.targetDate ? <div className="rounded-xl border border-foreground/20 bg-surface p-3">
          <p className="text-xs font-medium text-muted">{targetDatePassed ? 'Available this month' : 'Projected at target date'}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{formatCents(targetDatePassed ? row.availableCents : projectedAtTarget)}</p>
          {targetDatePassed
            ? <p className="mt-1 text-xs text-muted">Target date was {dateLabel(bucket.targetDate)}.</p>
            : <p className="mt-1 text-xs text-muted">Assuming no spending or withdrawals: {formatCents(bucket.monthlyTargetCents)} per month for {futureDeposits} future {futureDeposits === 1 ? 'deposit' : 'deposits'} through {dateLabel(bucket.targetDate)}.</p>}
        </div> : <div className="rounded-xl border border-dashed border-foreground/20 p-3">
          <p className="text-xs font-medium text-muted">No balance goal set</p>
          <p className="mt-1 text-xs text-muted">This bucket keeps its available balance until you move or spend it.</p>
        </div>}
      </div>
    </div>
  )
}

function BreakdownValue({ label, cents, strong = false }: { label: string; cents: number; strong?: boolean }) {
  return <div className="rounded-lg bg-surface px-3 py-2">
    <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
    <dd className={`mt-1 text-sm tabular-nums ${strong ? 'font-semibold' : 'font-medium'}`}><Money cents={cents} /></dd>
  </div>
}

function monthIndex(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  return year * 12 + monthNumber - 1
}

function Figure({ label, cents, big = false, accent = false, tone }: {
  label: string
  cents: number
  big?: boolean
  accent?: boolean
  tone?: 'good' | 'bad'
}) {
  return (
    <div>
      <div className={`${big ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'} font-semibold`}>
        <Money cents={cents} className={tone === 'bad' ? 'text-bad' : tone === 'good' || accent ? 'text-good' : ''} />
      </div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  )
}

function InOutCell({ name, onSubmit }: { name: string; onSubmit: (cents: number) => Promise<string | null> }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!value.trim() || busy) return
    const cents = parseSignedDollars(value)
    if (cents === null) {
      setError('Invalid amount')
      return
    }
    setBusy(true)
    const problem = await onSubmit(cents)
    setBusy(false)
    if (problem) setError(problem)
    else {
      setError('')
      setValue('')
    }
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1">
        <input
          aria-label={`Put in or take out of ${name}`}
          title="Enter a positive amount to assign, or a negative amount to return to available money."
          className="min-h-10 min-w-0 flex-1 rounded-md border border-foreground/20 bg-surface px-2 py-2 text-right text-sm tabular-nums outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25 2xl:min-h-0 2xl:py-1"
          inputMode="decimal"
          autoComplete="off"
          placeholder="+/− amount"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError('') }}
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
        />
        <button
          type="button"
          aria-label={`Apply amount for ${name}`}
          title="Apply amount"
          className="grid size-10 shrink-0 place-items-center rounded-md border border-foreground/20 text-foreground transition hover:border-accent hover:bg-accent-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 2xl:size-8"
          disabled={!value.trim() || busy}
          onClick={() => void submit()}
        >
          {busy ? <span className="size-3 animate-spin rounded-full border-2 border-line border-t-accent" aria-hidden /> : <Check className="size-3.5" aria-hidden />}
        </button>
      </div>
      {error && <div className="mt-0.5 text-right text-xs leading-4 text-bad">{error}</div>}
    </div>
  )
}

function WantCell({ bucket }: { bucket: Bucket }) {
  const updateBucket = useLedger((s) => s.updateBucket)
  const original = bucket.monthlyTargetCents ? centsToInput(bucket.monthlyTargetCents) : ''
  const [value, setValue] = useState(original)
  const [error, setError] = useState('')

  async function save() {
    const trimmed = value.trim()
    const cents = trimmed === '' ? 0 : parseDollars(trimmed)
    if (cents === null) {
      setError('Enter a valid monthly target, such as 300 or 12.50.')
      return
    }
    if (cents === bucket.monthlyTargetCents) {
      setError('')
      return
    }
    const saved = await updateBucket(bucket.id, { monthlyTargetCents: cents })
      setError(saved ? '' : useLedger.getState().error ?? 'Could not update the monthly target.')
  }

  return (
    <div className="min-w-0">
      <div className={`flex min-h-10 min-w-0 items-center justify-end gap-0.5 rounded-md border bg-surface px-1.5 py-0.5 transition-colors hover:border-muted focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25 2xl:min-h-0 ${error ? 'border-bad/60' : 'border-foreground/20'}`}>
        <span className="text-xs text-muted" aria-hidden>$</span>
        <input
          aria-label={`${isExpenseBucket(bucket) ? 'Planned monthly spending' : 'Monthly contribution target'} for ${bucket.name}`}
          aria-invalid={Boolean(error)}
          title="Edit the monthly plan or contribution target. Press Enter or leave the field to save."
          className="w-[4.5rem] min-w-0 bg-transparent py-2 text-right text-sm tabular-nums outline-none placeholder:text-muted/70 2xl:py-0.5"
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError('') }}
          onBlur={() => void save()}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </div>
      {error && <p role="alert" className="mt-1 text-[10px] leading-4 text-bad">{error}</p>}
    </div>
  )
}

function FundingDialog({ month, purpose, onClose }: { month: string; purpose: 'cover-expenses' | 'fund-savings'; onClose: () => void }) {
  const buckets = useLedger((s) => s.buckets)
  const events = useLedger((s) => s.events)
  const addEvents = useLedger((s) => s.addEvents)
  const [busy, setBusy] = useState(false)

  const coveringExpenses = purpose === 'cover-expenses'
  const plan = useMemo(() => coveringExpenses
    ? planExpenseCoverage(events, buckets, month)
    : planSavingsFunding(events, buckets.filter((bucket) => !bucket.archived && isSavingsBucket(bucket)), month),
  [events, buckets, month, coveringExpenses])
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
          description: coveringExpenses ? 'Expense coverage' : 'Savings contribution',
        }),
      ),
    )
    setBusy(false)
    if (ok) onClose()
  }

  return (
    <Modal title={`${coveringExpenses ? 'Cover expenses' : 'Fund savings goals'} · ${monthLabel(month)}`} onClose={onClose}>
      {plan.steps.length === 0 ? (
        <div className="space-y-3 text-sm text-muted">
          <p>{plan.shortfallCents > 0
            ? coveringExpenses
              ? `${formatCents(plan.shortfallCents)} of recorded expenses still need coverage, but there is no available money to assign right now.`
              : `${formatCents(plan.shortfallCents)} of savings contribution targets remain, but there is no available money to assign right now.`
            : coveringExpenses
              ? 'All recorded expenses are already covered, or there are no expenses assigned to expense buckets for this month. Planned amounts alone are not assigned.'
              : 'No savings contribution targets need funding this month. You can still assign money to a savings goal directly from its bucket.'}</p>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted">{coveringExpenses
            ? 'Assigns only the uncovered amounts of recorded expenses. This can exceed a bucket’s plan and won’t fund unused targets.'
            : 'Assigns money to configured savings contribution targets. Expense buckets are not included.'}</p>
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
              Available money is short by {formatCents(plan.shortfallCents)}. Items are handled in the order shown on the Budget screen.
            </p>
          )}
          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={busy} onClick={confirm}>
              {busy ? 'Saving…' : coveringExpenses ? 'Cover listed expenses' : 'Assign savings contributions'}
            </button>
            <button className="btn" onClick={onClose}>Cancel</button>
          </div>
        </div>
      )}
    </Modal>
  )
}
