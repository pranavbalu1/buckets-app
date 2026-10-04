import * as React from 'react';
import {
  Home,
  BarChart3,
  ArrowLeftRight,
  CreditCard,
  ShieldCheck,
  HelpCircle,
  Building2,
} from 'lucide-react';

import { Navbar, type NavItem } from '@/components/ui/navbar';

export function NavbarShowcase() {
  const [activeTabLog, setActiveTabLog] = React.useState<string>('home');

  // Custom enterprise navigation items for test case #2
  const enterpriseNavItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'treasury', label: 'Treasury', icon: Building2 },
    { id: 'reports', label: 'Reports', icon: BarChart3, badge: 'NEW' },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'support', label: 'Support', icon: HelpCircle },
  ];

  return (
    <section className="space-y-10 py-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Navbar Component Suite
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Interactive test cases for the navigation bar component.
        </p>
      </div>

      {/* Test Case 1: Standard Retail Navbar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Test Case 1: Default Retail Navigation
          </h3>
          <span className="text-xs font-mono bg-muted px-2.5 py-1 rounded-full text-primary">
            Active Tab: {activeTabLog}
          </span>
        </div>
        <div className="p-4 bg-black/40 rounded-3xl border border-border/60">
          <Navbar
            defaultActiveId="home"
            onTabChange={(id) => setActiveTabLog(id)}
          />
        </div>
      </div>

      {/* Test Case 2: Enterprise Treasury Navbar with Search & Custom Items */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Test Case 2: B2B Enterprise Treasury Layout (Search Enabled)
        </h3>
        <div className="p-4 bg-black/40 rounded-3xl border border-border/60">
          <Navbar
            brandName="BrandName"
            brandLogoText="BN"
            defaultActiveId="treasury"
            items={enterpriseNavItems}
            showSearch={true}
            notificationCount={9}
            userName="Jordan Vance"
            userAvatarUrl="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop"
            onTabChange={(id) => console.log('Enterprise Tab:', id)}
          />
        </div>
      </div>

      {/* Test Case 3: Compact Minimalist Header */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Test Case 3: Minimalist Header State
        </h3>
        <div className="p-4 bg-black/40 rounded-3xl border border-border/60">
          <Navbar
            brandName="BrandName"
            brandLogoText="BN"
            notificationCount={0}
            items={[
              { id: 'send', label: 'Send', icon: ArrowLeftRight },
              { id: 'cards', label: 'My Cards', icon: CreditCard },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
