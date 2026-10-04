import * as React from 'react';
import {
  StackedBarGraph,
  SemiGaugeGraph,
  AreaLineGraph,
  MiniSparklineGraph,
} from '@/components/ui/charts';
import type {
  SpendingCategory,
  StackedColumn,
  LinePoint,
} from '@/components/ui/charts';
import { cn } from '@/lib/utils';

/* ==========================================================================
   SHOWCASE PRESET DATASETS
   ========================================================================== */

// 1. Personal Budget Tracker Data
const budgetStackedData: StackedColumn[] = [
  {
    label: 'Jun',
    segments: [
      { key: 'savings', value: 800, color: 'bg-[#42500d]' },
      { key: 'scheduled', value: 1000, color: 'bg-[#6d8218]' },
      { key: 'spent', value: 1100, color: 'bg-[#b0cc29]' },
      { key: 'income', value: 900, color: 'bg-[#e6ff4b]' },
    ],
  },
  {
    label: 'Jul',
    segments: [
      { key: 'savings', value: 1000, color: 'bg-[#42500d]' },
      { key: 'scheduled', value: 1200, color: 'bg-[#6d8218]' },
      { key: 'spent', value: 1400, color: 'bg-[#b0cc29]' },
      { key: 'income', value: 1047, color: 'bg-[#e6ff4b]' },
    ],
  },
  {
    label: 'Aug',
    segments: [
      { key: 'savings', value: 500, color: 'bg-[#42500d]' },
      { key: 'scheduled', value: 800, color: 'bg-[#6d8218]' },
      { key: 'spent', value: 900, color: 'bg-[#b0cc29]' },
      { key: 'income', value: 700, color: 'bg-[#e6ff4b]' },
    ],
  },
  {
    label: 'Sept',
    segments: [
      { key: 'savings', value: 1200, color: 'bg-[#42500d]' },
      { key: 'scheduled', value: 1300, color: 'bg-[#6d8218]' },
      { key: 'spent', value: 1500, color: 'bg-[#b0cc29]' },
      { key: 'income', value: 1100, color: 'bg-[#e6ff4b]' },
    ],
  },
  {
    label: 'Oct',
    segments: [
      { key: 'savings', value: 900, color: 'bg-[#42500d]' },
      { key: 'scheduled', value: 1100, color: 'bg-[#6d8218]' },
      { key: 'spent', value: 1200, color: 'bg-[#b0cc29]' },
      { key: 'income', value: 1000, color: 'bg-[#e6ff4b]' },
    ],
  },
];

const budgetGaugeCategories: SpendingCategory[] = [
  { label: 'Auto & Transport', percentage: 40, color: '#00bdf9' },
  { label: 'Food & Dining', percentage: 25, color: '#e6ff4b' },
  { label: 'Shopping', percentage: 20, color: '#03d791' },
  { label: 'Bills & Utilities', percentage: 15, color: '#ffffff' },
];

// Line Chart Datasets
const portfolioLineData: LinePoint[] = [
  { label: 'Jan 1', value: 12400 },
  { label: 'Jan 8', value: 14200 },
  { label: 'Jan 15', value: 13800 },
  { label: 'Jan 22', value: 16500 },
  { label: 'Jan 29', value: 15900 },
  { label: 'Feb 5', value: 18400 },
  { label: 'Feb 12', value: 21200 },
];

const cryptoLineData: LinePoint[] = [
  { label: '00:00', value: 62100 },
  { label: '04:00', value: 61800 },
  { label: '08:00', value: 63400 },
  { label: '12:00', value: 62900 },
  { label: '16:00', value: 64800 },
  { label: '20:00', value: 65250 },
];

