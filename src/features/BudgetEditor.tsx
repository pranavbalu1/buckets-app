import { useState } from 'react'
import Field from '../components/Field'
import { Modal } from '../components/ui/modal'
import { centsToInput, parseDollars } from '../domain/money'
import {
  BUCKET_COLORS,
  BUCKET_KIND_DESCRIPTIONS,
  BUCKET_KIND_LABELS,
  BUCKET_KINDS,
  bucketColor,
} from '../domain/models'
import type { Bucket, BucketGroup, BucketKind } from '../domain/models'
import { useLedger } from '../storage/store'

type EditorTarget =
  | { type: 'bucket'; value?: Bucket }
  | { type: 'group'; value?: BucketGroup }

export default function BudgetEditor({ target, onClose }: { target: EditorTarget; onClose: () => void }) {
  return target.type === 'bucket'
    ? <BucketForm bucket={target.value} onClose={onClose} />
    : <GroupForm group={target.value} onClose={onClose} />
}

function BucketForm({ bucket, onClose }: { bucket?: Bucket; onClose: () => void }) {
  const groups = useLedger((s) => s.groups)
  const bucketCount = useLedger((s) => s.buckets.length)
  const addBucket = useLedger((s) => s.addBucket)
  const updateBucket = useLedger((s) => s.updateBucket)
  const removeBucket = useLedger((s) => s.removeBucket)
  const initialKind = bucket && BUCKET_KINDS.includes(bucket.kind as BucketKind) ? bucket.kind as BucketKind : 'plain'
  const [name, setName] = useState(bucket?.name ?? '')
  const [groupId, setGroupId] = useState(bucket?.groupId ?? '')
  const [kind, setKind] = useState<BucketKind>(initialKind)
  const [monthly, setMonthly] = useState(bucket?.monthlyTargetCents ? centsToInput(bucket.monthlyTargetCents) : '')
  const [target, setTarget] = useState(bucket?.targetCents ? centsToInput(bucket.targetCents) : '')
  const [date, setDate] = useState(bucket?.targetDate ?? '')
  const [color, setColor] = useState(bucket ? bucketColor(bucket) : BUCKET_COLORS[bucketCount % BUCKET_COLORS.length])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return setError('Give the bucket a name')
    const monthlyCents = parseOptional(monthly)
    const targetCents = parseOptional(target)
    if (monthlyCents === null || targetCents === null) return setError('Amounts must look like 300 or 12.50')
    if (kind === 'save_by_date' && (!targetCents || !date)) return setError('Add a target amount and date')
    if (kind === 'save_by_deposit' && (!targetCents || !monthlyCents)) return setError('Add a target amount and monthly deposit')
    if (kind === 'save_until_date' && (!monthlyCents || !date)) return setError('Add a monthly amount and target date')
    const values = {
      name: trimmed,
      groupId: groupId || null,
      kind,
      monthlyTargetCents: kind === 'recurring' || kind === 'save_until_date' || kind === 'save_by_deposit' ? monthlyCents : 0,
      targetCents: kind === 'save_by_date' || kind === 'save_by_deposit' ? targetCents : null,
      targetDate: kind === 'save_by_date' || kind === 'save_until_date' ? date || null : null,
      color,
    }
    setBusy(true)
    const ok = bucket ? await updateBucket(bucket.id, values) : await addBucket(values)
    setBusy(false)
    if (ok) onClose()
  }

  async function archive() {
    if (bucket && await updateBucket(bucket.id, { archived: !bucket.archived })) onClose()
  }

  async function remove() {
    if (!bucket || !window.confirm(`Delete “${bucket.name}”? This cannot be undone.`)) return
    if (await removeBucket(bucket.id)) onClose()
  }

  return (
    <Modal title={bucket ? 'Edit bucket' : 'New bucket'} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Name"><input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Group">
            <select className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">No group</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
          <Field label="Type">
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value as BucketKind)}>
              {BUCKET_KINDS.map((k) => <option key={k} value={k}>{BUCKET_KIND_LABELS[k]}</option>)}
            </select>
          </Field>
        </div>
        <p className="rounded-lg bg-sunken px-3 py-2 text-xs text-muted">{BUCKET_KIND_DESCRIPTIONS[kind]}</p>
        {kind === 'recurring' && <MoneyField label="Monthly amount" value={monthly} onChange={setMonthly} />}
        {kind === 'save_by_date' && <><MoneyField label="Target amount" value={target} onChange={setTarget} /><DateField value={date} onChange={setDate} /></>}
        {kind === 'save_by_deposit' && <><MoneyField label="Target amount" value={target} onChange={setTarget} /><MoneyField label="Monthly deposit" value={monthly} onChange={setMonthly} /></>}
        {kind === 'save_until_date' && <><MoneyField label="Monthly deposit" value={monthly} onChange={setMonthly} /><DateField value={date} onChange={setDate} /></>}
        <ColorPicker value={color} onChange={setColor} />
        {error && <p className="text-sm text-bad">{error}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save'}</button>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          {bucket && <><button type="button" className="btn-link ml-auto" onClick={archive}>{bucket.archived ? 'Restore bucket' : 'Archive bucket'}</button><button type="button" className="btn-link text-bad" onClick={remove}>Delete</button></>}
        </div>
      </form>
    </Modal>
  )
}

function GroupForm({ group, onClose }: { group?: BucketGroup; onClose: () => void }) {
  const addGroup = useLedger((s) => s.addGroup)
  const updateGroup = useLedger((s) => s.updateGroup)
  const removeGroup = useLedger((s) => s.removeGroup)
  const [name, setName] = useState(group?.name ?? '')
  const [color, setColor] = useState(group?.color ?? BUCKET_COLORS[0])
  const [busy, setBusy] = useState(false)
  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    const ok = group ? await updateGroup(group.id, { name: name.trim(), color }) : await addGroup(name.trim(), color)
    setBusy(false)
    if (ok) onClose()
  }
  async function remove() {
    if (group && window.confirm(`Delete “${group.name}”? Its buckets will become ungrouped.`) && await removeGroup(group.id)) onClose()
  }
  return <Modal title={group ? 'Edit group' : 'New group'} onClose={onClose}>
    <form onSubmit={save} className="space-y-4">
      <Field label="Group name"><input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <ColorPicker value={color} onChange={setColor} />
      <div className="flex gap-2"><button disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save'}</button><button type="button" className="btn" onClick={onClose}>Cancel</button>{group && <button type="button" className="btn-link ml-auto text-bad" onClick={remove}>Delete group</button>}</div>
    </form>
  </Modal>
}

function MoneyField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <Field label={label}><input className="input" inputMode="decimal" placeholder="0.00" value={value} onChange={(e) => onChange(e.target.value)} /></Field>
}
function DateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <Field label="Target date"><input className="input" type="date" value={value} onChange={(e) => onChange(e.target.value)} /></Field>
}
function ColorPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div><div className="mb-1 text-xs font-medium text-muted">Color</div><div className="flex flex-wrap gap-2">{BUCKET_COLORS.map((c) => <button key={c} type="button" aria-label={`Color ${c}`} aria-pressed={value === c} onClick={() => onChange(c)} className={`h-7 w-7 rounded-full ring-offset-2 ring-offset-surface ${value === c ? 'ring-2 ring-ink' : ''}`} style={{ backgroundColor: c }} />)}</div></div>
}
function parseOptional(value: string) {
  return value.trim() === '' ? 0 : parseDollars(value)
}
