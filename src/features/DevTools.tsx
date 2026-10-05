import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Check,
  CircleHelp,
  Database,
  LoaderCircle,
  RefreshCw,
  Server,
  ShieldCheck,
  Trash2,
  Wifi,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { hasSupabaseConfig, supabase } from '../lib/supabase'
import { queryClient } from '../lib/queryClient'
import { useLedger } from '../storage/store'

type CheckState = 'checking' | 'healthy' | 'warning' | 'error'
type HealthCheck = { name: string; detail: string; state: CheckState }

const REQUIRED_TABLES = [
  { table: 'accounts', column: 'sort_order', name: 'Accounts' },
  { table: 'bucket_groups', column: 'color', name: 'Bucket groups' },
  { table: 'buckets', column: 'monthly_target_cents', name: 'Buckets and goals' },
  { table: 'ledger_events', column: 'custom_type', name: 'Transactions and labels' },
  { table: 'income_streams', column: 'id', name: 'Income streams' },
  { table: 'recurring_plans', column: 'id', name: 'Recurring plans' },
  { table: 'paycheck_templates', column: 'id', name: 'Paycheck templates' },
  { table: 'reconciliations', column: 'id', name: 'Account reconciliations' },
] as const

const WIPE_CONFIRMATION = 'DELETE MY FINANCE DATA'

function CheckIcon({ state }: { state: CheckState }) {
  if (state === 'checking') return <LoaderCircle className="size-4 animate-spin text-muted" aria-hidden />
  if (state === 'healthy') return <Check className="size-4 text-good" aria-hidden />
  if (state === 'warning') return <CircleHelp className="size-4 text-warning" aria-hidden />
  return <AlertTriangle className="size-4 text-bad" aria-hidden />
}

function HealthRow({ check }: { check: HealthCheck }) {
  return (
    <li className="flex items-start gap-3 border-b border-line py-3 last:border-0 last:pb-0">
      <span className="mt-0.5"><CheckIcon state={check.state} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{check.name}</span>
        <span className="mt-0.5 block break-words text-xs leading-5 text-muted">{check.detail}</span>
      </span>
      <span className="shrink-0 pt-0.5 text-[10px] font-semibold tracking-wide text-muted uppercase">{check.state}</span>
    </li>
  )
}