// 2. SaaS Revenue vs Expenses Data
const revenueStackedData: StackedColumn[] = [
  {
    label: 'Q1',
    segments: [
      { key: 'expenses', value: 8500, color: 'bg-rose-500' },
      { key: 'revenue', value: 10000, color: 'bg-emerald-400' },
    ],
  },
  {
    label: 'Q2',
    segments: [
      { key: 'expenses', value: 9200, color: 'bg-rose-500' },
      { key: 'revenue', value: 15000, color: 'bg-emerald-400' },
    ],
  },
  {
    label: 'Q3',
    segments: [
      { key: 'expenses', value: 6100, color: 'bg-rose-500' },
      { key: 'revenue', value: 9000, color: 'bg-emerald-400' },
    ],
  },
  {
    label: 'Q4',
    segments: [
      { key: 'expenses', value: 11800, color: 'bg-rose-500' },
      { key: 'revenue', value: 18000, color: 'bg-emerald-400' },
    ],
  },
];

const revenueGaugeCategories: SpendingCategory[] = [
  { label: 'Payroll', percentage: 50, color: '#f43f5e' },
  { label: 'Marketing', percentage: 30, color: '#3b82f6' },
  { label: 'SaaS Tools', percentage: 20, color: '#a855f7' },
];

// 3. Weekly Sales Data
const salesStackedData: StackedColumn[] = [
  {
    label: 'Mon',
    segments: [{ key: 'sales', value: 320, color: 'bg-cyan-400' }],
  },
  {
    label: 'Tue',
    segments: [{ key: 'sales', value: 890, color: 'bg-cyan-400' }],
  },
  {
    label: 'Wed',
    segments: [{ key: 'sales', value: 1450, color: 'bg-cyan-400' }],
  },
  {
    label: 'Thu',
    segments: [{ key: 'sales', value: 610, color: 'bg-cyan-400' }],
  },
  {
    label: 'Fri',
    segments: [{ key: 'sales', value: 2100, color: 'bg-cyan-400' }],
  },
];

const salesGaugeCategories: SpendingCategory[] = [
  { label: 'Hardware', percentage: 70, color: '#22d3ee' },
  { label: 'Software', percentage: 30, color: '#f472b6' },
];

/* ==========================================================================
   CHARTS SHOWCASE COMPONENT
   ========================================================================== */

