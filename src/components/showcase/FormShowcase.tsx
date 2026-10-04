import * as React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Wallet,
  ShoppingBag,
  Coffee,
  Zap,
  TrendingUp,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { List, type ListItemData } from '@/components/ui/list';

import { FormField, FormSection } from '../ui/form-field';
import { Select } from '../ui/select';
import { CurrencyInput } from '../ui/currency-input';
import { SegmentedControl } from '../ui/segmented-control';

/* ==========================================================================
   MOCK DATA FOR SHOWCASE
   ========================================================================== */
const mockTransactions: ListItemData[] = [
  {
    id: '1',
    title: 'Apple Store',
    subtitle: 'Electronics & Gear',
    date: 'Aug 1, 2026',
    amount: 1299.0,
    isPositive: false,
    type: 'expense',
    category: 'Shopping',
    icon: ShoppingBag,
    iconVariant: 'bg-zinc-800 text-cyan-400',
  },
  {
    id: '2',
    title: 'Client Payment',
    subtitle: 'Invoice #4029',
    date: 'Jul 31, 2026',
    amount: 3450.0,
    isPositive: true,
    type: 'income',
    category: 'Freelance',
    icon: Wallet,
    iconVariant: 'bg-zinc-800 text-emerald-400',
    badge: 'Paid',
  },
  {
    id: '3',
    title: 'Starbucks Coffee',
    subtitle: 'Morning Refill',
    date: 'Jul 30, 2026',
    amount: 6.75,
    isPositive: false,
    type: 'expense',
    category: 'Food',
    icon: Coffee,
    iconVariant: 'bg-zinc-800 text-amber-400',
  },
  {
    id: '4',
    title: 'Electric Utility',
    subtitle: 'Monthly Bill',
    date: 'Jul 28, 2026',
    amount: 142.5,
    isPositive: false,
    type: 'expense',
    category: 'Utilities',
    icon: Zap,
    iconVariant: 'bg-zinc-800 text-purple-400',
  },
];

/* ==========================================================================
   MASTER FORM SHOWCASE COMPONENT
   ========================================================================== */
