import * as React from 'react';
import {
  Search,
  Terminal,
  FileCode2,
  Settings,
  Compass,
  Zap,
  Cpu,
  Database,
  Shield,
  Sun,
  Moon,
  Laptop,
  FolderPlus,
  GitBranch,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CommandMenu, type CommandItem } from '../ui/command-menu';

export function CommandMenuShowcase() {
  const [activeMenu, setActiveMenu] = React.useState<string | null>(null);
  const [activeTheme, setActiveTheme] = React.useState<
    'System' | 'Light' | 'Dark'
  >('System');

  // --- MENU 1: Global Search & Navigation ---
  const navigationItems: CommandItem[] = [
    {
      id: 'nav-dashboard',
      title: 'Go to Executive Dashboard',
      subtitle: 'Real-time overview & KPI metrics',
      category: 'Navigation',
      icon: <Compass className="size-4" />,
      shortcut: 'G D',
      onSelect: () => alert('Navigating to Dashboard...'),
    },
    {
      id: 'nav-analytics',
      title: 'View Revenue Analytics',
      subtitle: 'Monthly recurring revenue and cohort retention',
      category: 'Navigation',
      icon: <Zap className="size-4" />,
      shortcut: 'G A',
      onSelect: () => alert('Navigating to Analytics...'),
    },
    {
      id: 'nav-users',
      title: 'Manage Team Members',
      subtitle: 'RBAC permissions and user invitations',
      category: 'Administration',
      icon: <Shield className="size-4" />,
      shortcut: 'G U',
      onSelect: () => alert('Navigating to Team Settings...'),
    },
  ];

  // --- MENU 2: Developer & DevOps Commands ---
  const devopsItems: CommandItem[] = [
    {
      id: 'deploy-prod',
      title: 'Deploy to Production Mesh',
      subtitle: 'Trigger v4.2.0 automated pipeline build',
      category: 'CI/CD Pipelines',
      icon: <Cpu className="size-4" />,
      shortcut: '⌘SHIFT+D',
      onSelect: () => alert('Triggering Production Deployment...'),
    },
    {
      id: 'db-snapshot',
      title: 'Take PostgreSQL Database Snapshot',
      subtitle: 'Create point-in-time cold storage backup',
      category: 'Database Management',
      icon: <Database className="size-4" />,
      shortcut: '⌘SHIFT+B',
      onSelect: () => alert('Database Snapshot Triggered!'),
    },
    {
      id: 'git-checkout',
      title: 'Checkout Release Branch',
      subtitle: 'Switch to release/2026-q3-patch',
      category: 'Git Operations',
      icon: <GitBranch className="size-4" />,
      onSelect: () => alert('Branch checked out.'),
    },
  ];

  // --- MENU 3: File Finder ---
  const fileItems: CommandItem[] = [
    {
      id: 'file-app',
      title: 'App.tsx',
      subtitle: 'src/App.tsx — Router & Shell Layout',
      category: 'Core Components',
      icon: <FileCode2 className="size-4 text-sky-400" />,
      onSelect: () => alert('Opening App.tsx...'),
    },
    {
      id: 'file-auth',
      title: 'AuthPage.tsx',
      subtitle: 'src/components/ui/auth-page.tsx',
      category: 'UI Components',
      icon: <FileCode2 className="size-4 text-emerald-400" />,
      onSelect: () => alert('Opening AuthPage.tsx...'),
    },
    {
      id: 'file-create',
      title: 'Create New File...',
      subtitle: 'Add blank module to workspace',
      category: 'Quick Actions',
      icon: <FolderPlus className="size-4 text-amber-400" />,
      shortcut: '⌘N',
      onSelect: () => alert('Create file dialog opened.'),
    },
  ];

  // --- MENU 4: Preferences & Theme Switcher ---
  const preferenceItems: CommandItem[] = [
    {
      id: 'theme-light',
      title: 'Switch to Light Theme',
      subtitle: 'Bright, high-contrast visual style',
      category: 'Appearance',
      icon: <Sun className="size-4" />,
      onSelect: () => setActiveTheme('Light'),
    },
    {
      id: 'theme-dark',
      title: 'Switch to Dark Theme',
      subtitle: 'Deep charcoal background layout',
      category: 'Appearance',
      icon: <Moon className="size-4" />,
      onSelect: () => setActiveTheme('Dark'),
    },
    {
      id: 'theme-system',
      title: 'Use System Preference',
      subtitle: 'Match OS dark/light mode toggle',
      category: 'Appearance',
      icon: <Laptop className="size-4" />,
      onSelect: () => setActiveTheme('System'),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-10 text-foreground">
      {/* Dynamic Command Modals */}
      <CommandMenu
        isOpen={activeMenu === 'global'}
        onClose={() => setActiveMenu(null)}
        items={navigationItems}
        placeholder="Type a page name or search route..."
      />

      <CommandMenu
        isOpen={activeMenu === 'devops'}
        onClose={() => setActiveMenu(null)}
        items={devopsItems}
        placeholder="Search DevOps scripts or cluster actions..."
      />

      <CommandMenu
        isOpen={activeMenu === 'files'}
        onClose={() => setActiveMenu(null)}
        items={fileItems}
        placeholder="Search files by name or extension..."
      />

      <CommandMenu
        isOpen={activeMenu === 'prefs'}
        onClose={() => setActiveMenu(null)}
        items={preferenceItems}
        placeholder="Change settings or UI preferences..."
      />

      {/* Showcase Header */}
      <div className="space-y-2 border-b border-border/60 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
          <Sparkles className="size-4" />
          <span>Command Palettes</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Command Menu Variants
        </h1>
        <p className="text-xs text-muted-foreground">
          Explore modal command palettes configured for global search, DevOps
          actions, file finders, and app settings.
        </p>
      </div>

      {/* Grid of 4 Command Palette Triggers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Variant 1: Global Navigation */}
        <div className="p-6 rounded-3xl bg-card border border-border/70 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Search className="size-4 text-primary" />
              <span>1. Global Navigation Palette</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Quickly jump between high-level admin sections, dashboards, and
              audit logs.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => setActiveMenu('global')}
            className="w-full justify-between text-xs font-semibold border-border/70"
          >
            <span>Open Navigation Search</span>
            <kbd className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded border border-border/60">
              ⌘K
            </kbd>
          </Button>
        </div>

        {/* Variant 2: DevOps Actions */}
        <div className="p-6 rounded-3xl bg-card border border-border/70 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Terminal className="size-4 text-emerald-400" />
              <span>2. Developer & DevOps Actions</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Execute cloud deployments, trigger database snapshots, and switch
              active git branches.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => setActiveMenu('devops')}
            className="w-full justify-between text-xs font-semibold border-border/70"
          >
            <span>Open DevOps Commands</span>
            <kbd className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded border border-border/60">
              ⌘SHIFT+P
            </kbd>
          </Button>
        </div>

        {/* Variant 3: File Quick Open */}
        <div className="p-6 rounded-3xl bg-card border border-border/70 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <FileCode2 className="size-4 text-sky-400" />
              <span>3. Workspace File Finder</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Fuzzy-search source code files and UI components across your
              repository.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => setActiveMenu('files')}
            className="w-full justify-between text-xs font-semibold border-border/70"
          >
            <span>Open File Search</span>
            <kbd className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded border border-border/60">
              ⌘P
            </kbd>
          </Button>
        </div>

        {/* Variant 4: Theme & Preferences */}
        <div className="p-6 rounded-3xl bg-card border border-border/70 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Settings className="size-4 text-amber-400" />
              <span>4. App Preferences (Theme: {activeTheme})</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Control accessibility modes, application themes, and system
              configurations.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => setActiveMenu('prefs')}
            className="w-full justify-between text-xs font-semibold border-border/70"
          >
            <span>Open Theme Settings</span>
            <kbd className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded border border-border/60">
              ⌘,
            </kbd>
          </Button>
        </div>
      </div>
    </div>
  );
}
