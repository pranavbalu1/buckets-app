export default function ProgressBar({ pct, over = false }: { pct: number; over?: boolean }) {
  const width = Math.max(0, Math.min(100, pct))
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-sunken" role="presentation">
      <div className={`h-full rounded-full ${over ? 'bg-bad' : 'bg-accent'}`} style={{ width: `${width}%` }} />
    </div>
  )
}