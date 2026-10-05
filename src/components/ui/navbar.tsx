import * as React from 'react';
import {
  Home,
  BarChart3,
  ArrowLeftRight,
  CreditCard as CreditCardIcon,
  Wallet,
  Layers,
  Bell,
  SlidersHorizontal,
  Search,
  Menu,
  X,
  ChevronDown,
  User,
  LogOut,
  Settings,
} from 'lucide-react';

import { cn } from './utils';
import { Button } from './button';
import { Input } from './input';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  href?: string;
}

export interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
  /** Initial active tab ID */
  defaultActiveId?: string;
  /** Navigation links to render */
  items?: NavItem[];
  /** Brand title text */
  brandName?: string;
  /** Brand logo mark initials or text */
  brandLogoText?: string;
  /** User profile image URL */
  userAvatarUrl?: string;
  /** User name display */
  userName?: string;
  /** Notification badge count */
  notificationCount?: number;
  /** Callback fired when tab changes */
  onTabChange?: (id: string) => void;
  /** Optional custom right-side elements */
  showSearch?: boolean;
}

const defaultNavItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight, badge: 3 },
  { id: 'payment', label: 'Payment', icon: CreditCardIcon },
  { id: 'plan', label: 'Plan', icon: Wallet },
  { id: 'cards', label: 'Cards', icon: Layers },
];

export function Navbar({
  className,
  defaultActiveId = 'home',
  items = defaultNavItems,
  brandName = 'BrandName',
  brandLogoText = 'BN',
  userAvatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
  userName = 'Alex Morgan',
  notificationCount = 2,
  onTabChange,
  showSearch = false,
  ...props
}: NavbarProps) {
  const [activeTab, setActiveTab] = React.useState(defaultActiveId);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = React.useState(false);

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    onTabChange?.(id);
    setMobileMenuOpen(false);
  };

  return (
    <header
      className={cn(
        /* Outer margin & container floating style */
        'mx-3 sm:mx-6 my-4 w-[calc(100%-1.5rem)] sm:w-[calc(100%-3rem)]',
        'relative flex items-center justify-between py-3 px-4 sm:px-6',
        'bg-background/80 backdrop-blur-md rounded-2xl border border-border/60 shadow-xs',
        className,
      )}
      {...props}
    >
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3">
        <div className="size-9 sm:size-10 rounded-xl bg-primary flex items-center justify-center font-bold text-black text-lg sm:text-xl shadow-xs shrink-0">
          {brandLogoText}
        </div>
        <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
          {brandName}
        </span>
      </div>

      {/* Optional Search Bar Input */}
      {showSearch && (
        <div className="hidden xl:flex items-center relative w-64 ml-4">
          <Search className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search transactions..."
            className="pl-9 h-9 text-xs rounded-full bg-sunken/70 border-border/60"
          />
        </div>
      )}

      {/* Desktop Floating Pill Navigation Dock */}
      <nav className="hidden lg:flex items-center gap-1 bg-sunken/70 p-1.5 rounded-full border border-border/80">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={cn(
                'relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 outline-none select-none',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-sunken/70',
              )}
            >
              <Icon className="size-3.5" />
              <span>{item.label}</span>

              {/* Badge Count */}
              {item.badge && (
                <span
                  className={cn(
                    'ml-0.5 px-1.5 py-0.2 text-[10px] rounded-full font-bold',
                    isActive
                      ? 'bg-black/20 text-black'
                      : 'bg-secondary text-secondary-foreground',
                  )}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Action Utilities & User Avatar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notifications Icon Button */}
        <div className="relative">
          <Button
            variant="outline"
            size="icon"
            className="size-9 rounded-full bg-sunken/70 border-border/60 hover:bg-sunken text-foreground"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
          </Button>
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 size-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center">
              {notificationCount}
            </span>
          )}
        </div>

        {/* Settings Icon Button */}
        <Button
          variant="outline"
          size="icon"
          className="size-9 rounded-full bg-sunken/70 border-border/60 hover:bg-sunken text-foreground"
          aria-label="Settings"
        >
          <SlidersHorizontal className="size-4" />
        </Button>

        {/* User Profile Avatar with Dropdown Toggle */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-primary/50 transition-all outline-none"
          >
            <div className="size-9 rounded-full overflow-hidden border-2 border-border/80">
              <img
                src={userAvatarUrl}
                alt={userName}
                className="size-full object-cover"
              />
            </div>
            <ChevronDown className="size-3 text-muted-foreground hidden sm:block" />
          </button>

          {/* Profile Dropdown Menu */}
          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-card border border-border/80 shadow-xl p-2 z-50 text-xs animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-2 border-b border-border/50 mb-1">
                <p className="font-semibold text-foreground">{userName}</p>
                <p className="text-muted-foreground text-[10px] truncate">
                  alex.m@finflex.io
                </p>
              </div>
              <button
                onClick={() => setProfileDropdownOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-sunken text-left"
              >
                <User className="size-3.5" /> Profile Settings
              </button>
              <button
                onClick={() => setProfileDropdownOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-sunken text-left"
              >
                <Settings className="size-3.5" /> Preferences
              </button>
              <div className="my-1 border-t border-border/50" />
              <button
                onClick={() => setProfileDropdownOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-destructive hover:bg-destructive/10 text-left font-medium"
              >
                <LogOut className="size-3.5" /> Log out
              </button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <Button
          variant="outline"
          size="icon"
          className="lg:hidden size-9 rounded-full bg-sunken/70 border-border/60"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="size-4" />
          ) : (
            <Menu className="size-4" />
          )}
        </Button>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-card border border-border rounded-2xl shadow-2xl lg:hidden z-40 space-y-1 animate-in fade-in slide-in-from-top-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-sunken',
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-secondary text-black font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
