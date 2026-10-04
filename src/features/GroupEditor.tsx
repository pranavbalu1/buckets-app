import { useState } from 'react'
import Field from '../components/Field'
import Modal from '../components/Modal'
import type { BucketGroup } from '../domain/models'
import { useLedger } from '../storage/store'

export default function GroupEditor({ group, onClose }: { group?: BucketGroup; onClose: () => void }) {
  const addGroup = useLedger((s) => s.addGroup)
  const updateGroup = useLedger((s) => s.updateGroup)
  const [name, setName] = useState(group?.name ?? '')
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    const ok = group ? await updateGroup(group.id, { name: trimmed }) : await addGroup(trimmed)
    setBusy(false)
    if (ok) onClose()
  }

  return (
    <Modal title={group ? 'Rename group' : 'New group'} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Group name">
          <input className="input" autoFocus placeholder="e.g. Housing, Food & Household" value={name}
            onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="flex gap-2">
          <button disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save'}</button>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  )
}