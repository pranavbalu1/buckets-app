import * as React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const metricCardVariants = cva(
  'relative overflow-hidden rounded-3xl p-5 border transition-all duration-200 select-none flex flex-col justify-between',
  {
    variants: {
      priority: {
        high: 'bg-gradient-to-r from-[#e6ff4b] via-[#a2f267] to-[#00bdf9] text-zinc-950 border-transparent shadow-xl',
        medium: 'bg-card border-border/80 text-foreground shadow-lg',
        low: 'bg-card/60 border-border/40 text-foreground shadow-md',
      },
    },
    defaultVariants: {
      priority: 'medium',
    },
  },
);

const fontSizeMap = {
  sm: { main: 'text-xl', decimal: 'text-sm', target: 'text-sm' },
  md: { main: 'text-2xl', decimal: 'text-base', target: 'text-base' },
  lg: { main: 'text-3xl', decimal: 'text-xl', target: 'text-xl' },
  xl: { main: 'text-4xl', decimal: 'text-2xl', target: 'text-2xl' },
  '2xl': { main: 'text-5xl', decimal: 'text-3xl', target: 'text-3xl' },
};

export interface MetricCardProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof metricCardVariants> {
  /** The title or metric label (e.g., "Total Balance", "My Goal") */
  title: string;
  /** Primary dollar amount or main number value */
  amount: string | number;
  /** Target or secondary fraction denominator for goals (e.g. "$3k") */
  targetAmount?: string;
  /** Subtitle or completion state (e.g. "50% Completed") */
  subtitle?: string;
  /** Percentage change (e.g., 10 or -5.2) */
  changePercentage?: number;
  /** Absolute value change label (e.g., "+$2,780.00") */
  changeAmount?: string;
  /** Progress percentage for "goal" type (0 - 100) */
  progressPercentage?: number;
  /** Type variant of the stat display */
  type?: 'standard' | 'goal' | 'compact';
  /** Preset font size choice for the main number display */
  fontSize?: keyof typeof fontSizeMap | string;
  /** Callback for action arrow button click */
  onActionClick?: () => void;
}

export function MetricCard({
  className,
  priority = 'medium',
  type = 'standard',
  fontSize,
  title,
  amount,
  targetAmount,
  subtitle,
  changePercentage,
  changeAmount,
  progressPercentage,
  onActionClick,
  ...props
}: MetricCardProps) {
  const isHighPriority = priority === 'high';
  const isGoal = type === 'goal';

  // Determine font sizes based on prop or sensible defaults per layout type
  const resolvedFontSize = React.useMemo(() => {
    if (typeof fontSize === 'string' && fontSize in fontSizeMap) {
      return fontSizeMap[fontSize as keyof typeof fontSizeMap];
    }
    // Default fallback sizes per layout type if fontSize is not passed
    if (type === 'compact') return fontSizeMap.md;
    if (isHighPriority || type === 'standard') return fontSizeMap.xl;
    return fontSizeMap.lg;
  }, [fontSize, type, isHighPriority]);

  // Split decimal for high-contrast sizing ($25,230.00)
  const formatAmount = (val: string | number) => {
    if (typeof val === 'number') {
      const parts = val.toFixed(2).split('.');
      return { main: `$${parts[0]}`, decimal: `.${parts[1]}` };
    }
    const str = String(val);
    if (str.includes('.')) {
      const parts = str.split('.');
      return { main: parts[0], decimal: `.${parts[1]}` };
    }
    return { main: str, decimal: '' };
  };

  const formatted = formatAmount(amount);

  return (
    <div
      className={cn(
        metricCardVariants({ priority }),
        type === 'compact' ? 'min-h-[120px]' : 'min-h-[160px]',
        className,
      )}
      {...props}
    >
      {/* Goal Progress Bar Fill Layer */}
      {isGoal && progressPercentage !== undefined && (
        <div
          className={cn(
            'absolute inset-y-0 left-0 transition-all duration-500 pointer-events-none',
            isHighPriority ? 'bg-black/10' : 'bg-[#4a5818]/40',
          )}
          style={{
            width: `${Math.min(Math.max(progressPercentage, 0), 100)}%`,
          }}
        />
      )}

      {/* Header Row */}
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div>
          <h4
            className={cn(
              'text-sm font-medium tracking-tight',
              isHighPriority
                ? 'text-zinc-900/90 font-semibold'
                : 'text-muted-foreground',
            )}
          >
            {title}
          </h4>

          {/* Goal Subtitle */}
          {subtitle && (
            <p
              className={cn(
                'text-xs font-bold mt-0.5',
                isHighPriority ? 'text-zinc-950' : 'text-[#d2ff3a]',
              )}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Action Button */}
        {onActionClick && (
          <button
            onClick={onActionClick}
            className={cn(
              'size-8 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shrink-0',
              isHighPriority
                ? 'bg-zinc-950 text-white hover:bg-zinc-900'
                : 'bg-sunken text-foreground hover:bg-sunken/80',
            )}
            aria-label="View metric details"
          >
            <ArrowUpRight className="size-4" />
          </button>
        )}
      </div>

      {/* Main Number Row */}
      <div className="relative z-10 my-auto pt-2">
        <div className="flex items-baseline gap-0.5">
          {/* Main Integer Part */}
          <span
            className={cn(
              'font-bold tracking-tight',
              typeof fontSize === 'string' && !(fontSize in fontSizeMap)
                ? fontSize // Custom Tailwind class passed directly
                : resolvedFontSize.main,
              isHighPriority ? 'text-zinc-950' : 'text-foreground',
            )}
          >
            {formatted.main}
          </span>

          {/* Decimal Part */}
          {formatted.decimal && (
            <span
              className={cn(
                'font-medium',
                resolvedFontSize.decimal,
                isHighPriority ? 'text-zinc-950/50' : 'text-muted-foreground',
              )}
            >
              {formatted.decimal}
            </span>
          )}

          {/* Goal Fraction Denominator */}
          {isGoal && targetAmount && (
            <span
              className={cn(
                'font-medium ml-0.5',
                resolvedFontSize.target,
                isHighPriority ? 'text-zinc-900/60' : 'text-muted-foreground',
              )}
            >
              /{targetAmount}
            </span>
          )}
        </div>
      </div>

      {/* Footer Row */}
      <div className="relative z-10 flex items-center justify-between gap-2 mt-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {changePercentage !== undefined && (
            <div
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold',
                isHighPriority
                  ? 'bg-zinc-950 text-white'
                  : changePercentage >= 0
                    ? 'bg-[#384814] text-[#d2ff3a]'
                    : 'bg-rose-950/60 text-rose-400',
              )}
            >
              {changePercentage >= 0 ? (
                <ArrowUpRight className="size-3 stroke-[3]" />
              ) : (
                <ArrowDownRight className="size-3 stroke-[3]" />
              )}
              <span>{Math.abs(changePercentage)}%</span>
            </div>
          )}

          {changeAmount && (
            <div
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-semibold',
                isHighPriority
                  ? 'bg-zinc-950/80 text-white'
                  : 'bg-sunken text-muted-foreground',
              )}
            >
              {changeAmount}
            </div>
          )}
        </div>

        {type === 'standard' && (
          <div className="flex items-end gap-0.5 h-6 opacity-80 shrink-0">
            {[35, 20, 45, 30, 60, 40, 75, 50, 90, 100].map((h, i) => (
              <span
                key={i}
                className={cn(
                  'w-1 rounded-full',
                  isHighPriority ? 'bg-zinc-950' : 'bg-muted-foreground/60',
                )}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
