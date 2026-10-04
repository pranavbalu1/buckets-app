import * as React from 'react';
import {
  ChevronDown,
  User,
  Settings,
  Shield,
  LogOut,
  Layers,
  MoreHorizontal,
  Download,
  FileText,
  FileSpreadsheet,
  FileCode,
  SlidersHorizontal,
  ArrowUpDown,
  Sun,
  Moon,
  Laptop,
  Check,
  Sparkles,
  Trash2,
  Copy,
  Edit3,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DropdownMenu } from '../ui/dropdown-menu';

export function DropdownShowcase() {
  const [selectedEnv, setSelectedEnv] = React.useState('Production Mesh');
  const [selectedSort, setSelectedSort] = React.useState('Most Recent');
  const [selectedTheme, setSelectedTheme] = React.useState('System Default');

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-10 text-foreground">
      {/* Header */}
      <div className="space-y-2 border-b border-border/60 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
          <Sparkles className="size-4" />
          <span>Interactive Menus</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Dropdown Menu Variants
        </h1>
        <p className="text-xs text-muted-foreground">
          Explore multi-section account menus, organization switchers,
          contextual action menus, filters, and export controls.
        </p>
      </div>

      {/* Grid Displaying 6 Types of Dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Account & Profile Menu */}
        <div className="p-6 rounded-3xl bg-card border border-border/70 space-y-4 flex flex-col justify-between shadow-xs">
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <User className="size-4 text-primary" />
              <span>1. Account & Profile Menu</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Multi-section menu with user profile, navigation shortcuts, and a
              destructive sign-out action.
            </p>
          </div>

          <div className="pt-2">
            <DropdownMenu
              align="left"
              trigger={
                <button className="flex items-center gap-3 p-1.5 pr-3 rounded-full border border-border/70 hover:bg-muted/50 transition-colors">
                  <div className="size-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                    JD
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold leading-tight">
                      John Doe
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      john@kyougen.io
                    </span>
                  </div>
                  <ChevronDown className="size-3.5 text-muted-foreground ml-1" />
                </button>
              }
              sections={[
                {
                  title: 'Account',
                  items: [
                    {
                      id: 'profile',
                      label: 'User Profile',
                      icon: <User />,
                      shortcut: '⌘P',
                    },
                    {
                      id: 'settings',
                      label: 'Preferences',
                      icon: <Settings />,
                      shortcut: '⌘S',
                    },
                    {
                      id: 'security',
                      label: 'Security & 2FA',
                      icon: <Shield />,
                    },
                  ],
                },
                {
                  items: [
                    {
                      id: 'logout',
                      label: 'Sign Out',
                      icon: <LogOut />,
                      destructive: true,
                      onClick: () => alert('Signing out...'),
                    },
                  ],
                },
              ]}
            />
          </div>
        </div>

        {/* 2. Workspace & Environment Switcher */}
        <div className="p-6 rounded-3xl bg-card border border-border/70 space-y-4 flex flex-col justify-between shadow-xs">
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Layers className="size-4 text-emerald-400" />
              <span>2. Environment Switcher</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Active selection:{' '}
              <span className="font-semibold text-emerald-400">
                {selectedEnv}
              </span>
            </p>
          </div>

          <div className="pt-2">
            <DropdownMenu
              trigger={
                <Button
                  variant="outline"
                  className="w-full justify-between text-xs font-semibold border-border/70"
                >
                  <span className="flex items-center gap-2">
                    <Layers className="size-4 text-emerald-400" />
                    <span>{selectedEnv}</span>
                  </span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </Button>
              }
              sections={[
                {
                  title: 'Switch Cluster',
                  items: [
                    {
                      id: 'prod',
                      label: 'Production Mesh',
                      icon: <Layers />,
                      onClick: () => setSelectedEnv('Production Mesh'),
                    },
                    {
                      id: 'staging',
                      label: 'Staging Cluster',
                      icon: <Layers />,
                      onClick: () => setSelectedEnv('Staging Cluster'),
                    },
                    {
                      id: 'dev',
                      label: 'Dev Workspace',
                      icon: <Layers />,
                      onClick: () => setSelectedEnv('Dev Workspace'),
                    },
                  ],
                },
              ]}
            />
          </div>
        </div>

        {/* 3. Filter & Sort Selector */}
        <div className="p-6 rounded-3xl bg-card border border-border/70 space-y-4 flex flex-col justify-between shadow-xs">
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <ArrowUpDown className="size-4 text-sky-400" />
              <span>3. Sorting Options</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Sorted by:{' '}
              <span className="font-semibold text-sky-400">{selectedSort}</span>
            </p>
          </div>

          <div className="pt-2">
            <DropdownMenu
              trigger={
                <Button
                  variant="outline"
                  className="w-full justify-between text-xs font-semibold border-border/70"
                >
                  <span className="flex items-center gap-2">
                    <SlidersHorizontal className="size-3.5 text-sky-400" />
                    <span>Sort: {selectedSort}</span>
                  </span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </Button>
              }
              sections={[
                {
                  title: 'Order By',
                  items: [
                    {
                      id: 'recent',
                      label: 'Most Recent',
                      icon:
                        selectedSort === 'Most Recent' ? (
                          <Check className="size-3.5" />
                        ) : undefined,
                      onClick: () => setSelectedSort('Most Recent'),
                    },
                    {
                      id: 'name',
                      label: 'Name (A-Z)',
                      icon:
                        selectedSort === 'Name (A-Z)' ? (
                          <Check className="size-3.5" />
                        ) : undefined,
                      onClick: () => setSelectedSort('Name (A-Z)'),
                    },
                    {
                      id: 'status',
                      label: 'Status Priority',
                      icon:
                        selectedSort === 'Status Priority' ? (
                          <Check className="size-3.5" />
                        ) : undefined,
                      onClick: () => setSelectedSort('Status Priority'),
                    },
                  ],
                },
              ]}
            />
          </div>
        </div>

        {/* 4. Contextual Actions Menu (Row Action) */}
        <div className="p-6 rounded-3xl bg-card border border-border/70 space-y-4 flex flex-col justify-between shadow-xs">
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <MoreHorizontal className="size-4 text-amber-400" />
              <span>4. Contextual Row Actions</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Quick item-level actions for data tables, card lists, and file
              trees.
            </p>
          </div>

          <div className="pt-2">
            <DropdownMenu
              align="left"
              trigger={
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-xl border-border/70"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              }
              sections={[
                {
                  title: 'Actions',
                  items: [
                    {
                      id: 'edit',
                      label: 'Edit Metadata',
                      icon: <Edit3 />,
                      onClick: () => alert('Edit clicked'),
                    },
                    {
                      id: 'duplicate',
                      label: 'Duplicate Entry',
                      icon: <Copy />,
                      onClick: () => alert('Duplicate clicked'),
                    },
                  ],
                },
                {
                  items: [
                    {
                      id: 'delete',
                      label: 'Delete Record',
                      icon: <Trash2 />,
                      destructive: true,
                      onClick: () => alert('Record deleted'),
                    },
                  ],
                },
              ]}
            />
          </div>
        </div>

        {/* 5. Theme Preference Selector */}
        <div className="p-6 rounded-3xl bg-card border border-border/70 space-y-4 flex flex-col justify-between shadow-xs">
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Sun className="size-4 text-amber-400" />
              <span>5. Theme Switcher</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Current Mode:{' '}
              <span className="font-semibold text-amber-400">
                {selectedTheme}
              </span>
            </p>
          </div>

          <div className="pt-2">
            <DropdownMenu
              trigger={
                <Button
                  variant="outline"
                  className="w-full justify-between text-xs font-semibold border-border/70"
                >
                  <span>Theme ({selectedTheme})</span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </Button>
              }
              sections={[
                {
                  title: 'Appearance',
                  items: [
                    {
                      id: 'light',
                      label: 'Light Mode',
                      icon: <Sun />,
                      onClick: () => setSelectedTheme('Light Mode'),
                    },
                    {
                      id: 'dark',
                      label: 'Dark Mode',
                      icon: <Moon />,
                      onClick: () => setSelectedTheme('Dark Mode'),
                    },
                    {
                      id: 'system',
                      label: 'System Default',
                      icon: <Laptop />,
                      onClick: () => setSelectedTheme('System Default'),
                    },
                  ],
                },
              ]}
            />
          </div>
        </div>

        {/* 6. Export Data Options */}
        <div className="p-6 rounded-3xl bg-card border border-border/70 space-y-4 flex flex-col justify-between shadow-xs">
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Download className="size-4 text-purple-400" />
              <span>6. Export & Download</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Download reports or raw datasets in multiple document formats.
            </p>
          </div>

          <div className="pt-2">
            <DropdownMenu
              trigger={
                <Button
                  variant="outline"
                  className="w-full justify-between text-xs font-semibold border-border/70"
                >
                  <span className="flex items-center gap-2">
                    <Download className="size-3.5 text-purple-400" />
                    <span>Export Report</span>
                  </span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </Button>
              }
              sections={[
                {
                  title: 'Download Format',
                  items: [
                    {
                      id: 'csv',
                      label: 'Export as CSV',
                      icon: <FileSpreadsheet />,
                      onClick: () => alert('Exporting CSV...'),
                    },
                    {
                      id: 'pdf',
                      label: 'Export as PDF Document',
                      icon: <FileText />,
                      onClick: () => alert('Exporting PDF...'),
                    },
                    {
                      id: 'json',
                      label: 'Export raw JSON',
                      icon: <FileCode />,
                      onClick: () => alert('Exporting JSON...'),
                    },
                  ],
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
