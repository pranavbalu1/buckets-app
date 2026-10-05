import * as React from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  Check,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from './utils';

/* ==========================================================================
   COLOR MAPPER HELPER
   ========================================================================== */
function parseColorStyle(colorClass: string) {
  if (colorClass.startsWith('var(') || colorClass.startsWith('color-mix(')) {
    return {
      bg: colorClass,
      textStyle: { color: colorClass },
      borderStyle: { borderColor: colorClass },
    }
  }
  if (colorClass.startsWith('#') || colorClass.startsWith('rgb')) {
    return {
      bg: colorClass,
      textStyle: { color: colorClass },
      borderStyle: { borderColor: colorClass },
    };
  }

  const arbitraryMatch = colorClass.match(/bg-\[(#[a-fA-F0-9]+|rgb\(.*?\))\]/);
  if (arbitraryMatch) {
    const value = arbitraryMatch[1];
    return {
      bg: value,
      textStyle: { color: value },
      borderStyle: { borderColor: value },
    };
  }

  const colorMap: Record<string, string> = {
    'bg-rose-500': '#f43f5e',
    'bg-emerald-400': '#34d399',
    'bg-cyan-400': '#22d3ee',
    'bg-blue-500': '#3b82f6',
    'bg-purple-500': '#a855f7',
    'bg-[#e6ff4b]': 'var(--color-chart-1)',
    'bg-[#b0cc29]': 'var(--color-chart-1)',
    'bg-[#6d8218]': 'var(--color-chart-1)',
    'bg-[#42500d]': 'var(--color-chart-1)',
  };

  const hex = colorMap[colorClass] || 'var(--color-chart-1)';
  return {
    bg: hex,
    textStyle: { color: hex },
    borderStyle: { borderColor: hex },
  };
}

/** Shared cursor tooltip used by the graphs in this library. */
export function GraphHoverTooltip({
  left,
  top,
  label,
  value,
  color,
}: {
  left: number
  top: number
  label: string
  value: string
  color: string
}) {
  const colorStyle = parseColorStyle(color)
  return (
    <div
      className="pointer-events-none absolute z-50 flex -translate-x-1/2 -translate-y-12 items-center gap-2 rounded-xl border border-border bg-surface/95 px-3 py-1.5 text-[11px] font-bold text-foreground shadow-2xl backdrop-blur-md transition-all duration-75"
      style={{ left, top, borderColor: colorStyle.bg }}
    >
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: colorStyle.bg }} />
      <span className="font-medium capitalize text-muted-foreground">{label}:</span>
      <span style={colorStyle.textStyle}>{value}</span>
    </div>
  )
}

export interface BudgetGaugeGraphProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  budgetCents: number
  spentCents: number
  subtitle?: string
}

