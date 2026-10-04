import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

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
  ...props
}: CurrencyInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9.]/g, '');
    const num = rawVal ? parseFloat(rawVal) : undefined;
    onValueChange?.(num);
  };

  return (
    <div className="relative flex items-center w-full">
      <div className="pointer-events-none absolute left-3 flex items-center justify-center text-muted-foreground font-semibold text-sm">
        {currencySymbol}
      </div>
      <Input
        type="text"
        inputMode="decimal"
        className={cn('pl-7 font-mono font-medium', className)}
        onChange={handleChange}
        value={value}
        defaultValue={defaultValue}
        {...props}
      />
    </div>
  );
}

export { CurrencyInput };
