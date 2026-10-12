import type { FocusEvent, InputHTMLAttributes } from 'react'
import { normalizeMathExpression } from '../../domain/mathExpression'

type InputProps = InputHTMLAttributes<HTMLInputElement> & { math?: boolean }

function setReactInputValue(input: HTMLInputElement, value: string) {
  const view = input.ownerDocument.defaultView
  if (!view) return
  const setter = Object.getOwnPropertyDescriptor(view.HTMLInputElement.prototype, 'value')?.set
  if (setter) setter.call(input, value)
  else input.value = value
  input.dispatchEvent(new view.Event('input', { bubbles: true }))
}

export function Input({ className = '', math = true, type = 'text', inputMode, onBlur, ...props }: InputProps) {
  const acceptsMath = math && (type === 'number' || inputMode === 'decimal' || inputMode === 'numeric')
  const resolvedType = acceptsMath && type === 'number' ? 'text' : type
  const resolvedInputMode = acceptsMath ? inputMode ?? 'decimal' : inputMode

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    if (acceptsMath) {
      const input = event.currentTarget
      const raw = input.value.trim()
      const resolved = /[+\-*/()]/.test(raw) ? normalizeMathExpression(raw) : null
      if (resolved !== null && resolved !== raw) setReactInputValue(input, resolved)
    }
    onBlur?.(event)
  }

  return <input {...props} type={resolvedType} inputMode={resolvedInputMode} onBlur={handleBlur} className={`input ${className}`} />
}
