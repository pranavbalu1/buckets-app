import type { ReactNode } from 'react'

export function FormField({
  label,
  htmlFor,
  error,
  required = false,
  helperText,
  children,
}: {
  label?: string
  htmlFor?: string
  error?: string
  required?: boolean
  helperText?: string
  children: ReactNode
}) {
  return (
    <div className="w-full space-y-1.5">
      {label && <label htmlFor={htmlFor} className="block text-xs font-semibold text-muted">{label}{required && <span aria-hidden="true"> *</span>}</label>}
      {children}
      {helperText && !error && <p className="text-xs text-muted">{helperText}</p>}
      {error && <p className="text-xs font-medium text-bad">{error}</p>}
    </div>
  )
}

export function FormSection({
  title,
  description,
  children,
}: {
  title?: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-4">
      {(title || description) && (
        <header className="space-y-1">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {description && <p className="text-sm text-muted">{description}</p>}
        </header>
      )}
      <div className="space-y-4">{children}</div>
    </section>
  )
}
