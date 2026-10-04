import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { useLedger } from './storage/store'
import type { AddKind, Tab } from './nav'
import Modal from './components/Modal'
import Sidebar from './components/Sidebar'
import Login from './features/Login'
import Dashboard from './features/Dashboard'
import Budget from './features/Budget'
import Transactions from './features/Transactions'
import Accounts from './features/Accounts'
import QuickAdd from './features/QuickAdd'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [tab, setTab] = useState<Tab>('Budget')
  const [addKind, setAddKind] = useState<AddKind | null>(null)
  const { status, error, load, reset, clearError } = useLedger()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (userId) load()
    else reset()
  }, [userId, load, reset])

  // Press "n" anywhere (outside a text field) to add a transaction.
  useEffect(() => {
    if (!userId) return
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement
      const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)
      if (e.key === 'n' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setAddKind((k) => k ?? 'expense')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [userId])

  if (!authReady) return null
  if (!session) return <Login />

  return (
    <div className="min-h-screen md:flex">
      <Sidebar
        tab={tab}
        onNavigate={setTab}
        onAdd={() => setAddKind('expense')}
        onLogout={() => supabase.auth.signOut()}
      />

      <main className="min-w-0 flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-6xl">
          {tab !== 'Budget' && <h1 className="mb-6 text-2xl font-semibold">{tab}</h1>}

          {error && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-bad/30 bg-bad-soft p-3 text-sm text-bad">
              <span>{error}</span>
              <button className="underline" onClick={clearError}>
                Dismiss
              </button>
            </div>
          )}

          {status === 'loading' && <p className="text-muted">Loading…</p>}
          {status === 'ready' && (
            <>
              {tab === 'Dashboard' && <Dashboard onAdd={setAddKind} onNavigate={setTab} />}
              {tab === 'Budget' && <Budget />}
              {tab === 'Transactions' && <Transactions />}
              {tab === 'Accounts' && <Accounts />}
              {tab === 'Analytics' && <p className="text-muted">Analytics is coming soon.</p>}
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