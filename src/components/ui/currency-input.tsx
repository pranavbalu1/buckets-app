import * as React from 'react';
import { cn } from './utils';
import { Input } from './input';
import { evaluateMathExpression, normalizeMathExpression } from '../../domain/mathExpression';

export interface CurrencyInputProps extends Omit<
  React.ComponentProps<'input'>,
  'onChange'
> {
  currencySymbol?: string;
  onValueChange?: (value: number | undefined) => void;
}

function CurrencyInput({
  className,
  currencySymbol = '$',
  onValueChange,
  defaultValue,
  value,
  onFocus,
  onBlur,
  ...props
}: CurrencyInputProps) {
  const externalValue = value ?? defaultValue
  const [draft, setDraft] = React.useState(() => String(externalValue ?? ''))
  const [editing, setEditing] = React.useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setDraft(raw)
    if (!raw.trim()) {
      onValueChange?.(undefined)
      return
    }
    const result = evaluateMathExpression(raw)
    if (result !== null && result >= 0) onValueChange?.(result)
    else onValueChange?.(undefined)
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    setEditing(false)
    const resolved = normalizeMathExpression(event.currentTarget.value)
    if (resolved !== null && Number(resolved) >= 0) {
      setDraft(resolved)
      onValueChange?.(Number(resolved))
    }
    onBlur?.(event)
  }

  return (
    <div className="relative flex items-center w-full">
      <div className="pointer-events-none absolute left-3 flex items-center justify-center text-muted-foreground font-semibold text-sm">
        {currencySymbol}
      </div>
      <Input
        math={false}
        type="text"
        inputMode="decimal"
        className={cn('pl-7 font-mono font-medium', className)}
        onChange={handleChange}
        onFocus={(event) => { setDraft(event.currentTarget.value); setEditing(true); onFocus?.(event) }}
        onBlur={handleBlur}
        value={!editing && value !== undefined ? String(value) : draft}
        {...props}
      />
    </div>
  );
}

export { CurrencyInput };
