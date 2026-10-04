import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.ComponentProps<'select'> {
  options: SelectOption[];
  placeholder?: string;
}

function Select({
  className,
  options,
  placeholder,
  disabled,
  ...props
}: SelectProps) {
  return (
    <div className="relative w-full">
      <select
        data-slot="select"
        disabled={disabled}
        className={cn(
          'flex h-10 w-full appearance-none rounded-md border border-input bg-input px-3 py-2 pr-8 text-sm text-foreground shadow-xs transition-colors',
          'outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled selected hidden>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export { Select };
