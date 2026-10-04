import * as React from 'react';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Layers,
  Smartphone,
  Table,
  ArrowRightLeft,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Pagination } from '../ui/pagination';

export function PaginationShowcase() {
  // Page states for each variant
  const [pageVariant1, setPageVariant1] = React.useState(3);
  const [pageVariant2, setPageVariant2] = React.useState(1);
  const [pageVariant3, setPageVariant3] = React.useState(5);
  const [pageVariant4, setPageVariant4] = React.useState(2);

  const totalPagesVariant1 = 12;
  const totalPagesVariant2 = 5;
  const totalPagesVariant3 = 20;
  const totalPagesVariant4 = 8;

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-10 text-foreground">
      {/* Header */}
      <div className="space-y-2 border-b border-border/60 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
          <Sparkles className="size-4" />
          <span>Navigation Controls</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Pagination Variants
        </h1>
        <p className="text-xs text-muted-foreground">
          Explore numeric page jump controls, compact mobile pagination, data
          table footers, and simple step controls.
        </p>
      </div>

      {/* Showcase Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Full Numeric Pagination Component */}
        <div className="p-6 rounded-3xl bg-card border border-border/70 space-y-6 flex flex-col justify-between shadow-xs">
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <span>1. Standard Numeric Pagination</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Dynamic truncation with page jump buttons for large datasets.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Active Page:</span>
              <span className="font-mono font-bold text-foreground">
                {pageVariant1} / {totalPagesVariant1}
              </span>
            </div>

            <Pagination
              currentPage={pageVariant1}
              totalPages={totalPagesVariant1}
              onPageChange={setPageVariant1}
            />
          </div>
        </div>

        {/* 2. Compact / Mobile Pagination */}
        <div className="p-6 rounded-3xl bg-card border border-border/70 space-y-6 flex flex-col justify-between shadow-xs">
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Smartphone className="size-4 text-emerald-400" />
              <span>2. Compact Mobile Navigation</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Space-saving layout ideal for mobile screens and side panels.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pageVariant2 === 1}
              onClick={() => setPageVariant2((prev) => Math.max(1, prev - 1))}
              className="text-xs gap-1 border-border/70 font-semibold"
            >
              <ChevronLeft className="size-4" />
              <span>Prev</span>
            </Button>

            <span className="text-xs font-mono font-bold text-muted-foreground">
              <strong className="text-foreground">{pageVariant2}</strong> of{' '}
              {totalPagesVariant2}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={pageVariant2 === totalPagesVariant2}
              onClick={() =>
                setPageVariant2((prev) =>
                  Math.min(totalPagesVariant2, prev + 1),
                )
              }
              className="text-xs gap-1 border-border/70 font-semibold"
            >
              <span>Next</span>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* 3. Table Footer Pagination with Entry Summary */}
        <div className="p-6 rounded-3xl bg-card border border-border/70 space-y-6 flex flex-col justify-between shadow-xs md:col-span-2">
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Table className="size-4 text-sky-400" />
              <span>3. Data Table Footer Pagination</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Combines item range metadata with a central numeric pagination
              strip.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/60">
            <p className="text-xs text-muted-foreground">
              Showing{' '}
              <span className="font-semibold text-foreground">
                {(pageVariant3 - 1) * 10 + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-foreground">
                {Math.min(pageVariant3 * 10, 200)}
              </span>{' '}
              of <span className="font-semibold text-foreground">200</span>{' '}
              entries
            </p>

            <Pagination
              currentPage={pageVariant3}
              totalPages={totalPagesVariant3}
              onPageChange={setPageVariant3}
            />
          </div>
        </div>

        {/* 4. Simple Previous / Next Step Pair */}
        <div className="p-6 rounded-3xl bg-card border border-border/70 space-y-6 flex flex-col justify-between shadow-xs md:col-span-2">
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <ArrowRightLeft className="size-4 text-amber-400" />
              <span>4. Simple Sequential Step Controls</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Minimal controls for multi-step forms, wizards, or documentation
              reading workflows.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              disabled={pageVariant4 === 1}
              onClick={() => setPageVariant4((prev) => Math.max(1, prev - 1))}
              className="text-xs gap-2 border-border/70 font-bold"
            >
              <ChevronLeft className="size-4" />
              <span>Previous Step</span>
            </Button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPagesVariant4 }, (_, i) => i + 1).map(
                (step) => (
                  <button
                    key={step}
                    onClick={() => setPageVariant4(step)}
                    className={`size-2.5 rounded-full transition-all ${
                      pageVariant4 === step
                        ? 'bg-amber-400 w-6'
                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/60'
                    }`}
                    aria-label={`Go to step ${step}`}
                  />
                ),
              )}
            </div>

            <Button
              variant="default"
              disabled={pageVariant4 === totalPagesVariant4}
              onClick={() =>
                setPageVariant4((prev) =>
                  Math.min(totalPagesVariant4, prev + 1),
                )
              }
              className="text-xs gap-2 font-bold"
            >
              <span>Next Step</span>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
