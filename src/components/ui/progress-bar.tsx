export interface ProgressBarProps { pct: number; over?: boolean; color?: string }

export default function ProgressBar({ pct, over = false, color }: ProgressBarProps) {
  const width = Math.max(0, Math.min(100, pct))
  const progressColor = over ? 'var(--color-bad)' : color ?? 'var(--color-accent)'
  return (
    <div
      className="h-1.5 overflow-hidden rounded-full"
      style={{ backgroundColor: `color-mix(in srgb, ${progressColor} 22%, var(--color-surface))` }}
      role="presentation"
    >
      <div
        className={`h-full rounded-full ${over ? 'bg-bad' : color ? '' : 'bg-accent'}`}
        style={{ width: `${width}%`, ...(color && !over ? { backgroundColor: color } : {}) }}
      />
    </div>
  )
}
