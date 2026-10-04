import * as React from 'react';
import { cn } from '@/lib/utils';

export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  destructive?: boolean;
  onClick?: () => void;
}

export interface DropdownMenuSection {
  title?: string;
  items: DropdownMenuItem[];
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  sections: DropdownMenuSection[];
  align?: 'left' | 'right';
  className?: string;
}

export function DropdownMenu({
  trigger,
  sections,
  align = 'left',
  className,
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      {/* Trigger element */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="cursor-pointer"
      >
        {trigger}
      </div>

      {/* Popover Panel */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-2 min-w-[200px] rounded-2xl bg-card border border-border/70 p-1.5 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100',
            align === 'right'
              ? 'right-0 origin-top-right'
              : 'left-0 origin-top-left',
            className,
          )}
        >
          {sections.map((section, sIdx) => (
            <React.Fragment key={sIdx}>
              {sIdx > 0 && <div className="my-1 border-t border-border/60" />}

              {section.title && (
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </div>
              )}

              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    disabled={item.disabled}
                    onClick={() => {
                      if (!item.disabled) {
                        item.onClick?.();
                        setIsOpen(false);
                      }
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-2.5 py-2 text-xs font-semibold rounded-xl transition-colors select-none text-left',
                      item.disabled
                        ? 'opacity-40 cursor-not-allowed'
                        : item.destructive
                          ? 'text-destructive hover:bg-destructive/10'
                          : 'text-foreground hover:bg-sunken/70',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {item.icon && (
                        <span className="size-4 shrink-0">{item.icon}</span>
                      )}
                      <span>{item.label}</span>
                    </span>

                    {item.shortcut && (
                      <kbd className="ml-auto text-[10px] font-mono tracking-widest text-muted-foreground opacity-70 bg-sunken/70 px-1.5 py-0.5 rounded border border-border/50">
                        {item.shortcut}
                      </kbd>
                    )}
                  </button>
                ))}
              </div>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
