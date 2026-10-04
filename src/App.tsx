import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { useLedger } from './storage/store'
import Login from './features/Login'
import Dashboard from './features/Dashboard'
import Buckets from './features/Buckets'
import Accounts from './features/Accounts'

const TABS = ['Dashboard', 'Budget', 'Transactions', 'Analytics', 'Accounts'] as const
type Tab = (typeof TABS)[number]

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [tab, setTab] = useState<Tab>('Dashboard')
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

  if (!authReady) return null
  if (!session) return <Login />

  return (
    <div className="mx-auto max-w-4xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Buckets</h1>
        <button className="text-sm underline" onClick={() => supabase.auth.signOut()}>Log out</button>
      </header>

      <nav className="mb-6 flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-2 ${tab === t ? 'border-b-2 border-black font-semibold' : 'text-gray-500'}`}>
            {t}
          </button>
        ))}
      </nav>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded border border-red-300 bg-red-50 p-3 text-red-700">
          <span>{error}</span>
          <button className="underline" onClick={clearError}>Dismiss</button>
        </div>
      )}

      {status === 'loading' && <p>Loading...</p>}
      {status === 'ready' && (
        <>
          {tab === 'Dashboard' && <Dashboard />}
          {tab === 'Budget' && <Buckets />}
          {tab === 'Accounts' && <Accounts />}
          {(tab === 'Transactions' || tab === 'Analytics') && (
            <p className="text-gray-500">{tab} is coming soon.</p>
          )}
        </>
      )}
    </div>
  )
}