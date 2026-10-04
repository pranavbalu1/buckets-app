import { useMemo, useState } from 'react'
import Modal from '../components/Modal'
import Money from '../components/Money'
import ProgressBar from '../components/ProgressBar'
import { computeBalances } from '../domain/balances'
import { computeMonthBudget, maxAllocatable, maxReturnable, planRain } from '../domain/budget'
import { addMonths, currentMonth, monthLabel, todayString } from '../domain/dates'
import { makeEvent } from '../domain/events'
import { centsToInput, formatCents, parseDollars, parseSignedDollars } from '../domain/money'
import { BUCKET_KIND_LABELS, bucketColor } from '../domain/models'
import type { Bucket, BucketGroup } from '../domain/models'
import { useLedger } from '../storage/store'
import BucketEditor from './BucketEditor'
import GroupEditor from './GroupEditor'

type Dialog =
  | { kind: 'rain' }
  | { kind: 'bucket'; bucket?: Bucket }
  | { kind: 'group'; group?: BucketGroup }
  | null

type Section = { key: string; title: string; group: BucketGroup | null; items: Bucket[] }

const TABLE_HEAD = (
  <>
    <colgroup>
      <col />
      <col className="w-28" />
      <col className="w-32" />
      <col className="w-28" />
      <col className="w-24" />
      <col className="w-28" />
      <col className="w-44" />
      <col className="w-14" />
    </colgroup>
    <thead>
      <tr className="text-xs text-muted">
        <th className="px-3 py-2 text-left font-medium"><span className="sr-only">Bucket</span></th>
        <th className="px-3 py-2 text-right font-medium">Balance</th>
        <th className="px-3 py-2 text-center font-medium">In / Out</th>
        <th className="px-3 py-2 text-right font-medium">Want</th>
        <th className="px-3 py-2 text-right font-medium">In</th>
        <th className="px-3 py-2 text-right font-medium">Activity</th>
        <th className="px-3 py-2 text-left font-medium">Details</th>
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

  const budget = useMemo(
    () => computeMonthBudget(events, buckets.map((b) => b.id), month),
    [events, buckets, month],
  )
  const bank = useMemo(() => {
    const b = computeBalances(events, `${month}-31`)
    return Object.values(b.accounts).reduce((a, c) => a + c, 0)
  }, [events, month])
  const maxAssign = useMemo(() => maxAllocatable(events, month), [events, month])

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

  /** Positive cents put money in from Rain; negative takes it back. Returns an error message or null. */
  async function moveInOut(bucket: Bucket, cents: number): Promise<string | null> {
    if (cents > 0 && cents > maxAssign) return `Only ${formatCents(maxAssign)} in Rain`
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
      <div className="card sticky top-0 z-10 flex flex-wrap items-center gap-x-8 gap-y-3 p-4">
        <Figure label="Rain" cents={rain} big accent={rain >= 0} />
        <div className="flex items-center gap-4">
          <Figure label="Income" cents={budget.incomeCents} />
          <span className="text-muted">−</span>
          <Figure label="Expenses" cents={budget.spentCents} />
          <span className="text-muted">=</span>
          <Figure label="Month's gain" cents={budget.incomeCents - budget.spentCents} />
        </div>
        <Figure label="In the bank" cents={bank} />

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
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-primary" onClick={() => setDialog({ kind: 'rain' })}>Make it rain!</button>
        <button className="btn" onClick={() => setDialog({ kind: 'bucket' })}>New bucket</button>
        <button className="btn" onClick={() => setDialog({ kind: 'group' })}>New group</button>
        <div className="ml-2 text-sm">
          <span className="font-semibold tabular-nums">{formatCents(totalWant)}</span>{' '}
          <span className="text-muted">Rain / month</span>
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm text-muted">
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
          <section key={s.key} className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[62rem] table-fixed text-sm">
                {TABLE_HEAD}
                <tbody>
                  <tr className="bg-sunken font-medium">
                    <td className="px-3 py-2">
                      <button aria-expanded={!isCollapsed} onClick={() => toggle(s.key)}
                        className="flex items-center gap-2">
                        <span aria-hidden className="w-4 text-center text-muted">{isCollapsed ? '+' : '−'}</span>
                        {s.title}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right"><Money cents={sum(availableOf)} /></td>
                    <td />
                    <td className="px-3 py-2 text-right tabular-nums">{formatCents(sum((b) => b.monthlyTargetCents))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCents(groupIn)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCents(-groupSpent)}</td>
                    <td />
                    <td className="px-2 text-right">
                      {group && (
                        <button className="btn-link" aria-label={`Edit group ${group.name}`}
                          onClick={() => setDialog({ kind: 'group', group })}>Edit</button>
                      )}
                    </td>
                  </tr>

                  {!isCollapsed && s.items.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-3 text-muted">No buckets in this group yet.</td></tr>
                  )}

                  {!isCollapsed && s.items.map((b) => {
                    const funded = inOf(b)
                    const spent = spentOf(b)
                    return (
                      <tr key={b.id} className={`border-t border-line ${b.archived ? 'opacity-60' : ''}`}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2.5">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: bucketColor(b) }} />
                            <span className="truncate font-medium">{b.name}</span>
                            {b.archived && <span className="text-xs text-muted">archived</span>}
                            {b.kind !== 'spending' && (
                              <span className="rounded-full bg-sunken px-2 py-0.5 text-xs text-muted">
                                {BUCKET_KIND_LABELS[b.kind]}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-medium"><Money cents={availableOf(b)} /></td>
                        <td className="px-1 py-1 align-top">
                          {!b.archived && <InOutCell name={b.name} onSubmit={(c) => moveInOut(b, c)} />}
                        </td>
                        <td className="px-1 py-1 align-top">
                          <WantCell key={`${b.id}-${b.monthlyTargetCents}`} bucket={b} />
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted">
                          {funded === 0 ? '—' : formatCents(funded)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted">
                          {spent === 0 ? '—' : formatCents(-spent)}
                        </td>
                        <td className="px-3 py-2">
                          {b.monthlyTargetCents > 0 ? (
                            <div className="space-y-1">
                              <ProgressBar pct={(funded / b.monthlyTargetCents) * 100} />
                              <div className="text-xs text-muted">
                                {formatCents(Math.max(0, funded))} of {formatCents(b.monthlyTargetCents)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="px-2 text-right">
                          <button className="btn-link" aria-label={`Edit ${b.name}`}
                            onClick={() => setDialog({ kind: 'bucket', bucket: b })}>Edit</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}

      {dialog?.kind === 'rain' && <RainDialog month={month} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'bucket' && (
        <BucketEditor key={dialog.bucket?.id ?? 'new'} bucket={dialog.bucket} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'group' && (
        <GroupEditor key={dialog.group?.id ?? 'new'} group={dialog.group} onClose={() => setDialog(null)} />
      )}
    </div>
  )
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