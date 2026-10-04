import * as React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface PaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  showFirstLastButtons?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  showFirstLastButtons = true,
  className,
  ...props
}: PaginationProps) {
  // Helper to generate the pagination sequence with ellipses
  const paginationRange = React.useMemo(() => {
    const totalPageNumbers = siblingCount + 5;

    if (totalPageNumbers >= totalPages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, 'DOTS', totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPages - rightItemCount + i + 1,
      );
      return [firstPageIndex, 'DOTS', ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i,
      );
      return [firstPageIndex, 'DOTS', ...middleRange, 'DOTS', lastPageIndex];
    }

    return [];
  }, [totalPages, siblingCount, currentPage]);

  if (currentPage === 0 || totalPages <= 1) return null;

  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn('flex items-center justify-center gap-1.5', className)}
      {...props}
    >
      {/* First Page Button */}
      {showFirstLastButtons && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="Go to first page"
          className="size-8 rounded-lg border-border/70"
        >
          <ChevronsLeft className="size-4" />
        </Button>
      )}

      {/* Previous Page Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Go to previous page"
        className="size-8 rounded-lg border-border/70"
      >
        <ChevronLeft className="size-4" />
      </Button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {paginationRange.map((pageNumber, idx) => {
          if (pageNumber === 'DOTS') {
            return (
              <span
                key={`dots-${idx}`}
                className="flex size-8 items-center justify-center text-muted-foreground select-none"
              >
                <MoreHorizontal className="size-4" />
              </span>
            );
          }

          const page = pageNumber as number;
          const isSelected = page === currentPage;

          return (
            <Button
              key={page}
              variant={isSelected ? 'default' : 'outline'}
              size="icon"
              onClick={() => onPageChange(page)}
              aria-current={isSelected ? 'page' : undefined}
              className={cn(
                'size-8 rounded-lg font-semibold text-xs transition-all',
                !isSelected &&
                  'border-border/70 text-muted-foreground hover:text-foreground',
              )}
            >
              {page}
            </Button>
          );
        })}
      </div>

      {/* Next Page Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Go to next page"
        className="size-8 rounded-lg border-border/70"
      >
        <ChevronRight className="size-4" />
      </Button>

      {/* Last Page Button */}
      {showFirstLastButtons && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Go to last page"
          className="size-8 rounded-lg border-border/70"
        >
          <ChevronsRight className="size-4" />
        </Button>
      )}
    </nav>
  );
}