export default function DevTools({ userId, email }: { userId: string | undefined; email: string | undefined }) {
  const ledgerStatus = useLedger((state) => state.status)
  const ledgerError = useLedger((state) => state.error)
  const [health, setHealth] = useState<HealthCheck[]>([])
  const [checking, setChecking] = useState(false)
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const [wiping, setWiping] = useState(false)
  const [wipeMessage, setWipeMessage] = useState<{ state: 'success' | 'error'; text: string } | null>(null)

  const checkHealth = useCallback(async () => {
    setChecking(true)
    const storageResult: HealthCheck = (() => {
      try {
        const key = `buckets:dev-health:${crypto.randomUUID()}`
        localStorage.setItem(key, 'ok')
        localStorage.removeItem(key)
        return { name: 'Browser storage', detail: 'Local storage is available for theme and export reminder preferences.', state: 'healthy' }
      } catch (cause) {
        return { name: 'Browser storage', detail: cause instanceof Error ? cause.message : 'Local storage is unavailable.', state: 'error' }
      }
    })()
    setHealth([
      { name: 'Application runtime', detail: 'Page loaded and React is running.', state: 'healthy' },
      { name: 'Browser network', detail: navigator.onLine ? 'Browser reports an online connection.' : 'Browser is offline.', state: navigator.onLine ? 'healthy' : 'error' },
      { name: 'Supabase configuration', detail: hasSupabaseConfig ? 'Project URL and public client key are configured.' : 'Project URL or public client key is missing.', state: hasSupabaseConfig ? 'healthy' : 'error' },
      { name: 'Authenticated data load', detail: ledgerStatus === 'ready' ? 'The current user’s ledger loaded.' : ledgerStatus === 'loading' ? 'The current user’s ledger is loading.' : ledgerError || `Ledger state: ${ledgerStatus}.`, state: ledgerStatus === 'ready' ? 'healthy' : ledgerStatus === 'error' ? 'error' : 'warning' },
      ...REQUIRED_TABLES.map(({ name }) => ({ name, detail: 'Checking Supabase schema…', state: 'checking' as const })),
      { name: 'Supabase Auth', detail: 'Checking the signed-in user…', state: 'checking' },
      storageResult,
    ])

    if (!hasSupabaseConfig) {
      setHealth((current) => current.map((item) => item.state === 'checking'
        ? { ...item, detail: 'Skipped because Supabase configuration is missing.', state: 'warning' }
        : item))
      setCheckedAt(new Date())
      setChecking(false)
      return
    }

    const checkResults = await Promise.all([
      supabase.auth.getUser(),
      ...REQUIRED_TABLES.map(({ table, column }) => supabase.from(table).select(column).limit(1)),
    ]).catch((cause: unknown) => {
      const detail = cause instanceof Error ? cause.message : 'Supabase health checks could not be completed.'
      setHealth((current) => current.map((item) => item.state === 'checking' ? { ...item, detail, state: 'error' } : item))
      setCheckedAt(new Date())
      setChecking(false)
      return null
    })
    if (!checkResults) return
    const [authResult, ...tableResults] = checkResults
    const authCheck: HealthCheck = authResult.error
      ? { name: 'Supabase Auth', detail: authResult.error.message, state: userId ? 'error' : 'warning' }
      : userId && authResult.data.user?.id === userId
        ? { name: 'Supabase Auth', detail: `Authenticated as ${email || 'current user'}; server confirmed the session.`, state: 'healthy' }
        : { name: 'Supabase Auth', detail: 'No user is signed in; sign in to verify authenticated data access or clear data.', state: 'warning' }
    const tableChecks = REQUIRED_TABLES.map(({ name }, index): HealthCheck => {
      const result = tableResults[index]
      return result.error
        ? { name, detail: result.error.message, state: userId ? 'error' : 'warning' }
        : { name, detail: userId ? 'Table and expected columns are available to this signed-in user.' : 'Table responded; sign in to verify authenticated RLS access.', state: userId ? 'healthy' : 'warning' }
    })

    setHealth((current) => [
      ...current.filter((item) => !REQUIRED_TABLES.some(({ name }) => name === item.name) && item.name !== 'Supabase Auth'),
      ...tableChecks,
      authCheck,
      storageResult,
    ])
    setCheckedAt(new Date())
    setChecking(false)
  }, [email, ledgerError, ledgerStatus, userId])

  useEffect(() => {
    const timer = window.setTimeout(() => { void checkHealth() }, 0)
    return () => window.clearTimeout(timer)
  }, [checkHealth])

  async function wipeFinanceData() {
    if (!userId || confirmation !== WIPE_CONFIRMATION || wiping) return
    const accepted = window.confirm(
      'Permanently delete all accounts, buckets, groups, transactions, recurring plans, paycheck templates, income streams, and reconciliation history for this signed-in user? Their login and Supabase Auth account will remain.',
    )
    if (!accepted) return

    setWiping(true)
    setWipeMessage(null)
    try {
      const { error } = await supabase.rpc('clear_user_finance_data')
      if (error) throw new Error(error.message)
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : String(cause)
      setWipeMessage({ state: 'error', text: `Reset failed: ${detail}. Confirm migration 009 has been applied.` })
      setWiping(false)
      return
    }

    useLedger.setState({ status: 'loading', error: null, accounts: [], groups: [], buckets: [], events: [] })
    queryClient.setQueryData(['ledger', userId], { accounts: [], groups: [], buckets: [], events: [] })
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['ledger'] }),
      queryClient.invalidateQueries({ queryKey: ['planning-settings'] }),
    ])
    setConfirmation('')
    setWipeMessage({ state: 'success', text: 'All finance data for this user was cleared. Their sign-in and Supabase Auth account are unchanged.' })
    setWiping(false)
    void checkHealth()
  }

  const healthSummary = health.some((item) => item.state === 'error')
    ? 'One or more checks need attention.'
    : health.some((item) => item.state === 'checking' || item.state === 'warning')
      ? 'Checks are still running or need a follow-up.'
      : 'All checked services are responding.'

  return (
    <main className="min-h-screen bg-canvas px-4 py-6 text-ink md:px-8 md:py-8">
      <div className="mx-auto max-w-5xl">
        <a href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-ink">
          <ArrowLeft className="size-4" /> Back to app
        </a>

        <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.13em] text-accent uppercase">
              <Activity className="size-4" /> Development tools
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-[2rem]">System health</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted">Private diagnostics for this development build. This page is only available at <code className="rounded bg-sunken px-1.5 py-0.5 text-ink">/devtools</code> and has no in-app navigation link.</p>
          </div>
          <Button variant="secondary" onClick={() => void checkHealth()} disabled={checking}>
            <RefreshCw className={`mr-2 size-4 ${checking ? 'animate-spin' : ''}`} /> Recheck health
          </Button>
        </header>

        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted"><Server className="size-4" /> Build mode</div>
            <p className="mt-2 text-lg font-semibold">{import.meta.env.MODE}</p>
            <p className="mt-1 text-xs text-muted">{import.meta.env.DEV ? 'Development-only tools enabled' : 'Development tools disabled'}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted"><ShieldCheck className="size-4" /> Signed-in user</div>
            <p className="mt-2 truncate text-lg font-semibold" title={email}>{email || (userId ? 'Authenticated user' : 'Not signed in')}</p>
            <p className="mt-1 truncate text-xs text-muted" title={userId}>ID: {userId || '—'}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted"><Wifi className="size-4" /> Latest check</div>
            <p className="mt-2 text-lg font-semibold">{healthSummary}</p>
            <p className="mt-1 text-xs text-muted">{checkedAt ? checkedAt.toLocaleString() : 'Checking services…'}</p>
          </Card>
        </div>

        <Card className="mb-5 p-5 md:p-6">
          <div className="mb-3 flex items-center gap-2">
            <Database className="size-5 text-accent" />
            <div>
              <h2 className="font-semibold">Application and Supabase</h2>
              <p className="mt-0.5 text-xs text-muted">Schema checks use the signed-in user’s access, so they also exercise the normal RLS path.</p>
            </div>
          </div>
          <ul aria-live="polite">
            {health.map((check) => <HealthRow key={check.name} check={check} />)}
          </ul>
        </Card>

        <Card className="border-bad/30 p-5 md:p-6">
          <div className="mb-4 flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-bad-soft text-bad"><Trash2 className="size-5" /></span>
            <div>
              <h2 className="font-semibold">Clear finance data</h2>
              <p className="mt-1 text-sm leading-6 text-muted">Permanently removes this user’s accounts, groups, buckets, transaction history, recurring plans, paycheck templates, income streams, and reconciliation history. The signed-in Supabase Auth user and login details are kept.</p>
            </div>
          </div>
          <label htmlFor="wipe-confirmation" className="mb-1.5 block text-xs font-medium text-muted">{userId ? <>Type <span className="font-semibold text-ink">{WIPE_CONFIRMATION}</span> to enable the reset.</> : 'Sign in to clear data for a specific user.'}</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="wipe-confirmation"
              autoComplete="off"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={WIPE_CONFIRMATION}
              className="min-h-10 min-w-0 flex-1 rounded-xl border border-line bg-sunken px-3 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-bad/60 focus:ring-2 focus:ring-bad/15"
            />
            <Button variant="danger" onClick={() => void wipeFinanceData()} disabled={!userId || confirmation !== WIPE_CONFIRMATION || wiping}>
              {wiping ? <><LoaderCircle className="mr-2 size-4 animate-spin" /> Clearing data…</> : <><Trash2 className="mr-2 size-4" /> Clear finance data</>}
            </Button>
          </div>
          {wipeMessage && <p role={wipeMessage.state === 'error' ? 'alert' : 'status'} className={`mt-3 text-sm ${wipeMessage.state === 'error' ? 'text-bad' : 'text-good'}`}>{wipeMessage.text}</p>}
        </Card>
      </div>
    </main>
  )
}
