import { Children, cloneElement, isValidElement, useId, type ReactNode } from 'react'

export function FormField({
  label,
  htmlFor,
  error,
  required = false,
  helperText,
  className = '',
  children,
}: {
  label?: string
  htmlFor?: string
  error?: string
  required?: boolean
  helperText?: string
  className?: string
  children: ReactNode
}) {
  const labelId = useId()
  const labeledChildren = label ? Children.map(children, (child) => {
    if (!isValidElement<{ 'aria-labelledby'?: string }>(child)) return child
    const existing = child.props['aria-labelledby']
    return cloneElement(child, {
      'aria-labelledby': [existing, labelId].filter(Boolean).join(' '),
    })
  }) : children

  return (
    <div className={`w-full min-w-0 space-y-1.5 ${className}`}>
      {label && <label id={labelId} htmlFor={htmlFor} className="block text-xs font-semibold text-muted">{label}{required && <span aria-hidden="true"> *</span>}</label>}
      {labeledChildren}
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
