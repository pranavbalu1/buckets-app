import {
  Smartphone,
  ArrowDownLeft,
  Coffee,
  Briefcase,
  Zap,
  Film,
  Car,
  CreditCard,
  Globe,
} from 'lucide-react';

import { List, type ListItemData } from '@/components/ui/list';

const sampleTransactions: ListItemData[] = [
  {
    id: '1',
    title: 'Apple Store',
    subtitle: 'iPhone 16 Pro',
    date: 'Today, 2:45 PM',
    amount: 1199.0,
    isPositive: false,
    type: 'expense',
    category: 'Electronics',
    icon: Smartphone,
    iconVariant: 'bg-neutral-800 text-white',
  },
  {
    id: '2',
    title: 'Stripe Salary Deposit',
    subtitle: 'Payroll',
    date: 'Yesterday',
    amount: 4500.0,
    isPositive: true,
    type: 'income',
    category: 'Income',
    badge: 'Direct',
    icon: ArrowDownLeft,
    iconVariant: 'bg-emerald-500/15 text-emerald-400',
  },
  {
    id: '3',
    title: 'Starbucks Coffee',
    subtitle: 'Breakfast',
    date: 'Jul 29',
    amount: 8.75,
    isPositive: false,
    type: 'expense',
    category: 'Food',
    icon: Coffee,
    iconVariant: 'bg-amber-500/15 text-amber-400',
  },
  {
    id: '4',
    title: 'Freelance Design',
    subtitle: 'Client Payment',
    date: 'Jul 28',
    amount: 850.0,
    isPositive: true,
    type: 'income',
    category: 'Design',
    icon: Briefcase,
    iconVariant: 'bg-cyan-500/15 text-cyan-400',
  },
  {
    id: '5',
    title: 'Tesla Supercharger',
    subtitle: 'Transport',
    date: 'Jul 27',
    amount: 32.4,
    isPositive: false,
    type: 'expense',
    category: 'Travel',
    icon: Zap,
    iconVariant: 'bg-red-500/15 text-red-400',
  },
  {
    id: '6',
    title: 'Netflix Premium',
    subtitle: 'Subscription',
    date: 'Jul 25',
    amount: 22.99,
    isPositive: false,
    type: 'expense',
    category: 'Media',
    icon: Film,
    iconVariant: 'bg-purple-500/15 text-purple-400',
  },
  {
    id: '7',
    title: 'Uber Ride',
    subtitle: 'Transport',
    date: 'Jul 24',
    amount: 28.5,
    isPositive: false,
    type: 'expense',
    category: 'Travel',
    icon: Car,
    iconVariant: 'bg-slate-700 text-slate-200',
  },
];

export function ListShowcase() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 bg-background">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          List Component Playground
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Fixed-height containers prevent layout shifts when toggling tabs or
          filtering states.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Test Case 1: Standard Height List with Tab Filtering */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-muted-foreground">
              Test 1: Default Fixed Height (300px)
            </span>
            <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
              h-[300px]
            </span>
          </div>
          <List
            title="Transactions"
            subtitle="7 recorded activities"
            actionLabel="View All"
            items={sampleTransactions}
            heightClass="h-[300px]"
            onItemClick={(item) => console.log('Clicked:', item.title)}
          />
        </div>

        {/* Test Case 2: Custom Height & Tab Filters */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-muted-foreground">
              Test 2: Compact Height (220px)
            </span>
            <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
              h-[220px]
            </span>
          </div>
          <List
            title="Income vs Expenses"
            subtitle="Filter without container expansion"
            items={sampleTransactions}
            defaultFilterId="income"
            filterTabs={[
              { id: 'income', label: 'Income Only' },
              { id: 'expense', label: 'Expenses Only' },
            ]}
            heightClass="h-[220px]"
          />
        </div>

        {/* Test Case 3: Empty State Handling within Fixed Height */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-muted-foreground">
              Test 3: Centered Empty State
            </span>
            <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
              Zero Items
            </span>
          </div>
          <List
            title="Scheduled Payments"
            subtitle="Upcoming recurring bills"
            actionLabel="Add New"
            items={[]}
            filterTabs={[
              { id: 'all', label: 'Pending' },
              { id: 'completed', label: 'Completed' },
            ]}
            heightClass="h-[220px]"
          />
        </div>

        {/* Test Case 4: Non-Tab Account List */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-muted-foreground">
              Test 4: Linked Accounts (No Tabs)
            </span>
            <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
              Simple List
            </span>
          </div>
          <List
            title="My Accounts"
            actionLabel="Manage"
            filterTabs={[]}
            heightClass="h-[220px]"
            items={[
              {
                id: 'acc-1',
                title: 'List Card',
                subtitle: '•• 8967',
                amount: '$4,568.00',
                category: 'Primary',
                icon: CreditCard,
                iconVariant: 'bg-primary/20 text-primary',
              },
              {
                id: 'acc-2',
                title: 'Global Vault',
                subtitle: 'EUR Balance',
                amount: '€2,140.50',
                category: 'Savings',
                icon: Globe,
                iconVariant: 'bg-cyan-500/15 text-cyan-400',
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
