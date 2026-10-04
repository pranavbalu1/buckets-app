import { MetricCard } from '@/components/ui/metric-card';

export function MetricCardShowcase() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10 bg-background">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-foreground">
          Metric Displays
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configurable stat cards with flexible font sizing, priority emphasis,
          and specialized metric types.
        </p>
      </div>

      {/* Grid Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Case 1: High Priority Hero Balance (Large 2XL Font Size) */}
        <div className="space-y-2 lg:col-span-2">
          <span className="text-xs font-mono text-muted-foreground">
            Case 1: High Priority Hero Balance (`fontSize="2xl"`,
            `priority="high"`)
          </span>
          <MetricCard
            priority="high"
            type="standard"
            fontSize="2xl"
            title="Total Net Worth"
            amount={142850.5}
            changePercentage={14.2}
            changeAmount="+$17,800.00"
            onActionClick={() => alert('Net Worth breakdown')}
          />
        </div>

        {/* Case 2: Compact Expense Metric (Medium Font Size) */}
        <div className="space-y-2">
          <span className="text-xs font-mono text-muted-foreground">
            Case 2: Compact Cashflow (`fontSize="md"`, `type="compact"`)
          </span>
          <MetricCard
            priority="medium"
            type="compact"
            fontSize="md"
            title="Monthly Cashflow"
            amount="$4,320.00"
            changePercentage={6.8}
            onActionClick={() => alert('Cashflow log')}
          />
        </div>

        {/* Case 3: Goal Display with Progress Bar (LG Font Size) */}
        <div className="space-y-2">
          <span className="text-xs font-mono text-muted-foreground">
            Case 3: Emergency Fund Goal (`fontSize="lg"`, `type="goal"`)
          </span>
          <MetricCard
            priority="medium"
            type="goal"
            fontSize="lg"
            title="Emergency Fund"
            subtitle="75% Completed"
            amount="$7,500"
            targetAmount="$10k"
            progressPercentage={75}
            onActionClick={() => alert('Emergency fund settings')}
          />
        </div>

        {/* Case 4: Credit Limit Progress Display (Custom Accent Color Fill) */}
        <div className="space-y-2">
          <span className="text-xs font-mono text-muted-foreground">
            Case 4: Credit Utilization Goal (`fontSize="lg"`, `type="goal"`)
          </span>
          <MetricCard
            priority="medium"
            type="goal"
            fontSize="lg"
            title="Credit Card Used"
            subtitle="32% Limit Utilized"
            amount="$1,600"
            targetAmount="$5k"
            progressPercentage={32}
            onActionClick={() => alert('Manage credit cards')}
          />
        </div>

        {/* Case 5: Low Priority Micro Stat (Small Font Size) */}
        <div className="space-y-2">
          <span className="text-xs font-mono text-muted-foreground">
            Case 5: Low Priority / Micro Metric (`fontSize="sm"`,
            `priority="low"`)
          </span>
          <MetricCard
            priority="low"
            type="compact"
            fontSize="sm"
            title="Pending Rewards"
            amount="$128.40"
            changeAmount="3,420 pts"
            onActionClick={() => alert('Redeem points')}
          />
        </div>

        {/* Case 6: Custom Tailwind Class Font Styling */}
        <div className="space-y-2 lg:col-span-3">
          <span className="text-xs font-mono text-muted-foreground">
            Case 6: Custom Tailwind Font Class (`fontSize="text-4xl
            tracking-widest text-primary"`)
          </span>
          <MetricCard
            priority="medium"
            type="standard"
            fontSize="text-4xl font-extrabold tracking-tight text-primary"
            title="Investment Portfolio (BTC / ETH)"
            amount={84920.0}
            changePercentage={-2.4}
            changeAmount="-$2,100.00"
            onActionClick={() => alert('Crypto portfolio')}
          />
        </div>
      </div>
    </div>
  );
}
