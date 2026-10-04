import * as React from 'react';
import { Search, Command, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
}

export interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: CommandItem[];
  placeholder?: string;
}

export function CommandMenu({
  isOpen,
  onClose,
  items,
  placeholder = 'Type a command or search...',
}: CommandMenuProps) {
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Filter items based on user query
  const filteredItems = React.useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
    );
  }, [items, query]);

  // Focus input when modal opens
  React.useEffect(() => {
    if (!isOpen) return;
    const focusTimer = window.setTimeout(() => {
      setQuery('');
      setSelectedIndex(0);
      inputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen]);

  // Keyboard navigation & Shortcuts (Cmd+K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle menu on Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        return;
      }

      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev + 1) % Math.max(1, filteredItems.length),
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(
          (prev) =>
            (prev - 1 + filteredItems.length) %
            Math.max(1, filteredItems.length),
        );
      } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
        e.preventDefault();
        filteredItems[selectedIndex].onSelect();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  // Group filtered items by category
  const groupedItems = React.useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    filteredItems.forEach((item) => {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    });
    return map;
  }, [filteredItems]);

  if (!isOpen) return null;

  let globalIndex = 0;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 p-4 animate-in fade-in duration-150">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Box */}
      <div className="relative w-full max-w-xl rounded-3xl bg-card border border-border/80 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[520px]">
        {/* Search Header Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/60">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={placeholder}
            className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono bg-sunken/70 text-muted-foreground px-2 py-0.5 rounded-md border border-border/60">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-4">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            Array.from(groupedItems.entries()).map(([category, items]) => (
              <div key={category} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {category}
                </div>

                {items.map((item) => {
                  const isSelected = globalIndex === selectedIndex;
                  const currentIndex = globalIndex;
                  globalIndex++;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        item.onSelect();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all text-left group select-none',
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-foreground hover:bg-sunken/70',
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.icon && (
                          <span
                            className={cn(
                              'size-4 shrink-0',
                              isSelected
                                ? 'text-primary-foreground'
                                : 'text-muted-foreground',
                            )}
                          >
                            {item.icon}
                          </span>
                        )}
                        <div className="truncate">
                          <p className="truncate font-semibold">{item.title}</p>
                          {item.subtitle && (
                            <p
                              className={cn(
                                'text-[11px] truncate font-normal',
                                isSelected
                                  ? 'text-primary-foreground/80'
                                  : 'text-muted-foreground',
                              )}
                            >
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {item.shortcut && (
                          <kbd
                            className={cn(
                              'text-[10px] font-mono px-1.5 py-0.5 rounded border',
                              isSelected
                                ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30'
                                : 'bg-sunken text-muted-foreground border-border/60',
                            )}
                          >
                            {item.shortcut}
                          </kbd>
                        )}
                        <ArrowRight
                          className={cn(
                            'size-3.5 transition-transform group-hover:translate-x-0.5',
                            isSelected ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Command Footer Status Bar */}
        <div className="px-4 py-2.5 bg-sunken/60 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-background px-1 rounded border border-border/60">
                ↑
              </kbd>
              <kbd className="font-mono bg-background px-1 rounded border border-border/60">
                ↓
              </kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-background px-1 rounded border border-border/60">
                ↵
              </kbd>
              <span>Select</span>
            </span>
          </div>

          <span className="flex items-center gap-1">
            <Command className="size-3" />
            <span>Command Engine</span>
          </span>
        </div>
      </div>
    </div>
  );
}
