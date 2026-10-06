import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  CircleDollarSign,
  LayoutDashboard,
  Move,
  Moon,
  Plus,
  Settings2,
  Sun,
  Wallet,
  WalletCards,
} from 'lucide-react'
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router'
import { hasSupabaseConfig, supabase } from './lib/supabase'
import { useLedger } from './storage/store'
import type { AddKind, Tab } from './nav'
import { Button, Card, CommandMenu, Modal, RouteErrorBoundary, TileLayoutProvider } from './components'
import type { CommandItem } from './components'
import { PageSkeleton } from './app/components/PageSkeleton'
import type { SkeletonPage } from './app/components/PageSkeleton'
import Sidebar from './app/components/Sidebar'
import Budget, { BudgetSkeleton } from './features/Budget'
import { queryClient } from './lib/queryClient'
import { applyTheme, readThemePreference, saveThemePreference } from './lib/theme'
import type { ThemePreference } from './lib/theme'
import { supabaseRepository } from './storage/supabaseRepository'
import { userFacingErrorMessage } from './domain/validate'

const Login = lazy(() => import('./features/Login'))
const Dashboard = lazy(() => import('./features/Dashboard'))
const Transactions = lazy(() => import('./features/Transactions'))
const Accounts = lazy(() => import('./features/Accounts'))
const QuickAdd = lazy(() => import('./features/QuickAdd'))
const Analytics = lazy(() => import('./features/Analytics'))
const Settings = lazy(() => import('./features/Settings'))
const DevTools = lazy(() => import('./features/DevTools'))

const tabPaths: Record<Tab, string> = {
  Dashboard: '/dashboard',
  Budget: '/budget',
  Transactions: '/transactions',
  Analytics: '/analytics',
  Accounts: '/accounts',
  Settings: '/settings',
}

const pathTabs = Object.fromEntries(Object.entries(tabPaths).map(([tab, path]) => [path, tab])) as Record<string, Tab>

const pageDescriptions: Partial<Record<Tab, string>> = {
  Budget: 'Give every dollar a job and keep your goals in view.',
  Transactions: 'Review, search, and manage activity across your buckets.',
  Analytics: 'A closer look at the patterns behind your money.',
  Accounts: 'Keep your account balances and cash locations organized.',
  Settings: 'Manage your data, recurring plans, paychecks, and account checks.',
}

interface WorkspaceActions {
  navigateTab: (tab: Tab) => void
  setAddKind: Dispatch<SetStateAction<AddKind | null>>
  userId: string
  theme: ThemePreference
  setTheme: (theme: ThemePreference) => void
}

const WorkspaceContext = createContext<WorkspaceActions | null>(null)

