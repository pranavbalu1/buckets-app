import { useState } from 'react'
import Field from '../components/Field'
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
    <div className="grid min-h-screen place-items-center p-4">
      <form onSubmit={submit} className="card flex w-full max-w-sm flex-col gap-4 p-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent font-bold text-accent-ink">B</div>
          <h1 className="text-xl font-semibold">Buckets</h1>
        </div>
        <Field label="Email">
          <input className="input" type="email" autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <input className="input" type="password" autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <button disabled={busy} className="btn btn-primary">
          {busy ? 'Signing in…' : 'Log in'}
        </button>
        {error && <p className="text-sm text-bad">{error}</p>}
      </form>
    </div>
  )
}