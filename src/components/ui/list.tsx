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
  /** Replace the standard title block with a custom header. */
  headerContent?: React.ReactNode;
  /** Render a custom row body while keeping the shared list container and spacing. */
  renderItem?: (item: ListItemData) => React.ReactNode;
  /** Message shown when the list has no items. */
  emptyMessage?: string;
  /** Tighter card and row spacing for dense data lists. */
  density?: 'default' | 'compact';
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
  headerContent,
  renderItem,
  emptyMessage = 'No transactions found for this filter',
  density = 'default',
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
        density === 'compact'
          ? 'w-full rounded-xl bg-card border border-border/70 p-2.5 shadow-sm flex flex-col'
          : 'w-full rounded-3xl bg-card border border-border/70 p-5 shadow-xl flex flex-col',
        className,
      )}
      {...props}
    >
      {/* List Header */}
      {headerContent ? (
        <div className={density === 'compact' ? 'mb-2' : 'mb-3'}>{headerContent}</div>
      ) : (title || subtitle || actionLabel) && (
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <div className="min-w-0">
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
              className="inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-xs text-muted-foreground hover:bg-sunken/70 hover:text-foreground"
            >
              <span className="whitespace-nowrap">{actionLabel}</span>
              <ChevronRight className="ml-0.5 size-3.5 shrink-0" />
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
        {filteredItems.length === 0 ? emptyMessage ? (
          <div className="flex min-h-10 w-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
            {emptyMessage}
          </div>
        ) : null : (
          filteredItems.map((item) => {
            if (renderItem) {
              return (
                <div
                  key={item.id}
                  onClick={() => onItemClick?.(item)}
                  className={cn(
                    'group relative flex items-center justify-between rounded-2xl transition-all duration-200 select-none',
                    density === 'compact' ? 'p-1' : 'p-3',
                    onItemClick ? 'cursor-pointer' : 'cursor-default',
                    'hover:bg-sunken/70 border border-transparent hover:border-border/40',
                  )}
                >
                  {renderItem(item)}
                </div>
              )
            }
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
