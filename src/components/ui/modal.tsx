import { useEffect, useId, useRef, type ReactNode } from 'react'

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialogId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? []).filter((element) => element.getAttribute('aria-hidden') !== 'true')
    const firstFrame = window.requestAnimationFrame(() => {
      const active = document.activeElement
      if (active instanceof HTMLElement && active !== dialogRef.current && dialogRef.current?.contains(active)) return
      const initialTarget = focusable()[0] ?? dialogRef.current
      initialTarget?.focus()
    })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (items.length === 0) {
        event.preventDefault()
        dialogRef.current?.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(firstFrame)
      window.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 pb-[env(safe-area-inset-bottom)] sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={`${dialogId}-title`} tabIndex={-1}
        className="card max-h-[90vh] max-h-[90dvh] w-full touch-pan-y overscroll-contain overflow-y-auto rounded-b-none p-4 sm:max-w-lg sm:rounded-b-xl sm:p-5"
        onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 id={`${dialogId}-title`} className="text-lg font-semibold">{title}</h2>
          <button className="btn-link" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