/** A semicircle budget gauge with explicit spent, budget, and remaining totals. */
export function BudgetGaugeGraph({
  title,
  budgetCents,
  spentCents,
  subtitle,
  className,
  ...props
}: BudgetGaugeGraphProps) {
  const safeBudget = Math.max(0, budgetCents)
  const safeSpent = Math.max(0, spentCents)
  const usedPercent = safeBudget > 0 ? Math.min(100, Math.round(safeSpent / safeBudget * 100)) : safeSpent > 0 ? 100 : 0
  const remaining = Math.max(0, safeBudget - safeSpent)
  const overspent = Math.max(0, safeSpent - safeBudget)
  const categories: SpendingCategory[] = [
    { label: 'Spent', percentage: usedPercent, amount: formatCurrency(safeSpent), color: overspent > 0 ? 'var(--color-chart-6)' : 'var(--color-chart-1)' },
    {
      label: overspent > 0 ? 'Over budget' : 'Remaining',
      percentage: 100 - usedPercent,
      amount: formatCurrency(overspent || remaining),
      color: overspent > 0 ? 'var(--color-chart-6)' : 'var(--color-chart-2)',
    },
  ]

  return (
    <div className={cn('min-w-0', className)} {...props}>
      <SemiGaugeGraph title={title} subtitle={subtitle} amount={formatCurrency(safeSpent)} categories={categories} />
      <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-card px-4 py-3 text-xs">
        <div className="min-w-0">
          <span className="block text-muted-foreground">Budget</span>
          <strong className="mt-0.5 block truncate tabular-nums">{formatCurrency(safeBudget)}</strong>
        </div>
        <div
          className="min-w-0 text-right"
        >
          <span className="block text-muted-foreground">{overspent ? 'Over budget' : 'Remaining'}</span>
          <strong className={cn('mt-0.5 block truncate tabular-nums', overspent > 0 && 'text-destructive')}>
            {formatCurrency(overspent || remaining)}
          </strong>
        </div>
      </div>
    </div>
  )
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

/* ==========================================================================
   1. STACKED BAR GRAPH
   ========================================================================== */
export interface StackSegment {
  key: string;
  label?: string;
  value: number;
  color: string;
}

export interface StackedColumn {
  label: string;
  segments: StackSegment[];
}

export interface StackedBarGraphProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  data: StackedColumn[];
  timeframeData?: Record<string, StackedColumn[]>;
  legend?: { label: string; color: string }[];
  timeframeOptions?: string[];
  defaultTimeframe?: string;
  onTimeframeChange?: (timeframe: string) => void;
  cornerRadius?: string | number;
  onActionClick?: () => void;
}

