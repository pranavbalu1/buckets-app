import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [accountCount, setAccountCount] = useState<number | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    supabase
      .from('accounts')
      .select('id', { count: 'exact', head: true })
      .then(({ count, error }) => {
        if (error) setError(error.message)
        else setAccountCount(count)
      })
  }, [session])

async function login(e: React.FormEvent) {
  e.preventDefault()
  setError('')

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  console.log('LOGIN DATA:', data)
  console.log('LOGIN ERROR:', error)

  if (error) {
    setError(error.message)
  }
}

  if (!session) {
    return (
      <form onSubmit={login} className="mx-auto mt-24 flex max-w-sm flex-col gap-3 p-4">
        <h1 className="text-2xl font-bold">Buckets</h1>
        <input className="rounded border p-2" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} />
        <input className="rounded border p-2" type="password" placeholder="Password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="rounded bg-black p-2 text-white">Log in</button>
        {error && <p className="text-red-600">{error}</p>}
      </form>
    )
  }

  return (
    <div className="mx-auto mt-24 max-w-sm space-y-3 p-4">
      <h1 className="text-2xl font-bold">Logged in</h1>
      <p>Accounts in database: {accountCount ?? '...'}</p>
      {error && <p className="text-red-600">{error}</p>}
      <button className="rounded border p-2" onClick={() => supabase.auth.signOut()}>
        Log out
      </button>
    </div>
  )
}