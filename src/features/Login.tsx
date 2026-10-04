import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-24 flex max-w-sm flex-col gap-3 p-4">
      <h1 className="text-2xl font-bold">Buckets</h1>
      <input className="rounded border p-2" type="email" placeholder="Email" autoComplete="email"
        value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="rounded border p-2" type="password" placeholder="Password"
        autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button disabled={busy} className="rounded bg-black p-2 text-white disabled:opacity-50">
        {busy ? 'Signing in...' : 'Log in'}
      </button>
      {error && <p className="text-red-600">{error}</p>}
    </form>
  )
}