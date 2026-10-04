import * as React from 'react';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface ListItemData {
  id: string;
  title: string;
  subtitle?: string;
  date?: string;
  amount?: number | string;
  /** Controls green (+) vs default text color styling */
  isPositive?: boolean;
  /** Filter tab value group (e.g. "income", "expense", "transfer") */
  type?: string;
  category?: string;
  icon?: React.ElementType;
  /** Custom Tailwind classes for icon container background/text */
  iconVariant?: string;
  badge?: string;
}

export interface ListFilterTab {
  id: string;
  label: string;
}

export interface ListProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onActionClick?: () => void;
  items?: ListItemData[];
  onItemClick?: (item: ListItemData) => void;
  /** Filter tabs to render above the scrollable list */
  filterTabs?: ListFilterTab[];
  /** Default active filter tab ID */
  defaultFilterId?: string;
  /**
   * Fixed height class for the scrollable container to prevent height jumps when toggling tabs.
   * Defaults to "h-[300px]". Pass "h-[240px]" or any custom height.
   */
  heightClass?: string;
}

const defaultTabs: ListFilterTab[] = [
  { id: 'all', label: 'All' },
  { id: 'income', label: 'Income' },
  { id: 'expense', label: 'Expenses' },
];

export function List({
  className,
  title,
  subtitle,
  actionLabel,
  onActionClick,
  items = [],
  onItemClick,
  filterTabs = defaultTabs,
  defaultFilterId = 'all',
  heightClass = 'h-[300px]',
  ...props
}: ListProps) {
  const [activeFilter, setActiveFilter] = React.useState(defaultFilterId);

  // Filter items based on active tab
  const filteredItems = React.useMemo(() => {
    if (activeFilter === 'all') return items;
    return items.filter((item) => item.type === activeFilter);
  }, [items, activeFilter]);

  return (
    <div
      className={cn(
        'w-full rounded-3xl bg-card border border-border/70 p-5 shadow-xl flex flex-col',
        className,
      )}
      {...props}
    >
      {/* List Header */}
      {(title || subtitle || actionLabel) && (
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            {title && (
              <h3 className="text-base font-bold tracking-tight text-foreground">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>

          {actionLabel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onActionClick}
              className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 rounded-full hover:bg-sunken/70"
            >
              <span>{actionLabel}</span>
              <ChevronRight className="size-3.5 ml-1" />
            </Button>
          )}
        </div>
      )}

      {/* Mini Filter Tabs */}
      {filterTabs && filterTabs.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3 bg-sunken/70 p-1 rounded-full border border-border/40 w-fit">
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 outline-none select-none',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-sunken/70',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Fixed Height Scrollable Container */}
      <div
        className={cn(
          'overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent',
          heightClass,
        )}
      >
        {filteredItems.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
            No transactions found for this filter
          </div>
        ) : (
          filteredItems.map((item) => {
            const IconComponent = item.icon;

            return (
              <div
                key={item.id}
                onClick={() => onItemClick?.(item)}
                className={cn(
                  'group relative flex items-center justify-between p-3 rounded-2xl',
                  'transition-all duration-200 select-none',
                  onItemClick ? 'cursor-pointer' : 'cursor-default',
                  'hover:bg-sunken/70 border border-transparent hover:border-border/40',
                )}
              >
                {/* Left Side: Icon & Info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  {IconComponent && (
                    <div
                      className={cn(
                        'size-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
                        item.iconVariant || 'bg-sunken text-foreground',
                      )}
                    >
                      <IconComponent className="size-5" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {item.title}
                      </p>
                      {item.badge && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary/20 text-primary">
                          {item.badge}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {item.subtitle && <span>{item.subtitle}</span>}
                      {item.subtitle && item.date && <span>•</span>}
                      {item.date && <span>{item.date}</span>}
                    </div>
                  </div>
                </div>

                {/* Right Side: Amount & Category */}
                {(item.amount !== undefined || item.category) && (
                  <div className="text-right shrink-0 pl-3">
                    {item.amount !== undefined && (
                      <p
                        className={cn(
                          'text-sm font-bold tracking-tight',
                          item.isPositive
                            ? 'text-good'
                            : 'text-foreground',
                        )}
                      >
                        {item.isPositive && '+'}
                        {typeof item.amount === 'number'
                          ? `$${item.amount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : item.amount}
                      </p>
                    )}

                    {item.category && (
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium block mt-0.5">
                        {item.category}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
