import * as React from 'react';
import {
  Sparkles,
  RefreshCw,
  PieChart as PieChartIcon,
  CreditCard,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// DEMO COMPONENTS WITH ATTACHED SKELETONS
// ============================================================================

interface TransactionCardProps {
  client: string;
  amount: string;
  status: string;
  date: string;
}

function TransactionCard({
  client,
  amount,
  status,
  date,
}: TransactionCardProps) {
  return (
    <div className="p-4 rounded-2xl bg-card border border-border/70 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
          <CreditCard className="size-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold">{client}</h4>
          <p className="text-[10px] text-muted-foreground">{date}</p>
        </div>
      </div>
      <div className="text-right">
        <span className="text-xs font-black block">{amount}</span>
        <span className="text-[10px] font-bold text-emerald-400">{status}</span>
      </div>
    </div>
  );
}

TransactionCard.Skeleton = function TransactionCardSkeleton() {
  return (
    <div className="p-4 rounded-2xl bg-card border border-border/70 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-xl shrink-0" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>
      <div className="space-y-1.5 flex flex-col items-end">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-2.5 w-12" />
      </div>
    </div>
  );
};

interface AllocationGraphProps {
  data: { label: string; percentage: number; color: string }[];
}

function AllocationGraph({ data }: AllocationGraphProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
      <div className="relative size-40 rounded-full border-8 border-primary/20 border-t-primary border-r-emerald-400 border-b-sky-400 flex items-center justify-center shrink-0">
        <div className="text-center space-y-0.5">
          <span className="text-xs font-bold text-muted-foreground block">
            Total
          </span>
          <span className="text-lg font-black">$128.4K</span>
        </div>
      </div>

      <div className="space-y-3 w-full flex-1">
        {data.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${item.color}`} />
              <span className="font-semibold text-muted-foreground">
                {item.label}
              </span>
            </div>
            <span className="font-mono font-extrabold">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

AllocationGraph.Skeleton = function AllocationGraphSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
      <Skeleton className="size-40 rounded-full shrink-0" />
      <div className="space-y-3.5 w-full flex-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="size-2.5 rounded-full shrink-0" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-3 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN SHOWCASE PAGE
// ============================================================================

export function SkeletonShowcase() {
  const [isLoading, setIsLoading] = React.useState(true);

  // 🎯 Clean useEffect to automatically stop loading after exactly 500ms
  React.useEffect(() => {
    if (!isLoading) return;

    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500); // ⚡ 500ms timer

    return () => clearTimeout(timer);
  }, [isLoading]);

  const handleTriggerLoading = () => {
    setIsLoading(true); // Setting this to true re-triggers the 500ms useEffect above
  };

  const chartData = [
    { label: 'US Treasury Bonds', percentage: 45, color: 'bg-primary' },
    { label: 'Corporate Liquidity', percentage: 35, color: 'bg-emerald-400' },
    { label: 'Venture Assets', percentage: 20, color: 'bg-sky-400' },
  ];

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-10 text-foreground">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
            <Sparkles className="size-4" />
            <span>Component Integration</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Skeleton Adaptations
          </h1>
          <p className="text-xs text-muted-foreground">
            Demonstrating how to seamlessly apply skeleton placeholders across
            cards, charts, and navigation controls.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleTriggerLoading}
          disabled={isLoading}
          className="text-xs font-bold gap-2 border-border/70 self-start sm:self-auto"
        >
          <RefreshCw
            className={`size-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`}
          />
          <span>
            {isLoading ? 'Fetching (500ms)...' : 'Simulate 500ms Load'}
          </span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Variant 1: Pie / Donut Chart Skeleton */}
        <div className="p-6 rounded-3xl bg-card border border-border/70 space-y-4 shadow-xs md:col-span-2">
          <div className="space-y-1">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <PieChartIcon className="size-4 text-primary" />
              <span>1. Pie Chart & Data Visualization</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Circular skeleton placeholder paired with legend row shimmers to
              eliminate chart layout shifts.
            </p>
          </div>

          {isLoading ? (
            <AllocationGraph.Skeleton />
          ) : (
            <AllocationGraph data={chartData} />
          )}
        </div>

        {/* Variant 2: Card Component with Skeleton */}
        <div className="p-6 rounded-3xl bg-card border border-border/70 space-y-4 shadow-xs">
          <div className="space-y-1">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <CreditCard className="size-4 text-emerald-400" />
              <span>2. Data Card Integration</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Using{' '}
              <code className="text-primary font-mono text-[11px]">
                TransactionCard.Skeleton
              </code>{' '}
              to mirror component structure.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {isLoading ? (
              <>
                <TransactionCard.Skeleton />
                <TransactionCard.Skeleton />
              </>
            ) : (
              <>
                <TransactionCard
                  client="Aetheris Cloud Mesh"
                  amount="$14,250.00"
                  status="Settled"
                  date="2026-08-01"
                />
                <TransactionCard
                  client="Vance & Sterling Group"
                  amount="$8,900.50"
                  status="Settled"
                  date="2026-07-30"
                />
              </>
            )}
          </div>
        </div>

        {/* Variant 3: Action Controls & Buttons Skeleton */}
        <div className="p-6 rounded-3xl bg-card border border-border/70 space-y-4 shadow-xs">
          <div className="space-y-1">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-sky-400" />
              <span>3. Form Actions & Triggers</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Preserving exact button dimensions while async options or
              permissions resolve.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-2xl border border-border/50 bg-muted/20">
              <div className="space-y-1">
                <p className="text-xs font-bold">Active Region</p>
                <p className="text-[10px] text-muted-foreground">
                  Select primary edge server
                </p>
              </div>

              {isLoading ? (
                <Skeleton className="h-8 w-32 rounded-xl" />
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-2 border-border/70"
                >
                  <SlidersHorizontal className="size-3.5 text-primary" />
                  <span>us-east-1</span>
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl border border-border/50 bg-muted/20">
              <div className="space-y-1">
                <p className="text-xs font-bold">New Deployment</p>
                <p className="text-[10px] text-muted-foreground">
                  Trigger build pipeline
                </p>
              </div>

              {isLoading ? (
                <Skeleton className="h-8 w-28 rounded-xl" />
              ) : (
                <Button size="sm" className="text-xs gap-1.5 font-bold">
                  <Plus className="size-3.5" />
                  <span>Deploy</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Variant 4: Pagination Bar Skeleton */}
        <div className="p-6 rounded-3xl bg-card border border-border/70 space-y-4 shadow-xs md:col-span-2">
          <div className="space-y-1">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="size-4 text-amber-400" />
              <span>4. Pagination Bar Skeleton</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Maintains layout height while dynamic page count or entry ranges
              recalculate.
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-border/60 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            {isLoading ? (
              <Skeleton className="h-3.5 w-48" />
            ) : (
              <p className="text-xs text-muted-foreground">
                Showing{' '}
                <span className="font-semibold text-foreground">1–5</span> of{' '}
                <span className="font-semibold text-foreground">45</span>{' '}
                entries
              </p>
            )}

            {isLoading ? (
              <div className="flex items-center gap-2">
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="size-8 rounded-lg" />
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 rounded-lg border-border/70"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  className="size-8 rounded-lg text-xs font-bold"
                >
                  1
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 rounded-lg text-xs border-border/70"
                >
                  2
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 rounded-lg border-border/70"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