export function FormShowcase() {
  // Demo State: Add Transaction Form
  const [txType, setTxType] = React.useState('expense');
  const [txAmount, setTxAmount] = React.useState<number>();
  const [txCategory, setTxCategory] = React.useState('');
  const [txDescription, setTxDescription] = React.useState('');
  const [txSubmitted, setTxSubmitted] = React.useState(false);

  // Demo State: Goal / Budget Form
  const [budgetGoalName, setBudgetGoalName] = React.useState('Emergency Fund');
  const [targetAmount, setTargetAmount] = React.useState<number>(5000);
  const [monthlyContribution, setMonthlyContribution] =
    React.useState<number>(500);

  // Demo State: Search & Filter Panel synced with List
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('all');
  const [activeTabFilter] = React.useState('all');

  // Filter list items based on search query, dropdown, and tabs
  const filteredListItems = React.useMemo(() => {
    return mockTransactions.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subtitle?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' ||
        item.category?.toLowerCase() === selectedCategory.toLowerCase();

      const matchesTab =
        activeTabFilter === 'all' || item.type === activeTabFilter;

      return matchesSearch && matchesCategory && matchesTab;
    });
  }, [searchQuery, selectedCategory, activeTabFilter]);

  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTxSubmitted(true);
    setTimeout(() => setTxSubmitted(false), 3000);
  };

  return (
    <div className="w-full min-h-screen bg-background text-foreground p-4 md:p-8 space-y-10 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="space-y-2 border-b border-border/60 pb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="size-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Form Components Showcase
          </h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          A showcase of accessible, modular form elements built with your core
          UI primitives. Designed for finance, analytics, and interactive data
          entry.
        </p>
      </div>

      {/* SECTION 1: INTERACTIVE TRANSACTION CREATOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary" />
            <h2 className="text-lg font-bold tracking-tight">
              1. Interactive Transaction Entry
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Uses{' '}
            <code className="text-primary font-mono">SegmentedControl</code>,{' '}
            <code className="text-primary font-mono">CurrencyInput</code>,{' '}
            <code className="text-primary font-mono">Select</code>, and{' '}
            <code className="text-primary font-mono">FormField</code> wrappers.
          </p>

          <form
            onSubmit={handleTransactionSubmit}
            className="rounded-3xl bg-card border border-border/70 p-6 shadow-xl space-y-5"
          >
            {txSubmitted && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold animate-in fade-in duration-200">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>Transaction successfully logged!</span>
              </div>
            )}

            <FormSection
              title="Record Movement"
              description="Choose entry direction and specify values."
            >
              {/* Transaction Type Segment */}
              <FormField label="Entry Type" required>
                <SegmentedControl
                  value={txType}
                  onChange={setTxType}
                  options={[
                    { id: 'expense', label: 'Expense', icon: ArrowUpRight },
                    { id: 'income', label: 'Income', icon: ArrowDownLeft },
                  ]}
                />
              </FormField>

              {/* Currency Input */}
              <FormField
                label="Amount"
                required
                helperText="Formatted with dynamic currency symbols"
              >
                <CurrencyInput
                  placeholder="0.00"
                  value={txAmount !== undefined ? txAmount : ''}
                  onValueChange={setTxAmount}
                  required
                />
              </FormField>

              {/* Title Input */}
              <FormField label="Payee / Description" required>
                <Input
                  placeholder="e.g. Apple Store, Freelance Work"
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  required
                />
              </FormField>

              {/* Two Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Category">
                  <Select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    placeholder="Select category"
                    options={[
                      { value: 'shopping', label: 'Shopping & Gear' },
                      { value: 'food', label: 'Food & Dining' },
                      { value: 'freelance', label: 'Freelance & Business' },
                      { value: 'utilities', label: 'Utilities & Services' },
                    ]}
                  />
                </FormField>

                <FormField label="Date">
                  <Input type="date" defaultValue="2026-08-01" />
                </FormField>
              </div>
            </FormSection>

            {/* Form Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                variant="ghost"
                size="default"
                type="button"
                onClick={() => {
                  setTxAmount(undefined);
                  setTxDescription('');
                  setTxCategory('');
                }}
              >
                Reset
              </Button>
              <Button variant="default" size="default" type="submit">
                <Plus className="size-4 mr-1" />
                Save Transaction
              </Button>
            </div>
          </form>
        </div>

        {/* Live State Preview Box */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-cyan-400" />
            <h2 className="text-lg font-bold tracking-tight">
              Form State Output
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Real-time visual summary of the submitted payload.
          </p>

          <div className="rounded-3xl bg-card border border-border/70 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Payload Preview
              </span>
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide',
                  txType === 'income'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/20 text-rose-400',
                )}
              >
                {txType}
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">amount:</span>
                <span className="font-bold text-foreground">
                  ${txAmount ? txAmount.toLocaleString() : '0.00'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">description:</span>
                <span className="font-bold text-foreground">
                  {txDescription || '(empty)'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">category:</span>
                <span className="font-bold text-foreground">
                  {txCategory || '(none selected)'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">
                💡 UX Features Enabled:
              </p>
              <ul className="list-disc list-inside space-y-1 pt-1">
                <li>Automatic numeric sanitization on CurrencyInput</li>
                <li>Clear focus rings with custom accent colors</li>
                <li>Disabled state support on submission</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: BUDGET & SAVINGS GOAL FORM */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-amber-400" />
          <h2 className="text-lg font-bold tracking-tight">
            2. Budget & Savings Goal Form
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Demonstrates custom input layouts, helper validation text, and target
          estimation.
        </p>

        <div className="rounded-3xl bg-card border border-border/70 p-6 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <FormSection
              title="Savings Plan Configurator"
              description="Configure targets and calculated timelines."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Goal Identifier" required>
                  <Input
                    value={budgetGoalName}
                    onChange={(e) => setBudgetGoalName(e.target.value)}
                    placeholder="e.g. New Home Deposit"
                  />
                </FormField>

                <FormField label="Target Amount ($)" required>
                  <CurrencyInput
                    value={targetAmount}
                    onValueChange={(val) => setTargetAmount(val || 0)}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Monthly Contribution ($)"
                  helperText="Amount set aside every 30 days"
                >
                  <CurrencyInput
                    value={monthlyContribution}
                    onValueChange={(val) => setMonthlyContribution(val || 0)}
                  />
                </FormField>

                <FormField label="Risk Profile Preference">
                  <Select
                    options={[
                      {
                        value: 'conservative',
                        label: 'Conservative (High Yield)',
                      },
                      { value: 'balanced', label: 'Balanced (Index Funds)' },
                      {
                        value: 'aggressive',
                        label: 'Aggressive (Growth Stock)',
                      },
                    ]}
                  />
                </FormField>
              </div>
            </FormSection>
          </div>

          {/* Projection Calculator Card */}
          <div className="rounded-2xl bg-muted/50 border border-border/60 p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                <TrendingUp className="size-4" />
                <span>Projection Estimate</span>
              </div>
              <p className="text-2xl font-extrabold tracking-tight mt-2 text-foreground">
                {targetAmount && monthlyContribution
                  ? Math.ceil(targetAmount / monthlyContribution)
                  : 0}{' '}
                <span className="text-sm font-medium text-muted-foreground">
                  Months
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Estimated time to reach{' '}
                <strong className="text-foreground">
                  ${targetAmount.toLocaleString()}
                </strong>{' '}
                for{' '}
                <span className="text-primary font-semibold">
                  {budgetGoalName}
                </span>
                .
              </p>
            </div>

            <Button variant="outline" size="sm" className="w-full">
              Update Goal Parameters
            </Button>
          </div>
        </div>
      </div>

      {/* SECTION 3: LIVE SEARCH & FILTER PANEL INTEGRATED WITH LIST */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-purple-400" />
          <h2 className="text-lg font-bold tracking-tight">
            3. Integrated Form Controls + List Filtering
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Shows how real-time search fields and select dropdowns control
          external components like your{' '}
          <code className="text-primary font-mono">List</code> component.
        </p>

        <div className="rounded-3xl bg-card border border-border/70 p-6 shadow-xl space-y-4">
          {/* Top Form Filter Toolbar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-muted/30 p-3 rounded-2xl border border-border/50">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search transactions by title or detail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>

            {/* Category Dropdown */}
            <div className="w-full md:w-56">
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                options={[
                  { value: 'all', label: 'All Categories' },
                  { value: 'shopping', label: 'Shopping' },
                  { value: 'freelance', label: 'Freelance' },
                  { value: 'food', label: 'Food' },
                  { value: 'utilities', label: 'Utilities' },
                ]}
                className="bg-background"
              />
            </div>

            {/* Clear Button */}
            {(searchQuery || selectedCategory !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="text-xs shrink-0"
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Render List Component */}
          <List
            title="Filtered Transactions"
            subtitle={`Showing ${filteredListItems.length} of ${mockTransactions.length} items`}
            items={filteredListItems}
            filterTabs={[
              { id: 'all', label: 'All Types' },
              { id: 'income', label: 'Income Only' },
              { id: 'expense', label: 'Expenses Only' },
            ]}
            defaultFilterId="all"
            heightClass="h-[260px]"
          />
        </div>
      </div>
    </div>
  );
}
