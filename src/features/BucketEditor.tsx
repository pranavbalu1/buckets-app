import { useState } from 'react'
import Field from '../components/Field'
import Modal from '../components/Modal'
import { centsToInput, parseDollars } from '../domain/money'
import { BUCKET_COLORS, BUCKET_KINDS, BUCKET_KIND_LABELS, bucketColor } from '../domain/models'
import type { Bucket, BucketKind } from '../domain/models'
import { useLedger } from '../storage/store'

export default function BucketEditor({ bucket, onClose }: { bucket?: Bucket; onClose: () => void }) {
  const groups = useLedger((s) => s.groups)
  const bucketCount = useLedger((s) => s.buckets.length)
  const addBucket = useLedger((s) => s.addBucket)
  const updateBucket = useLedger((s) => s.updateBucket)

  const [name, setName] = useState(bucket?.name ?? '')
  const [groupId, setGroupId] = useState(bucket?.groupId ?? '')
  const [kind, setKind] = useState<BucketKind>(bucket?.kind ?? 'spending')
  const [want, setWant] = useState(bucket?.monthlyTargetCents ? centsToInput(bucket.monthlyTargetCents) : '')
  const [color, setColor] = useState(bucket ? bucketColor(bucket) : BUCKET_COLORS[bucketCount % BUCKET_COLORS.length])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Give the bucket a name')
      return
    }
    const cents = want.trim() === '' ? 0 : parseDollars(want)
    if (cents === null) {
      setError('Want must be an amount like 300 or 12.50')
      return
    }
    const values = { name: trimmed, groupId: groupId || null, kind, monthlyTargetCents: cents, color }
    setBusy(true)
    const ok = bucket ? await updateBucket(bucket.id, values) : await addBucket(values)
    setBusy(false)
    if (ok) onClose()
  }

  async function toggleArchive() {
    if (bucket && (await updateBucket(bucket.id, { archived: !bucket.archived }))) onClose()
  }

  return (
    <Modal title={bucket ? 'Edit bucket' : 'New bucket'} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Name">
          <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

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

        <Field label="Want per month (optional)">
          <input className="input" inputMode="decimal" placeholder="0.00" value={want}
            onChange={(e) => setWant(e.target.value)} />
        </Field>

        <div>
          <div className="mb-1 text-xs font-medium text-muted">Color</div>
          <div className="flex flex-wrap gap-2">
            {BUCKET_COLORS.map((c) => (
              <button key={c} type="button" aria-label={`Color ${c}`} aria-pressed={color === c}
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full ring-offset-2 ring-offset-surface ${
                  color === c ? 'ring-2 ring-ink' : ''
                }`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-bad">{error}</p>}

        <div className="flex flex-wrap items-center gap-2">
          <button disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save'}</button>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          {bucket && (
            <button type="button" className="btn-link ml-auto" onClick={toggleArchive}>
              {bucket.archived ? 'Restore bucket' : 'Archive bucket'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  )
}