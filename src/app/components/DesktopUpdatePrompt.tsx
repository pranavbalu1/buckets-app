import { useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { Button, Modal } from '../../components'
import { downloadDesktopUpdate, installDesktopUpdate, useDesktopUpdates } from '../../lib/desktopUpdates'

export default function DesktopUpdatePrompt() {
  const update = useDesktopUpdates()
  const [dismissedPrompt, setDismissedPrompt] = useState<string | null>(null)
  const promptKey = `${update.status}:${update.version ?? ''}`
  const hasPrompt = update.status === 'available'
    || update.status === 'downloading'
    || update.status === 'downloaded'
    || (update.status === 'error' && Boolean(update.version))
  const open = hasPrompt && dismissedPrompt !== promptKey

  if (!open) return null

  const isDownloaded = update.status === 'downloaded'
  const isDownloading = update.status === 'downloading'
  const title = update.status === 'error' ? 'Update could not be completed'
    : isDownloaded ? 'Update ready to install' : 'Buckets update available'

  return (
    <Modal title={title} onClose={() => setDismissedPrompt(promptKey)}>
      {update.status === 'error' ? (
        <div className="space-y-4">
          <p role="alert" className="text-sm text-bad">{update.message ?? 'The update could not be completed.'}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => setDismissedPrompt(promptKey)}>Close</Button>
            {update.version && <Button variant="primary" onClick={() => void downloadDesktopUpdate()}><RefreshCw className="size-4" /> Try again</Button>}
          </div>
        </div>
      ) : isDownloaded ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">Version {update.version} has downloaded. Restart Buckets to finish installing it.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => setDismissedPrompt(promptKey)}>Later</Button>
            <Button variant="primary" onClick={() => void installDesktopUpdate()}><RefreshCw className="size-4" /> Restart and install</Button>
          </div>
        </div>
      ) : isDownloading ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">Downloading version {update.version}… {Math.round(update.percent)}%</p>
          <div className="h-2 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-label="Update download progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(update.percent)}>
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${update.percent}%` }} />
          </div>
          <div className="flex justify-end"><Button onClick={() => setDismissedPrompt(promptKey)}>Continue in background</Button></div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted">Version {update.version} is ready. Download it now and restart when convenient.</p>
          {update.releaseNotes && <div className="max-h-40 overflow-y-auto rounded-lg bg-sunken/70 p-3 text-sm leading-5 text-muted">{update.releaseNotes}</div>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => setDismissedPrompt(promptKey)}>Later</Button>
            <Button variant="primary" onClick={() => void downloadDesktopUpdate()}><Download className="size-4" /> Download update</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
