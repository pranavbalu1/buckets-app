import * as React from 'react';
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Building2,
  Globe,
  CheckCircle2,
} from 'lucide-react';

import { cn } from './utils';
import { Input } from './input';
import { Button } from './button';
import { FormField, FormSection } from './form-field';
import { SegmentedControl } from './segmented-control';

export interface AuthStat {
  value: string;
  label: string;
}

export interface AuthPageProps {
  /** Branding & Slogans */
  brandName?: string;
  brandTagline?: string;
  heroTitle?: React.ReactNode;
  heroDescription?: string;
  heroImageSrc?: string;
  heroBadgeText?: string;

  /** Statistics displayed on the left panel */
  stats?: AuthStat[];

  /** Default active tab */
  defaultMode?: 'login' | 'register';

  /** API Integration Callbacks (Async friendly) */
  onLogin?: (credentials: {
    email: string;
    password: string;
    remember?: boolean;
  }) => Promise<void> | void;
  onRegister?: (credentials: {
    name: string;
    email: string;
    password: string;
  }) => Promise<void> | void;

  /** Social Login handlers */
  onSSOClick?: () => void;
  onGoogleClick?: () => void;

  className?: string;
}

export function AuthPage({
  brandName = 'ACME CORP',
  brandTagline = 'Enterprise Platform',
  heroTitle = (
    <>
      POWERING NEXT <br />
      GENERATION{' '}
      <span className="italic font-serif text-primary font-normal">
        Solutions
      </span>
    </>
  ),
  heroDescription = 'Secure, scalable, and intelligent platform architecture designed to accelerate operational efficiency across modern enterprise teams.',
  heroImageSrc = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop',
  heroBadgeText = 'SOC2 TYPE II CERTIFIED',
  stats = [
    { value: '99.99%', label: 'Platform Uptime' },
    { value: '10M+', label: 'Active Users' },
    { value: '256-bit', label: 'Data Encryption' },
  ],
  defaultMode = 'login',
  onLogin,
  onRegister,
  onSSOClick,
  onGoogleClick,
  className,
}: AuthPageProps) {
  const [mode, setMode] = React.useState<'login' | 'register'>(defaultMode);
  const [showPassword, setShowPassword] = React.useState(false);

  // Form Field States
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [remember, setRemember] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (mode === 'register') {
      if (!name) {
        setError('Please enter your full name.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        await onLogin?.({ email, password, remember });
      } else {
        await onRegister?.({ name, email, password });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        'w-full min-h-screen bg-background text-foreground flex items-center justify-center p-4 lg:p-8',
        className,
      )}
    >
      {/* Container Grid */}
      <div className="w-full max-w-7xl min-h-[720px] rounded-[2.5rem] bg-card border border-border/70 shadow-2xl grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* ==================================================================
            LEFT COLUMN: CONFIGURABLE ENTERPRISE HERO
           ================================================================== */}
        <div className="lg:col-span-7 bg-sunken/70 p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-border/60">
          {/* Ambient Background Glows */}
          <div className="absolute -top-32 -left-32 size-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

          {/* Top Brand Navbar */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-base shadow-md">
                {brandName.charAt(0)}
              </div>
              <span className="font-extrabold tracking-tight text-lg text-foreground uppercase">
                {brandName}{' '}
                <span className="text-xs font-semibold text-muted-foreground block -mt-1 tracking-wider">
                  {brandTagline}
                </span>
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-background/80 px-3 py-1.5 rounded-full border border-border/60 backdrop-blur-md">
              <Globe className="size-3.5 text-primary" />
              <span>Enterprise Gateway</span>
            </div>
          </div>

          {/* Slogan & Image Banner */}
          <div className="my-10 lg:my-auto space-y-8 z-10">
            <div className="space-y-3 max-w-xl">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15] text-foreground">
                {heroTitle}
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                {heroDescription}
              </p>
            </div>

            {/* Configurable Image Banner */}
            <div className="relative w-full h-48 sm:h-56 rounded-[2.5rem] overflow-hidden border border-border/60 shadow-lg group">
              <img
                src={heroImageSrc}
                alt="Enterprise Visual"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 filter brightness-90 contrast-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

              <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between text-xs text-foreground font-medium backdrop-blur-md bg-background/40 p-3 rounded-2xl border border-white/10">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  System Operational
                </span>
                <span className="font-mono text-[11px] text-muted-foreground uppercase">
                  {heroBadgeText}
                </span>
              </div>
            </div>

            {/* Dynamic Stats Grid */}
            {stats && stats.length > 0 && (
              <div
                className={`grid grid-cols-${stats.length} gap-4 pt-2 border-t border-border/60`}
              >
                {stats.map((stat, idx) => (
                  <div
                    key={idx}
                    className={cn(idx > 0 && 'border-l border-border/60 pl-4')}
                  >
                    <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                      {stat.value}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Security Proof Point */}
          <div className="flex items-center gap-6 text-xs text-muted-foreground z-10 pt-4">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-primary" /> Encrypted Protocol
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-400" /> High
              Availability SLA
            </span>
          </div>
        </div>

        {/* ==================================================================
            RIGHT COLUMN: AUTHENTICATION FORM
           ================================================================== */}
        <div className="lg:col-span-5 p-8 sm:p-12 flex flex-col justify-center bg-card z-10">
          <div className="w-full max-w-sm mx-auto space-y-6">
            <div className="space-y-1.5">
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {mode === 'login'
                  ? 'Sign in with your email or SSO to access your dashboard'
                  : 'Get started with an enterprise account'}
              </p>
            </div>

            {/* Segmented Tab Control */}
            <SegmentedControl
              value={mode}
              onChange={(val) => {
                setMode(val as 'login' | 'register');
                setError(null);
              }}
              options={[
                { id: 'login', label: 'Sign In' },
                { id: 'register', label: 'Register' },
              ]}
            />

            {/* Social Logins */}
            {(onSSOClick || onGoogleClick) && (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  {onSSOClick && (
                    <Button
                      variant="outline"
                      size="default"
                      type="button"
                      onClick={onSSOClick}
                      className="w-full text-xs font-semibold gap-2 border-border/70"
                    >
                      <Building2 className="size-3.5 text-muted-foreground" />
                      <span>SSO Login</span>
                    </Button>
                  )}
                  {onGoogleClick && (
                    <Button
                      variant="outline"
                      size="default"
                      type="button"
                      onClick={onGoogleClick}
                      className="w-full text-xs font-semibold gap-2 border-border/70"
                    >
                      <svg className="size-3.5" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Google</span>
                    </Button>
                  )}
                </div>

                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/60" />
                  </div>
                  <span className="relative bg-card px-3 text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                    Or with credentials
                  </span>
                </div>
              </>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold animate-in fade-in duration-150">
                  {error}
                </div>
              )}

              <FormSection>
                {mode === 'register' && (
                  <FormField label="Full Name" required>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="John Doe"
                        className="pl-9"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </FormField>
                )}

                <FormField label="Email Address" required>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="name@company.com"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </FormField>

                <FormField label="Password" required>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-9 pr-9"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </FormField>

                {mode === 'register' && (
                  <FormField label="Confirm Password" required>
                    <div className="relative">
                      <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="pl-9"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </FormField>
                )}
              </FormSection>

              {mode === 'login' && (
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground select-none">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="rounded border-border bg-input size-3.5 accent-primary"
                    />
                    <span>Remember me</span>
                  </label>
                  <a
                    href="#forgot"
                    onClick={(e) => e.preventDefault()}
                    className="text-primary font-semibold hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>
              )}

              <Button
                variant="default"
                size="lg"
                type="submit"
                disabled={isLoading}
                className="w-full font-bold mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    <span>Connecting...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>
                      {mode === 'login' ? 'Sign In' : 'Create Account'}
                    </span>
                    <ArrowRight className="size-4" />
                  </span>
                )}
              </Button>
            </form>

            <p className="text-center text-[11px] text-muted-foreground pt-2">
              Protected by Enterprise Protocol. Read our{' '}
              <a href="#privacy" className="text-foreground underline">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
