import { formatCents } from '../../domain/money'

export default function Money({ cents, className = '' }: { cents: number; className?: string }) {
  return (
    <span className={`tabular-nums ${cents < 0 ? 'text-bad' : ''} ${className}`}>{formatCents(cents)}</span>
  )
}