export function ChartsShowcase() {
  const [activeTab, setActiveTab] = React.useState<'interactive' | 'grid'>(
    'interactive',
  );
  const [selectedScenario, setSelectedScenario] = React.useState<number>(0);

  const scenarios = [
    {
      title: 'Personal Finance Overview',
      description:
        'Stack bar graph paired with portfolio performance area chart & KPI sparklines.',
      cornerRadius: 4,
      stackedData: budgetStackedData,
      gaugeCategories: budgetGaugeCategories,
      gaugeAmount: '$789',
    },
    {
      title: 'SaaS Revenue & Asset Growth',
      description:
        'Capsule bar graph paired with multi-trend dynamic asset charts.',
      cornerRadius: 12,
      stackedData: revenueStackedData,
      gaugeCategories: revenueGaugeCategories,
      gaugeAmount: '$24,200',
    },
    {
      title: 'Weekly Direct Sales & Crypto',
      description: 'Cyan-themed analytics suite with quick metric sparklines.',
      cornerRadius: 6,
      stackedData: salesStackedData,
      gaugeCategories: salesGaugeCategories,
      gaugeAmount: '$5,370',
    },
  ];

  const current = scenarios[selectedScenario];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 p-6 text-foreground bg-black min-h-screen">
      {/* Showcase Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Fintech Charts Suite
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Modular fintech visualization components (Bar, Semi-Gauge,
            Area/Line, & Sparklines).
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-2xl border border-zinc-800 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('interactive')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold transition-colors',
              activeTab === 'interactive'
                ? 'bg-[#e6ff4b] text-black shadow-md'
                : 'text-zinc-400 hover:text-white',
            )}
          >
            Interactive Controls
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('grid')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold transition-colors',
              activeTab === 'grid'
                ? 'bg-[#e6ff4b] text-black shadow-md'
                : 'text-zinc-400 hover:text-white',
            )}
          >
            All Variations Grid
          </button>
        </div>
      </div>

      {/* VIEW 1: INTERACTIVE CONTROL PANEL */}
      {activeTab === 'interactive' && (
        <div className="space-y-6">
          {/* Top Metric Sparkline Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MiniSparklineGraph
              label="Total Net Worth"
              value="$142,850.00"
              change="+14.2%"
              isPositive={true}
              data={[120, 125, 122, 130, 138, 142.8]}
              color="#e6ff4b"
            />
            <MiniSparklineGraph
              label="Monthly Spend"
              value="$4,210.00"
              change="-3.8%"
              isPositive={true}
              data={[5000, 4800, 4600, 4400, 4210]}
              color="#34d399"
            />
            <MiniSparklineGraph
              label="BTC Equity"
              value="$65,250.00"
              change="-1.4%"
              isPositive={false}
              data={[68000, 67000, 64000, 66000, 65250]}
              color="#f43f5e"
            />
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Select Preset Use-Case:
            </span>
            {scenarios.map((sc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedScenario(idx)}
                className={cn(
                  'px-4 py-2 rounded-2xl text-xs font-medium transition-all border',
                  selectedScenario === idx
                    ? 'bg-zinc-800 border-[#e6ff4b] text-white font-bold shadow-lg'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/50',
                )}
              >
                {sc.title}
              </button>
            ))}
          </div>

          <p className="text-xs text-zinc-500 italic">{current.description}</p>

          {/* Interactive Chart Pair */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StackedBarGraph
              title={current.title}
              data={current.stackedData}
              cornerRadius={current.cornerRadius}
              className="md:col-span-2"
              onActionClick={() => alert(`Navigating to ${current.title}`)}
            />
            <SemiGaugeGraph
              title="Category Distribution"
              categories={current.gaugeCategories}
              amount={current.gaugeAmount}
              onActionClick={() => alert('Viewing spending breakdown')}
            />
          </div>

          {/* Area Line Performance Chart */}
          <AreaLineGraph
            title="Portfolio Performance (YTD)"
            subtitle="Hover along the curve to view real-time valuation crosshairs"
            data={portfolioLineData}
            strokeColor="#e6ff4b"
            gradientStart="rgba(230, 255, 75, 0.3)"
            gradientStop="rgba(230, 255, 75, 0.0)"
            onActionClick={() => alert('Opening details')}
          />
        </div>
      )}

      {/* VIEW 2: FULL GRID DISPLAY */}
      {activeTab === 'grid' && (
        <div className="space-y-10">
          {/* Section 1 */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-zinc-200 border-l-2 border-[#e6ff4b] pl-3">
              1. Personal Finance & Portfolio Performance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StackedBarGraph
                title="Budget"
                data={budgetStackedData}
                cornerRadius={4}
                className="md:col-span-2"
              />
              <SemiGaugeGraph
                title="Top Spending"
                categories={budgetGaugeCategories}
                amount="$789"
              />
            </div>
            <AreaLineGraph
              title="Investment Asset Growth"
              data={portfolioLineData}
              strokeColor="#e6ff4b"
              gradientStart="rgba(230, 255, 75, 0.3)"
              gradientStop="rgba(230, 255, 75, 0.0)"
            />
          </div>

          {/* Section 2 */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-zinc-200 border-l-2 border-emerald-400 pl-3">
              2. SaaS Revenue & Crypto Tracking
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StackedBarGraph
                title="Quarterly Cashflow"
                data={revenueStackedData}
                cornerRadius={12}
                legend={[
                  { label: 'Revenue', color: 'bg-emerald-400' },
                  { label: 'Expenses', color: 'bg-rose-500' },
                ]}
                className="md:col-span-2"
              />
              <SemiGaugeGraph
                title="Expense Split"
                categories={revenueGaugeCategories}
                amount="$24,200"
              />
            </div>
            <AreaLineGraph
              title="BTC 24h Trend"
              data={cryptoLineData}
              strokeColor="#34d399"
              gradientStart="rgba(52, 211, 153, 0.3)"
              gradientStop="rgba(52, 211, 153, 0.0)"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ChartsShowcase;
