import * as React from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { FormField, FormSection } from './form-field';
import { Select } from './select';
import { CurrencyInput } from './currency-input';
import { SegmentedControl } from './segmented-control';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function AddTransactionForm({ onCancel }: { onCancel?: () => void }) {
  const [type, setType] = React.useState('expense');
  const [amount, setAmount] = React.useState<number>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ type, amount });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-lg rounded-3xl bg-card border border-border/70 p-6 shadow-2xl space-y-6"
    >
      <FormSection
        title="New Transaction"
        description="Log an expense or income entry into your account."
      >
        {/* Transaction Type Selector */}
        <FormField label="Type">
          <SegmentedControl
            value={type}
            onChange={setType}
            options={[
              { id: 'expense', label: 'Expense', icon: ArrowUpRight },
              { id: 'income', label: 'Income', icon: ArrowDownLeft },
            ]}
          />
        </FormField>

        {/* Amount Input */}
        <FormField
          label="Amount"
          required
          helperText="Enter total value in USD"
        >
          <CurrencyInput placeholder="0.00" onValueChange={setAmount} />
        </FormField>

        {/* Title / Description */}
        <FormField label="Description" required>
          <Input placeholder="e.g. Grocery Shop, Salary, Coffee" />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          {/* Category Select */}
          <FormField label="Category">
            <Select
              placeholder="Select category"
              options={[
                { value: 'food', label: 'Food & Dining' },
                { value: 'transport', label: 'Transportation' },
                { value: 'utilities', label: 'Utilities' },
                { value: 'income', label: 'Income & Paycheck' },
              ]}
            />
          </FormField>

          {/* Date Picker */}
          <FormField label="Date">
            <Input type="date" className="block" />
          </FormField>
        </div>
      </FormSection>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
        <Button variant="ghost" size="default" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="default" size="default" type="submit">
          Save Transaction
        </Button>
      </div>
    </form>
  );
}
