import { useMemo, useState } from 'react'
import { computeBalances } from '../domain/balances'
import { formatCents } from '../domain/money'
import type { Bucket, BucketGroup, BucketKind } from '../domain/models'
import { useLedger } from '../storage/store'
import { BUCKET_KINDS, BUCKET_KIND_LABELS as KIND_LABELS } from '../domain/models'

export default function Buckets() {
  const { groups, buckets, events, addGroup, addBucket } = useLedger()
  const balances = useMemo(() => computeBalances(events), [events])

  const [groupName, setGroupName] = useState('')
  const [name, setName] = useState('')
  const [kind, setKind] = useState<BucketKind>('spending')
  const [groupId, setGroupId] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const visible = buckets.filter((b) => showArchived || !b.archived)
  const sections: { key: string; title: string; items: Bucket[] }[] = [
    ...groups.map((g) => ({ key: g.id, title: g.name, items: visible.filter((b) => b.groupId === g.id) })),
    { key: 'none', title: 'Ungrouped', items: visible.filter((b) => !b.groupId) },
  ].filter((s) => s.items.length > 0)

  async function submitGroup(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = groupName.trim()
    if (!trimmed) return
    await addGroup(trimmed)
    setGroupName('')
  }

  async function submitBucket(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    await addBucket({ name: trimmed, kind, groupId: groupId || null })
    setName('')
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Buckets</h2>

      <form onSubmit={submitGroup} className="flex gap-2">
        <input className="flex-1 rounded border p-2" placeholder="New group (e.g. Food, Transportation)"
          value={groupName} onChange={(e) => setGroupName(e.target.value)} />
        <button className="rounded border px-4 py-2">Add group</button>
      </form>

      <form onSubmit={submitBucket} className="flex flex-wrap gap-2">
        <input className="min-w-40 flex-1 rounded border p-2" placeholder="New bucket name"
          value={name} onChange={(e) => setName(e.target.value)} />
        <select aria-label="Group for new bucket" className="rounded border p-2" value={kind} onChange={(e) => setKind(e.target.value as BucketKind)}>
          {BUCKET_KINDS.map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
        </select>
        <select aria-label="Group for new bucket" className="rounded border p-2" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">No group</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <button className="rounded bg-black px-4 py-2 text-white">Add bucket</button>
      </form>

      {sections.length === 0 && <p className="text-gray-500">No buckets yet.</p>}
      {sections.map((s) => (
        <section key={s.key}>
          <h3 className="mb-1 font-medium text-gray-600">{s.title}</h3>
          <ul className="divide-y rounded border">
            {s.items.map((b) => (
              <BucketRow key={b.id} bucket={b} groups={groups} balance={balances.buckets[b.id] ?? 0} />
            ))}
          </ul>
        </section>
      ))}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        Show archived
      </label>
    </div>
  )
}

function BucketRow({ bucket, groups, balance }: { bucket: Bucket; groups: BucketGroup[]; balance: number }) {
  const updateBucket = useLedger((s) => s.updateBucket)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(bucket.name)

  async function save() {
    const trimmed = name.trim()
    if (trimmed && trimmed !== bucket.name) await updateBucket(bucket.id, { name: trimmed })
    setEditing(false)
  }

  return (
    <li className={`flex flex-wrap items-center gap-3 p-3 ${bucket.archived ? 'opacity-50' : ''}`}>
      <div className="min-w-32 flex-1">
        {editing ? (
          <input autoFocus className="rounded border p-1" value={name}
            onChange={(e) => setName(e.target.value)} onBlur={save}
            onKeyDown={(e) => e.key === 'Enter' && save()} />
        ) : (
          <span className="font-medium">{bucket.name}</span>
        )}
      </div>
      <select aria-label={`Kind of ${bucket.name}`}  className="rounded border p-1 text-sm" value={bucket.kind}
        onChange={(e) => updateBucket(bucket.id, { kind: e.target.value as BucketKind })}>
        {BUCKET_KINDS.map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
      </select>
      <select aria-label={`Group of ${bucket.name}`}  className="rounded border p-1 text-sm" value={bucket.groupId ?? ''}
        onChange={(e) => updateBucket(bucket.id, { groupId: e.target.value || null })}>
        <option value="">No group</option>
        {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
      <div className={`w-24 text-right tabular-nums ${balance < 0 ? 'text-red-600' : ''}`}>
        {formatCents(balance)}
      </div>
      <button className="text-sm underline" onClick={() => setEditing(true)}>Rename</button>
      <button className="text-sm underline"
        onClick={() => updateBucket(bucket.id, { archived: !bucket.archived })}>
        {bucket.archived ? 'Restore' : 'Archive'}
      </button>
    </li>
  )
}