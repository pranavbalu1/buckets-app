import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
import { useLedger } from './storage/store'
import type { AddKind, Tab } from './nav'
import Modal from './components/Modal'
import Sidebar from './components/Sidebar'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import Login from './features/Login'
import Dashboard from './features/Dashboard'
import Budget from './features/Budget'
import Transactions from './features/Transactions'
import Accounts from './features/Accounts'
import QuickAdd from './features/QuickAdd'
import Analytics from './features/Analytics'
import Settings from './features/Settings'
import { queryClient } from './lib/queryClient'
import { supabaseRepository } from './storage/supabaseRepository'

const pageDescriptions: Partial<Record<Tab, string>> = {
  Budget: 'Give every dollar a job and keep your goals in view.',
  Transactions: 'Review, search, and manage activity across your buckets.',
  Analytics: 'A closer look at the patterns behind your money.',
  Accounts: 'Keep your account balances and cash locations organized.',
  Settings: 'Manage your data, recurring plans, paychecks, and account checks.',
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [tab, setTab] = useState<Tab>('Dashboard')
  const [addKind, setAddKind] = useState<AddKind | null>(null)
  const { status, error, reset, clearError } = useLedger()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => data.subscription.unsubscribe()
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
      useLedger.setState({ status: 'error', error: ledgerQuery.error.message })
    } else if (ledgerQuery.data) {
      useLedger.setState({ ...ledgerQuery.data, status: 'ready', error: null })
    }
  }, [authReady, userId, ledgerQuery.isPending, ledgerQuery.error, ledgerQuery.data, reset])

  // Press "n" anywhere outside a text field to add a transaction.
  useEffect(() => {
    if (!userId) return
    function onKey(event: KeyboardEvent) {
      const element = event.target as HTMLElement
      const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)
      if (event.key === 'n' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        setAddKind((kind) => kind ?? 'expense')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [userId])

  if (!authReady) return null
  if (!session) return <Login />

  return (
    <div className="min-h-screen bg-canvas md:flex">
      <Sidebar
        tab={tab}
        onNavigate={setTab}
        onAdd={() => setAddKind('expense')}
        onLogout={() => supabase.auth.signOut()}
      />

      <main className="min-w-0 flex-1 px-4 pb-8 pt-5 md:px-8 md:py-8 xl:px-10">
        <div className="mx-auto max-w-[1440px]">
          {tab !== 'Dashboard' && (
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.13em] text-accent uppercase">
                  <span className="size-1.5 rounded-full bg-accent" /> Workspace
                </div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-[2rem]">{tab}</h1>
                <p className="mt-1.5 text-sm text-muted">{pageDescriptions[tab]}</p>
              </div>
              <Button variant="primary" className="hidden sm:inline-flex" onClick={() => setAddKind('expense')}>
                + Add transaction
              </Button>
            </div>
          )}

          {error && (
            <div role="alert" className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-bad/30 bg-bad-soft p-3.5 text-sm text-bad">
              <span>{error}</span>
              <button className="shrink-0 underline underline-offset-2" onClick={clearError}>Dismiss</button>
            </div>
          )}

          {status === 'loading' && (
            <Card className="flex min-h-48 items-center justify-center gap-3 p-8 text-sm text-muted">
              <span className="size-4 animate-spin rounded-full border-2 border-accent/25 border-t-accent" aria-hidden />
              Loading your money plan…
            </Card>
          )}
          {status === 'error' && (
            <Card className="flex flex-col items-start gap-3 border-destructive/25 p-5" role="alert">
              <div>
                <h2 className="font-semibold">Could not connect to your Supabase project</h2>
                <p className="mt-1 text-sm text-muted-foreground">{error || 'Check your connection and Supabase project status. A free project may need to be resumed from the Supabase dashboard.'}</p>
              </div>
              <Button variant="primary" onClick={() => void ledgerQuery.refetch()}>Try again</Button>
            </Card>
          )}
          {status === 'ready' && (
            <>
              {tab === 'Dashboard' && <Dashboard onAdd={setAddKind} onNavigate={setTab} />}
              {tab === 'Budget' && <Budget />}
              {tab === 'Transactions' && <Transactions />}
              {tab === 'Accounts' && <Accounts />}
              {tab === 'Analytics' && <Analytics />}
              {tab === 'Settings' && <Settings userId={session.user.id} />}
            </>
          )}
        </div>
      </main>

      {addKind && (
        <Modal title="Add transaction" onClose={() => setAddKind(null)}>
          <QuickAdd key={addKind} initialKind={addKind} onDone={() => setAddKind(null)} />
        </Modal>
      )}
    </div>
  )
}
