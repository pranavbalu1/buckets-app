import * as React from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  Check,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ==========================================================================
   COLOR MAPPER HELPER
   ========================================================================== */
function parseColorStyle(colorClass: string) {
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
    'bg-[#e6ff4b]': '#e6ff4b',
    'bg-[#b0cc29]': '#b0cc29',
    'bg-[#6d8218]': '#6d8218',
    'bg-[#42500d]': '#42500d',
  };

  const hex = colorMap[colorClass] || '#e6ff4b';
  return {
    bg: hex,
    textStyle: { color: hex },
    borderStyle: { borderColor: hex },
  };
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
    key: string;
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
        'relative w-full rounded-3xl bg-[#121214] border border-border/40 p-6 text-foreground select-none flex flex-col justify-between',
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
          const segColorProps = parseColorStyle(hoveredSegment.color);
          return (
            <div
              className="pointer-events-none absolute z-50 bg-zinc-900/95 backdrop-blur-md border text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-2xl transition-all duration-75 -translate-x-1/2 -translate-y-12 flex items-center gap-2"
              style={{
                left: `${cursorPos.x}px`,
                top: `${cursorPos.y}px`,
                borderColor: segColorProps.bg,
              }}
            >
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: segColorProps.bg }}
              />
              <span className="capitalize text-zinc-300 font-medium">
                {hoveredSegment.key}:
              </span>
              <span style={segColorProps.textStyle}>
                ${hoveredSegment.value.toLocaleString()}
              </span>
            </div>
          );
        })()}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold tracking-tight text-white">{title}</h3>
        <div className="flex items-center gap-2">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors"
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
              <div className="absolute right-0 mt-2 w-32 z-50 rounded-2xl bg-zinc-900 border border-zinc-800 p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
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
                          ? 'bg-zinc-800 text-white font-semibold'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50',
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
              className="size-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-white transition-transform active:scale-95"
            >
              <ArrowUpRight className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Bar Chart */}
      <div className="relative flex items-stretch gap-4 h-60 pt-6 my-2">
        <div className="flex flex-col justify-between text-[11px] font-medium text-zinc-500 py-1 pr-1 shrink-0">
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
              : parseColorStyle('#e6ff4b');

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
                              key: seg.key,
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
                      ? 'text-white font-bold'
                      : 'text-zinc-500',
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
        <div className="flex items-center justify-center gap-4 flex-wrap pt-3 border-t border-zinc-800/60 mt-2 text-xs">
          {activeLegend.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span
                className={cn('size-2 rounded-full', item.color)}
                style={
                  item.color.startsWith('#')
                    ? { backgroundColor: item.color }
                    : undefined
                }
              />
              <span className="text-zinc-400 font-medium">{item.label}</span>
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
}

export interface SemiGaugeGraphProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  amount: string | number;
  categories?: SpendingCategory[];
  onActionClick?: () => void;
}

export function SemiGaugeGraph({
  className,
  title = 'Top spending',
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
        'w-full rounded-3xl bg-[#121214] border border-border/40 p-6 text-foreground select-none flex flex-col justify-between',
        className,
      )}
      {...props}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold tracking-tight text-white">{title}</h3>
        {onActionClick && (
          <button
            type="button"
            onClick={onActionClick}
            className="size-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-white transition-transform active:scale-95"
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
            stroke="#27272a"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {categories.reduce<{ angle: number; nodes: React.ReactNode[] }>(
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
          <span className="text-3xl font-extrabold tracking-tight text-white">
            {typeof amount === 'number' ? `$${amount}` : amount}
          </span>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-2 mt-2 pt-2 border-t border-zinc-800/60 max-h-40 overflow-y-auto pr-1">
        {categories.map((cat, idx) => {
          const isSelected = activeIndex === idx;

          return (
            <div
              key={idx}
              onMouseEnter={() => setActiveIndex(idx)}
              className={cn(
                'flex items-center justify-between text-xs px-1.5 py-1 rounded-lg cursor-pointer transition-colors',
                isSelected ? 'bg-zinc-800/60' : 'hover:bg-zinc-800/30',
              )}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span
                  className={cn(
                    'font-medium transition-colors',
                    isSelected ? 'text-white font-bold' : 'text-zinc-300',
                  )}
                >
                  {cat.label}
                </span>
              </div>
              <span
                className={cn(
                  'font-bold transition-colors',
                  isSelected ? 'text-white' : 'text-zinc-400',
                )}
              >
                {cat.percentage}%
              </span>
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
  strokeColor = '#e6ff4b',
  gradientStart = 'rgba(230, 255, 75, 0.35)',
  gradientStop = 'rgba(230, 255, 75, 0.0)',
  onActionClick,
  currencyPrefix = '$',
  ...props
}: AreaLineGraphProps) {
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

  const values = data.map((d) => d.value);
  const minVal = Math.min(...(values.length ? values : [0])) * 0.95;
  const maxVal = Math.max(...(values.length ? values : [100])) * 1.05;

  const width = 500;
  const height = 180;
  const paddingY = 15;

  const points = React.useMemo(() => {
    if (!data.length) return [];
    return data.map((pt, i) => {
      const x = (i / (data.length - 1)) * width;
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
        'w-full rounded-3xl bg-[#121214] border border-border/40 p-6 text-foreground select-none flex flex-col justify-between',
        className,
      )}
      {...props}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-white">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {onActionClick && (
          <button
            type="button"
            onClick={onActionClick}
            className="size-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-white transition-transform active:scale-95"
          >
            <ArrowUpRight className="size-4" />
          </button>
        )}
      </div>

      {/* Dynamic Display Value */}
      <div className="my-2">
        <span className="text-3xl font-extrabold tracking-tight text-white">
          {currencyPrefix}
          {currentHovered ? currentHovered.value.toLocaleString() : '0'}
        </span>
        {currentHovered && (
          <span className="text-xs text-zinc-400 ml-2 font-medium">
            {currentHovered.label}
          </span>
        )}
      </div>

      {/* SVG Line / Area Graph */}
      <div className="relative w-full h-44 mt-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id={`area-grad-${title.replace(/\s+/g, '')}`}
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
            fill={`url(#area-grad-${title.replace(/\s+/g, '')})`}
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
              stroke="rgba(255,255,255,0.25)"
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
              <div className="size-1.5 rounded-full bg-[#121214]" />
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
              onMouseLeave={() => setHoveredIdx(null)}
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
  color = '#e6ff4b',
  ...props
}: MiniSparklineProps) {
  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const width = 120;
  const height = 40;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - minVal) / (maxVal - minVal || 1)) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div
      className={cn(
        'w-full rounded-2xl bg-[#121214] border border-border/40 p-4 flex items-center justify-between',
        className,
      )}
      {...props}
    >
      <div>
        <p className="text-xs text-zinc-400 font-medium">{label}</p>
        <p className="text-xl font-bold text-white mt-0.5">{value}</p>
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

      <div className="w-28 h-10">
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
      </div>
    </div>
  );
}
