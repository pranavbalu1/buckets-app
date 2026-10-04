import { useMemo } from 'react'
import { computeBalances } from '../domain/balances'
import { formatCents } from '../domain/money'
import { useLedger } from '../storage/store'

const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0)

export default function Dashboard() {
  const events = useLedger((s) => s.events)
  const b = useMemo(() => computeBalances(events), [events])

  const accountsTotal = sum(b.accounts)
  const bucketsTotal = sum(b.buckets)

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Dashboard</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Money in accounts" value={formatCents(accountsTotal)} />
        <Stat label="Assigned to buckets" value={formatCents(bucketsTotal)} />
        <Stat label="Unallocated" value={formatCents(b.unallocated)} />
      </div>
      <p className="text-sm text-gray-500">
        Income, expense, and budget screens are coming next.
      </p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
}