function useWorkspaceActions() {
  const actions = useContext(WorkspaceContext)
  if (!actions) throw new Error('Workspace route rendered outside the workspace layout')
  return actions
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [authError, setAuthError] = useState('')
  const [theme, setTheme] = useState(readThemePreference)
  const { status, error, reset } = useLedger()

  useEffect(() => {
    applyTheme(theme)
    saveThemePreference(theme)
  }, [theme])

  useEffect(() => {
    if (!hasSupabaseConfig) return
    let active = true
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) throw sessionError
      if (!active) return
      setSession(data.session)
    }).catch((cause: unknown) => {
      if (!active) return
      setSession(null)
      setAuthError(cause instanceof Error ? cause.message : 'Could not restore your sign-in session.')
    }).finally(() => { if (active) setAuthReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setAuthError('')
      setAuthReady(true)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user.id
  const ledgerQuery = useQuery({
    queryKey: ['ledger', userId],
    queryFn: () => supabaseRepository.loadAll(),
    enabled: Boolean(userId),
  })

  useEffect(() => {
    if (!authReady) return
    if (!userId) {
      reset()
      void queryClient.removeQueries({ queryKey: ['ledger'] })
      void queryClient.removeQueries({ queryKey: ['planning-settings'] })
      return
    }

    if (ledgerQuery.isPending) {
      useLedger.setState({ status: 'loading', error: null })
    } else if (ledgerQuery.error) {
      useLedger.setState({ status: 'error', error: userFacingErrorMessage(ledgerQuery.error) })
    } else if (ledgerQuery.data) {
      useLedger.setState({ ...ledgerQuery.data, status: 'ready', error: null })
    }
  }, [authReady, userId, ledgerQuery.isPending, ledgerQuery.error, ledgerQuery.data, reset])

  if (!authReady && hasSupabaseConfig) return (
    <PageSkeleton page="Login" fullPage />
  )

  return (
    <Routes>
      {/* Diagnostics have no workflow link; in production the route is disabled. */}
      <Route
        path="/devtools"
        element={<AsyncRoute page="DevTools">
          {import.meta.env.DEV
            ? <DevTools userId={session?.user.id} email={session?.user.email} />
            : <Navigate to={session ? '/dashboard' : '/'} replace />}
        </AsyncRoute>}
      />
      {session ? (
        <Route element={
          <WorkspaceLayout
            session={session}
            theme={theme}
            onThemeChange={setTheme}
            status={status}
            error={error}
            onClearError={() => useLedger.getState().clearError()}
            onRetry={() => void ledgerQuery.refetch()}
          />
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<AsyncRoute page="Dashboard"><DashboardRoute /></AsyncRoute>} />
          <Route path="budget" element={<Budget />} />
          <Route path="transactions" element={<AsyncRoute page="Transactions"><Transactions /></AsyncRoute>} />
          <Route path="accounts" element={<AsyncRoute page="Accounts"><Accounts /></AsyncRoute>} />
          <Route path="analytics" element={<AsyncRoute page="Analytics"><Analytics /></AsyncRoute>} />
          <Route path="settings" element={<AsyncRoute page="Settings"><SettingsRoute /></AsyncRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      ) : (
        <Route path="*" element={<AsyncRoute page="Login"><Login key={authError} initialError={authError} /></AsyncRoute>} />
      )}
    </Routes>
  )
}

function WorkspaceLayout({
  session,
  theme,
  onThemeChange,
  status,
  error,
  onClearError,
  onRetry,
}: {
  session: Session
  theme: ThemePreference
  onThemeChange: (theme: ThemePreference) => void
  status: string
  error: string | null
  onClearError: () => void
  onRetry: () => void
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const userEmail = session.user.email ?? ''
  const metadataName = session.user.user_metadata?.full_name
  const userName = typeof metadataName === 'string' && metadataName.trim()
    ? metadataName.trim()
    : userEmail.split('@')[0] || 'Your profile'
  const [addKind, setAddKind] = useState<AddKind | null>(null)
  const [commandOpen, setCommandOpen] = useState(false)
  const [moveMode, setMoveMode] = useState(false)
  const tab = pathTabs[location.pathname.replace(/\/$/, '')] ?? 'Dashboard'
  const navigateTab = useCallback((nextTab: Tab) => {
    navigate(tabPaths[nextTab])
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [navigate])
  const actions = useMemo<WorkspaceActions>(() => ({
    navigateTab,
    setAddKind,
    userId: session.user.id,
    theme,
    setTheme: onThemeChange,
  }), [navigateTab, session.user.id, theme, onThemeChange])

  const commandItems = useMemo<CommandItem[]>(() => [
    ...Object.keys(tabPaths).map((name) => ({
      id: `navigate-${name.toLowerCase()}`,
      title: `Go to ${name}`,
      subtitle: pageDescriptions[name as Tab] ?? 'Your money overview and recent activity',
      category: 'Navigation',
      icon: name === 'Dashboard' ? <LayoutDashboard className="size-4" />
        : name === 'Budget' ? <Wallet className="size-4" />
          : name === 'Transactions' ? <ArrowLeftRight className="size-4" />
            : name === 'Analytics' ? <BarChart3 className="size-4" />
              : name === 'Accounts' ? <WalletCards className="size-4" />
                : <Settings2 className="size-4" />,
      shortcut: name === 'Dashboard' ? 'G D' : name === 'Budget' ? 'G B' : undefined,
      onSelect: () => navigateTab(name as Tab),
    })),
    { id: 'new-expense', title: 'Add an expense', subtitle: 'Record spending and choose a bucket', category: 'Quick actions', icon: <Plus className="size-4" />, shortcut: 'N', onSelect: () => setAddKind('expense') },
    { id: 'new-income', title: 'Add income', subtitle: 'Record money received', category: 'Quick actions', icon: <CircleDollarSign className="size-4" />, onSelect: () => setAddKind('income') },
    { id: 'new-deposit', title: 'Record a deposit', subtitle: 'Add money to one of your accounts', category: 'Quick actions', icon: <CircleDollarSign className="size-4" />, onSelect: () => setAddKind('deposit') },
    { id: 'move-money', title: 'Move money between buckets', subtitle: 'Rebalance your plan', category: 'Quick actions', icon: <ArrowLeftRight className="size-4" />, onSelect: () => setAddKind('move') },
    { id: 'transfer-money', title: 'Transfer between accounts', subtitle: 'Move money between your accounts', category: 'Quick actions', icon: <ArrowLeftRight className="size-4" />, onSelect: () => setAddKind('transfer') },
    { id: 'activity', title: 'Review recent activity', subtitle: 'Open your transaction history', category: 'Quick actions', icon: <Activity className="size-4" />, onSelect: () => navigateTab('Transactions') },
    {
      id: 'toggle-theme',
      title: theme === 'dark' ? 'Switch to light appearance' : 'Switch to dark appearance',
      subtitle: 'Change the app color scheme',
      category: 'Preferences',
      icon: theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />,
      onSelect: () => onThemeChange(theme === 'dark' ? 'light' : 'dark'),
    },
    {
      id: 'toggle-move-mode',
      title: moveMode ? 'Finish moving tiles' : 'Move tiles',
      subtitle: 'Rearrange page cards and save their order',
      category: 'Preferences',
      icon: <Move className="size-4" />,
      onSelect: () => setMoveMode((enabled) => !enabled),
    },
  ], [navigateTab, theme, onThemeChange, moveMode])

  // The command menu owns Cmd/Ctrl+K; keep the single-key add shortcut out of editable fields.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!session.user.id || event.defaultPrevented) return
      const target = event.target
      const typing = target instanceof HTMLElement && (
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable
      )
      if (event.key.toLowerCase() === 'n' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        setAddKind((kind) => kind ?? 'expense')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [session.user.id])

  return (
    <WorkspaceContext.Provider value={actions}>
      <div className="min-h-screen bg-canvas md:flex">
        <Sidebar
          tab={tab}
          userName={userName}
          userEmail={userEmail}
          onNavigate={navigateTab}
          onAdd={() => setAddKind('expense')}
          moveMode={moveMode}
          onToggleMoveMode={() => setMoveMode((enabled) => !enabled)}
          onOpenCommandMenu={() => setCommandOpen(true)}
          onLogout={() => void supabase.auth.signOut()}
        />

        <main className="min-w-0 flex-1 px-3 pb-28 pt-4 sm:px-4 sm:pt-5 md:px-8 md:py-8 xl:px-10">
          <div className="mx-auto max-w-[1440px]">
            {moveMode && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/35 bg-accent/5 px-3.5 py-2.5 text-sm" role="status">
                <p><strong className="text-accent">Move mode is on.</strong> Drag a tile by its handle or use the arrow controls. Your layout saves automatically.</p>
                <Button size="sm" variant="secondary" onClick={() => setMoveMode(false)}>Done</Button>
              </div>
            )}
            {tab !== 'Dashboard' && (
              <div className={`mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8 ${tab === 'Budget' ? 'mb-4 md:mb-5' : ''}`}>
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.13em] text-accent uppercase">
                    <span className="size-1.5 rounded-full bg-accent" /> Workspace
                  </div>
                  <h1 className={`font-semibold tracking-tight ${tab === 'Budget' ? 'text-2xl md:text-[1.75rem]' : 'text-3xl md:text-[2rem]'}`}>{tab}</h1>
                  <p className="mt-1.5 text-sm text-muted">{pageDescriptions[tab]}</p>
                </div>
                <Button variant="primary" className="inline-flex shrink-0" onClick={() => setAddKind('expense')}>
                  + Add transaction
                </Button>
              </div>
            )}

            {error && status !== 'error' && (
              <div role="alert" className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-bad/30 bg-bad-soft p-3.5 text-sm text-bad">
                <span>{error}</span>
                <button className="shrink-0 underline underline-offset-2" onClick={onClearError}>Dismiss</button>
              </div>
            )}

            {status === 'loading' && (
              tab === 'Budget' ? <BudgetSkeleton /> : <PageSkeleton page={tab} />
            )}
            {status === 'error' && (
              <Card className="flex flex-col items-start gap-3 border-destructive/25 p-5" role="alert">
                <div>
                  <h2 className="font-semibold">Could not connect to your Supabase project</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{error || 'Check your connection and Supabase project status. A free project may need to be resumed from the Supabase dashboard.'}</p>
                </div>
                <Button variant="primary" onClick={onRetry}>Try again</Button>
              </Card>
            )}
            {status === 'ready' && (
              <TileLayoutProvider key={session.user.id} userId={session.user.id} moveMode={moveMode}>
                <Outlet />
              </TileLayoutProvider>
            )}
          </div>
        </main>

        {addKind && (
          <Modal title="Add transaction" onClose={() => setAddKind(null)}>
            <RouteErrorBoundary>
              <Suspense fallback={<p className="py-8 text-center text-sm text-muted" role="status">Opening transaction form...</p>}>
                <QuickAdd key={addKind} initialKind={addKind} onDone={() => setAddKind(null)} />
              </Suspense>
            </RouteErrorBoundary>
          </Modal>
        )}
        <CommandMenu isOpen={commandOpen} onOpen={() => setCommandOpen(true)} onClose={() => setCommandOpen(false)} items={commandItems} />
      </div>
    </WorkspaceContext.Provider>
  )
}

function DashboardRoute() {
  const { navigateTab, setAddKind } = useWorkspaceActions()
  return <Dashboard onAdd={setAddKind} onNavigate={navigateTab} />
}

function RouteLoading({ page }: { page: SkeletonPage }) {
  return <PageSkeleton page={page} />
}

function AsyncRoute({ page, children }: { page: SkeletonPage; children: ReactNode }) {
  return <RouteErrorBoundary><Suspense fallback={<RouteLoading page={page} />}>{children}</Suspense></RouteErrorBoundary>
}

function SettingsRoute() {
  const { userId, theme, setTheme } = useWorkspaceActions()
  return <Settings userId={userId} theme={theme} onThemeChange={setTheme} />
}
