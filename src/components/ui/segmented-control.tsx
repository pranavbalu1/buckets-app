import * as React from 'react';
import { cn } from './utils';

export interface SegmentOption {
  id: string;
  label: string;
  icon?: React.ElementType;
}

export interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 bg-sunken/70 p-1 rounded-xl border border-border/50 w-full',
        className,
      )}
    >
      {options.map((opt) => {
        const isActive = value === opt.id;
        const Icon = opt.icon;

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all select-none outline-none',
              isActive
                ? 'bg-background text-foreground shadow-xs border border-border/50'
                : 'text-muted-foreground hover:text-foreground hover:bg-sunken/70',
            )}
          >
            {Icon && <Icon className="size-3.5" />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