export function StackedBarGraph({
  className,
  title = 'Budget',
  data = [],
  timeframeData,
  legend,
  timeframeOptions = ['Monthly', 'Quarterly', 'Yearly'],
  defaultTimeframe = 'Monthly',
  onTimeframeChange,
  cornerRadius = 4,
  onActionClick,
  ...props
}: StackedBarGraphProps) {
  const [selectedTimeframe, setSelectedTimeframe] =
    React.useState(defaultTimeframe);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState<number>(1);
  const [hoveredColIndex, setHoveredColIndex] = React.useState<number | null>(
    null,
  );

  const [cursorPos, setCursorPos] = React.useState<{
    x: number;
    y: number;
  } | null>(null);
  const [hoveredSegment, setHoveredSegment] = React.useState<{
    label: string;
    value: number;
    color: string;
  } | null>(null);

  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const activeData = React.useMemo(() => {
    if (timeframeData && timeframeData[selectedTimeframe]) {
      return timeframeData[selectedTimeframe];
    }
    return data;
  }, [data, timeframeData, selectedTimeframe]);

  // FIX 1: Dynamically derive legend from activeData segments if not explicitly passed
  const activeLegend = React.useMemo(() => {
    if (legend && legend.length > 0) return legend;

    const legendMap = new Map<string, string>();
    activeData.forEach((col) => {
      col.segments.forEach((seg) => {
        if (!legendMap.has(seg.key)) {
          legendMap.set(seg.key, seg.color);
        }
      });
    });

    return Array.from(legendMap.entries()).map(([key, color]) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      color,
    }));
  }, [legend, activeData]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const maxStackValue = React.useMemo(() => {
    if (!activeData.length) return 6000;
    const highestTotal = Math.max(
      ...activeData.map((col) =>
        col.segments.reduce((acc, s) => acc + s.value, 0),
      ),
    );
    return Math.max(highestTotal * 1.25, 1000);
  }, [activeData]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleTimeframeSelect = (option: string) => {
    setSelectedTimeframe(option);
    setIsDropdownOpen(false);
    setSelectedIndex(0);
    onTimeframeChange?.(option);
  };

  const getRadiusStyle = (position: 'top' | 'bottom' | 'middle' | 'single') => {
    const r =
      typeof cornerRadius === 'number' ? `${cornerRadius}px` : cornerRadius;
    if (position === 'single') return { borderRadius: r };
    if (position === 'top') return { borderRadius: `${r} ${r} 2px 2px` };
    if (position === 'bottom') return { borderRadius: `2px 2px ${r} ${r}` };
    return { borderRadius: '2px' };
  };

  return (
    <div
      className={cn(
        'relative w-full rounded-3xl bg-surface border border-border/40 p-6 text-foreground select-none flex flex-col justify-between',
        className,
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        setHoveredSegment(null);
        setHoveredColIndex(null);
        setCursorPos(null);
      }}
      {...props}
    >
      {/* Tooltip */}
      {hoveredSegment &&
        cursorPos &&
        (() => {
          return (
            <GraphHoverTooltip
              left={cursorPos.x}
              top={cursorPos.y}
              label={hoveredSegment.label}
              value={`$${hoveredSegment.value.toLocaleString()}`}
              color={hoveredSegment.color}
            />
          );
        })()}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold tracking-tight text-foreground">{title}</h3>
        <div className="flex items-center gap-2">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-full bg-sunken hover:bg-sunken border border-border transition-colors"
            >
              <span>{selectedTimeframe}</span>
              <ChevronDown
                className={cn(
                  'size-3.5 transition-transform duration-200',
                  isDropdownOpen && 'rotate-180',
                )}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-32 z-50 rounded-2xl bg-surface border border-border p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                {timeframeOptions.map((option) => {
                  const isSelected = option === selectedTimeframe;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleTimeframeSelect(option)}
                      className={cn(
                        'w-full flex items-center justify-between text-left text-xs px-2.5 py-1.5 rounded-xl transition-colors',
                        isSelected
                          ? 'bg-sunken text-foreground font-semibold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-sunken/50',
                      )}
                    >
                      <span>{option}</span>
                      {isSelected && (
                        <Check className="size-3.5 text-[#e6ff4b]" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {onActionClick && (
            <button
              type="button"
              onClick={onActionClick}
              className="size-8 rounded-full bg-sunken hover:bg-border flex items-center justify-center text-foreground transition-transform active:scale-95"
            >
              <ArrowUpRight className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Bar Chart */}
      <div className="relative flex items-stretch gap-4 h-60 pt-6 my-2">
        <div className="flex flex-col justify-between text-[11px] font-medium text-muted-foreground py-1 pr-1 shrink-0">
          <span>{Math.round(maxStackValue / 1000)}k</span>
          <span>{Math.round((maxStackValue * 0.66) / 1000)}k</span>
          <span>{Math.round((maxStackValue * 0.33) / 1000)}k</span>
          <span>0</span>
        </div>

        <div className="flex-1 flex items-end justify-between gap-3 h-full px-2">
          {activeData.map((col, colIdx) => {
            const isSelected = selectedIndex === colIdx;
            const isHoveredCol = hoveredColIndex === colIdx;
            const totalVal = col.segments.reduce((acc, s) => acc + s.value, 0);
            const totalHeightPercent = Math.min(
              (totalVal / maxStackValue) * 100,
              100,
            );

            const topSegment = col.segments[col.segments.length - 1];
            const topColorStyle = topSegment
              ? parseColorStyle(topSegment.color)
              : parseColorStyle('var(--color-chart-1)');

            const showHighlight =
              isHoveredCol || (isSelected && hoveredColIndex === null);

            return (
              <div
                key={colIdx}
                onClick={() => setSelectedIndex(colIdx)}
                onMouseEnter={() => setHoveredColIndex(colIdx)}
                className="group relative flex-1 flex flex-col items-center justify-end h-full cursor-pointer"
              >
                {showHighlight && (
                  <div
                    className="absolute flex flex-col items-center z-20 animate-in fade-in zoom-in-95 duration-150 transition-all pointer-events-none"
                    style={{ bottom: `calc(${totalHeightPercent}% + 22px)` }}
                  >
                    <span
                      className="text-xs font-extrabold tracking-tight whitespace-nowrap drop-shadow-md"
                      style={topColorStyle.textStyle}
                    >
                      ${totalVal.toLocaleString()}
                    </span>
                    <span
                      className="size-2 rounded-full border-2 border-[#121214] mt-1 shadow-sm"
                      style={{ backgroundColor: topColorStyle.bg }}
                    />
                  </div>
                )}

                <div
                  className="w-full max-w-[52px] flex flex-col justify-end transition-all duration-300"
                  style={{ height: `${totalHeightPercent}%` }}
                >
                  <div className="w-full h-full flex flex-col-reverse gap-[2px]">
          {col.segments.map((seg, segIdx) => {
                      const segmentPercent =
                        totalVal > 0 ? (seg.value / totalVal) * 100 : 0;
                      const isTop = segIdx === col.segments.length - 1;
                      const isBottom = segIdx === 0;
                      const pos =
                        isTop && isBottom
                          ? 'single'
                          : isTop
                            ? 'top'
                            : isBottom
                              ? 'bottom'
                              : 'middle';

              return (
                <div
                  key={segIdx}
                          onMouseEnter={(e) => {
                            e.stopPropagation();
                            setHoveredSegment({
                              label: seg.label?.trim() || seg.key,
                              value: seg.value,
                              color: seg.color,
                            });
                          }}
                  className={cn(
                    'w-full transition-all duration-200 cursor-pointer hover:brightness-125',
                    seg.color,
                  )}
                  style={{
                    height: `${segmentPercent}%`,
                    backgroundColor: parseColorStyle(seg.color).bg,
                    ...getRadiusStyle(pos),
                  }}
                        />
                      );
                    })}
                  </div>
                </div>

                <span
                  className={cn(
                    'text-xs font-medium mt-3 transition-colors shrink-0',
                    isSelected || isHoveredCol
                      ? 'text-foreground font-bold'
                      : 'text-muted-foreground',
                  )}
                >
                  {col.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Footer Legend */}
      {activeLegend.length > 0 && (
        <div className="flex items-center justify-center gap-4 flex-wrap pt-3 border-t border-border/60 mt-2 text-xs">
          {activeLegend.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: parseColorStyle(item.color).bg }}
              />
              <span className="text-muted-foreground font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   2. SEMI-GAUGE GRAPH
   ========================================================================== */
export interface SpendingCategory {
  label: string;
  percentage: number;
  color: string;
  amount?: string;
}

export interface SemiGaugeGraphProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  amount: string | number;
  categories?: SpendingCategory[];
  onActionClick?: () => void;
}

const DISTINCT_GAUGE_COLORS = [
'var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)',
'var(--color-chart-6)', 'var(--color-chart-7)', 'var(--color-chart-8)', 'var(--color-ink)', '#f97316',
]

export function SemiGaugeGraph({
  className,
  title = 'Top spending',
  subtitle,
  amount = '$789',
  categories = [
    { label: 'Auto & Transport', percentage: 40, color: '#00bdf9' },
    { label: 'Food', percentage: 25, color: '#e6ff4b' },
    { label: 'Clothes', percentage: 20, color: '#03d791' },
    { label: 'Other', percentage: 15, color: '#ffffff' },
  ],
  onActionClick,
  ...props
}: SemiGaugeGraphProps) {
  const [activeIndex, setActiveIndex] = React.useState<number>(0);
  const [cursorPos, setCursorPos] = React.useState<{ x: number; y: number } | null>(null);
  const chartCategories = React.useMemo(() => {
    const usedColors = new Set<string>()
    return categories.map((category, index) => {
      let color = category.color
      if (usedColors.has(color.toLowerCase())) {
        color = DISTINCT_GAUGE_COLORS.find((candidate) => !usedColors.has(candidate.toLowerCase())) ?? ''
        if (!color) {
          let hue = (index * 137.508) % 360
          color = `hsl(${hue} 82% 60%)`
          while (usedColors.has(color.toLowerCase())) {
            hue = (hue + 137.508) % 360
            color = `hsl(${hue} 82% 60%)`
          }
        }
      }
      usedColors.add(color.toLowerCase())
      return { ...category, color }
    })
  }, [categories])

  const cx = 100;
  const cy = 95;
  const r = 70;
  const innerR = 42;

  const getCoordinates = (radius: number, angleRad: number) => ({
    x: cx + radius * Math.cos(angleRad),
    y: cy - radius * Math.sin(angleRad),
  });

  return (
    <div
      className={cn(
        'w-full rounded-3xl bg-surface border border-border/40 p-6 text-foreground select-none flex flex-col justify-between',
        className,
      )}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        setCursorPos({ x: event.clientX - rect.left, y: event.clientY - rect.top })
      }}
      onMouseLeave={() => setCursorPos(null)}
      {...props}
    >
      {cursorPos && chartCategories[activeIndex] && <GraphHoverTooltip
        left={cursorPos.x}
        top={cursorPos.y}
        label={`${chartCategories[activeIndex].label} (${chartCategories[activeIndex].percentage}%)`}
        value={chartCategories[activeIndex].amount ?? `${chartCategories[activeIndex].percentage}%`}
        color={chartCategories[activeIndex].color}
      />}
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0">
          <h3 className="truncate text-xl font-bold tracking-tight text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {onActionClick && (
          <button
            type="button"
            onClick={onActionClick}
            className="size-8 rounded-full bg-sunken hover:bg-border flex items-center justify-center text-foreground transition-transform active:scale-95"
          >
            <ArrowUpRight className="size-4" />
          </button>
        )}
      </div>

      {/* Upward Arching Arc */}
      <div className="relative flex flex-col items-center justify-center my-2 h-44">
        <svg
          viewBox="0 0 200 115"
          className="w-full max-w-[220px] overflow-visible"
        >
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="var(--color-chart-grid)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {chartCategories.reduce<{ angle: number; nodes: React.ReactNode[] }>(
            (state, cat, idx) => {
            const gap = 0.05;
            const segAngle = (cat.percentage / 100) * Math.PI;
            const startAngle = state.angle - gap / 2;
            const endAngle = state.angle - segAngle + gap / 2;
            const nextAngle = state.angle - segAngle;
            const isHovered = activeIndex === idx;

            if (isHovered) {
              const outerStart = getCoordinates(r + 6, startAngle);
              const outerEnd = getCoordinates(r + 6, endAngle);
              const innerStart = getCoordinates(innerR, startAngle);
              const innerEnd = getCoordinates(innerR, endAngle);

              const wedgeD = [
                `M ${outerStart.x} ${outerStart.y}`,
                `A ${r + 6} ${r + 6} 0 0 1 ${outerEnd.x} ${outerEnd.y}`,
                `L ${innerEnd.x} ${innerEnd.y}`,
                `A ${innerR} ${innerR} 0 0 0 ${innerStart.x} ${innerStart.y}`,
                `Z`,
              ].join(' ');

              state.nodes.push(
                <path
                  key={idx}
                  d={wedgeD}
                  fill={cat.color}
                  fillOpacity="0.22"
                  stroke={cat.color}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setActiveIndex(idx)}
                />,
              );
              return { angle: nextAngle, nodes: state.nodes };
            }

            const start = getCoordinates(r, startAngle);
            const end = getCoordinates(r, endAngle);
            const arcD = `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`;

            state.nodes.push(
              <path
                key={idx}
                d={arcD}
                fill="none"
                stroke={cat.color}
                strokeWidth="3.5"
                strokeLinecap="round"
                className="cursor-pointer hover:stroke-white transition-all duration-200"
                onMouseEnter={() => setActiveIndex(idx)}
              />,
            );
            return { angle: nextAngle, nodes: state.nodes };
            },
            { angle: Math.PI, nodes: [] },
          ).nodes}
        </svg>

        {/* Amount Centerpiece */}
        <div className="absolute bottom-2 text-center pointer-events-none">
          <span className="text-3xl font-extrabold tracking-tight text-foreground">
            {typeof amount === 'number' ? `$${amount}` : amount}
          </span>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-2 mt-2 pt-2 border-t border-border/60 max-h-40 overflow-y-auto pr-1">
        {chartCategories.map((cat, idx) => {
          const isSelected = activeIndex === idx;

          return (
            <div
              key={idx}
              onMouseEnter={() => setActiveIndex(idx)}
              className={cn(
                'flex min-w-0 items-center justify-between gap-2 text-xs px-1.5 py-1 rounded-lg cursor-pointer transition-colors',
                isSelected ? 'bg-sunken' : 'hover:bg-sunken/60',
              )}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span
                  className={cn(
                    'min-w-0 truncate font-medium transition-colors',
                    isSelected ? 'text-foreground font-bold' : 'text-muted-foreground',
                  )}
                >
                  {cat.label}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span
                  className={cn(
                    'font-bold transition-colors',
                    isSelected ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {cat.percentage}%
                </span>
                {cat.amount && <span className="text-[10px] text-muted-foreground">{cat.amount}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ==========================================================================
   3. AREA & LINE GRAPH (Fintech Performance / Asset Growth)
   ========================================================================== */
export interface LinePoint {
  label: string;
  value: number;
}

export interface AreaLineGraphProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  data: LinePoint[];
  strokeColor?: string;
  gradientStart?: string;
  gradientStop?: string;
  onActionClick?: () => void;
  currencyPrefix?: string;
}

export function AreaLineGraph({
  className,
  title = 'Portfolio Value',
  subtitle,
  data = [],
  strokeColor = 'var(--color-chart-1)',
  gradientStart = 'color-mix(in srgb, var(--color-chart-1) 35%, transparent)',
  gradientStop = 'transparent',
  onActionClick,
  currencyPrefix = '$',
  ...props
}: AreaLineGraphProps) {
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);
  const [cursorPos, setCursorPos] = React.useState<{ x: number; y: number } | null>(null);
  const gradientId = React.useId().replaceAll(':', '');

  const values = data.map((d) => d.value);
  const minVal = Math.min(...(values.length ? values : [0])) * 0.95;
  const maxVal = Math.max(...(values.length ? values : [100])) * 1.05;

  const width = 500;
  const height = 180;
  const paddingY = 15;

  const points = React.useMemo(() => {
    if (!data.length) return [];
    return data.map((pt, i) => {
      const x = data.length > 1 ? (i / (data.length - 1)) * width : width / 2;
      const normalizedY = (pt.value - minVal) / (maxVal - minVal || 1);
      const y = height - paddingY - normalizedY * (height - 2 * paddingY);
      return { x, y, ...pt };
    });
  }, [data, minVal, maxVal]);

  const lineD = React.useMemo(() => {
    if (!points.length) return '';
    return points.reduce(
      (acc, pt, i) =>
        i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`,
      '',
    );
  }, [points]);

  const areaD = React.useMemo(() => {
    if (!points.length) return '';
    return `${lineD} L ${width} ${height} L 0 ${height} Z`;
  }, [lineD, points]);

  const currentHovered =
    hoveredIdx !== null ? points[hoveredIdx] : points[points.length - 1];

  return (
    <div
      className={cn(
        'w-full rounded-3xl bg-surface border border-border/40 p-6 text-foreground select-none flex flex-col justify-between',
        className,
      )}
      {...props}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-foreground">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {onActionClick && (
          <button
            type="button"
            onClick={onActionClick}
            className="size-8 rounded-full bg-sunken hover:bg-border flex items-center justify-center text-foreground transition-transform active:scale-95"
          >
            <ArrowUpRight className="size-4" />
          </button>
        )}
      </div>

      {/* Dynamic Display Value */}
      <div className="my-2">
        <span className="text-3xl font-extrabold tracking-tight text-foreground">
          {currencyPrefix}
          {currentHovered ? currentHovered.value.toLocaleString() : '0'}
        </span>
        {currentHovered && (
          <span className="text-xs text-muted-foreground ml-2 font-medium">
            {currentHovered.label}
          </span>
        )}
      </div>

      {/* SVG Line / Area Graph */}
      <div
        className="relative w-full h-44 mt-2"
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          setCursorPos({ x: event.clientX - rect.left, y: event.clientY - rect.top })
        }}
        onMouseLeave={() => { setHoveredIdx(null); setCursorPos(null) }}
      >
        {hoveredIdx !== null && currentHovered && cursorPos && <GraphHoverTooltip
          left={cursorPos.x}
          top={cursorPos.y}
          label={currentHovered.label}
          value={`${currencyPrefix}${currentHovered.value.toLocaleString()}`}
          color={strokeColor}
        />}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id={`area-grad-${gradientId}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={gradientStart} />
              <stop offset="100%" stopColor={gradientStop} />
            </linearGradient>
          </defs>

          {/* Area Fill */}
          <path
            d={areaD}
            fill={`url(#area-grad-${gradientId})`}
          />

          {/* Line Stroke */}
          <path
            d={lineD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Crosshair Vertical Guide */}
          {hoveredIdx !== null && points[hoveredIdx] && (
            <line
              x1={points[hoveredIdx].x}
              y1={0}
              x2={points[hoveredIdx].x}
              y2={height}
              stroke="var(--color-chart-crosshair)"
              strokeDasharray="4 4"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* Fixed Pixel-Perfect Hover Indicator Dot */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <div
            className="pointer-events-none absolute size-4 rounded-full flex items-center justify-center transition-all duration-75"
            style={{
              left: `${(points[hoveredIdx].x / width) * 100}%`,
              top: `${(points[hoveredIdx].y / height) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="size-4 rounded-full border-2 border-[#121214] flex items-center justify-center shadow-lg"
              style={{ backgroundColor: strokeColor }}
            >
              <div className="size-1.5 rounded-full bg-surface" />
            </div>
          </div>
        )}

        {/* Hover Capture Columns */}
        <div className="absolute inset-0 flex">
          {points.map((_, idx) => (
            <div
              key={idx}
              className="flex-1 h-full cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   4. MINI SPARKLINE GRAPH (KPI / Dynamic Balance Card Helper)
   ========================================================================== */
export interface MiniSparklineProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string;
  change: string;
  isPositive?: boolean;
  data: number[];
  color?: string;
}

export function MiniSparklineGraph({
  className,
  label,
  value,
  change,
  isPositive = true,
  data = [],
  color = 'var(--color-chart-1)',
  ...props
}: MiniSparklineProps) {
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);
  const [cursorPos, setCursorPos] = React.useState<{ x: number; y: number } | null>(null);
  const minVal = data.length ? Math.min(...data) : 0;
  const maxVal = data.length ? Math.max(...data) : 0;
  const width = 120;
  const height = 40;

  const points = data
    .map((v, i) => {
      const x = data.length > 1 ? (i / (data.length - 1)) * width : width / 2;
      const y = height - ((v - minVal) / (maxVal - minVal || 1)) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div
      className={cn(
        'w-full rounded-2xl bg-surface border border-border/40 p-4 flex items-center justify-between',
        className,
      )}
      {...props}
    >
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
        <div className="flex items-center gap-1 mt-1">
          {isPositive ? (
            <TrendingUp className="size-3.5 text-emerald-400" />
          ) : (
            <TrendingDown className="size-3.5 text-rose-500" />
          )}
          <span
            className={cn(
              'text-xs font-semibold',
              isPositive ? 'text-emerald-400' : 'text-rose-500',
            )}
          >
            {change}
          </span>
        </div>
      </div>

      <div
        className="relative h-10 w-28"
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          setCursorPos({ x: event.clientX - rect.left, y: event.clientY - rect.top })
        }}
        onMouseLeave={() => { setHoveredIdx(null); setCursorPos(null) }}
      >
        {hoveredIdx !== null && cursorPos && <GraphHoverTooltip
          left={cursorPos.x}
          top={cursorPos.y}
          label={`${label} ${hoveredIdx + 1}`}
          value={data[hoveredIdx].toLocaleString()}
          color={color}
        />}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
        >
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
        <div className="absolute inset-0 flex">
          {data.map((_, index) => <div
            key={index}
            className="h-full flex-1 cursor-pointer"
            onMouseEnter={() => setHoveredIdx(index)}
          />)}
        </div>
      </div>
    </div>
  );
}
