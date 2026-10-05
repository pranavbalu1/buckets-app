import type { ReactNode } from 'react'

export interface FieldProps { label: string; children: ReactNode }

export default function Field({ label, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  )
}
