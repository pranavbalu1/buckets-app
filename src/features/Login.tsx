import { useState } from 'react'
import { ArrowUpRight, Check, Layers3, LockKeyhole } from 'lucide-react'
import { Button } from '../components/ui/button'
import BrandMark from '../components/BrandMark'
import { Card } from '../components/ui/card'
import { FormField } from '../components/ui/form-field'
import { Input } from '../components/ui/input'
import { supabase } from '../lib/supabase'
import loginHero from '../assets/login-hero.jpg'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) setError(signInError.message)
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Unable to sign in. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-4 sm:p-6 lg:p-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[1.75rem] border border-line bg-surface shadow-xl lg:min-h-[650px] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative flex min-h-96 flex-col justify-between overflow-hidden bg-[#121214] p-6 text-white sm:p-9 lg:min-h-0 lg:p-12">
          <img
            src={loginHero}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 size-full object-cover object-center opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#09090b]/90 via-[#09090b]/75 to-[#09090b]/55" aria-hidden />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b]/75 via-transparent to-[#09090b]/20" aria-hidden />
          <div className="absolute -right-24 -top-28 size-80 rounded-full border-[44px] border-white/[0.045]" aria-hidden />
          <div className="absolute -bottom-36 -left-20 size-96 rounded-full bg-[#00bdf9]/10 blur-3xl" aria-hidden />
          <div className="relative flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-ink"><BrandMark className="size-6" /></span>
            <div>
              <span className="block text-base font-semibold tracking-tight">Buckets</span>
              <span className="block text-[10px] font-medium tracking-[0.15em] text-white/55 uppercase">Money, with intention</span>
            </div>
          </div>

          <div className="relative my-10 max-w-lg lg:my-16">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/70">
              <Layers3 className="size-3.5 text-[#e6ff4b]" /> A calmer way to budget
            </p>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">Make room for what matters.</h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/65">Set money aside with purpose, keep your accounts in view, and make your next decision with a little more clarity.</p>
          </div>

          <div className="relative rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-white/55">A plan you can see</p>
                <p className="mt-0.5 text-sm font-medium">Give your money a direction</p>
              </div>
              <ArrowUpRight className="size-4 text-[#e6ff4b]" />
            </div>
            <div className="space-y-2.5 text-xs">
              {[
                ['Monthly bills', 'bg-[#e6ff4b]', 'w-[78%]'],
                ['Everyday spending', 'bg-[#00bdf9]', 'w-[56%]'],
                ['Future plans', 'bg-emerald-400', 'w-[42%]'],
              ].map(([label, color, width]) => (
                <div key={label} className="grid grid-cols-[7.5rem_1fr] items-center gap-3">
                  <span className="truncate text-white/70">{label}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-white/10"><span className={`block h-full rounded-full ${color} ${width}`} /></span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-[11px] text-white/55">
              <Check className="size-3.5 text-[#e6ff4b]" /> Your plan stays in your hands
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-5 sm:p-10 lg:p-12">
          <Card className="w-full max-w-sm border-0 p-0 shadow-none">
            <div className="mb-8">
              <span className="mb-5 grid size-11 place-items-center rounded-xl bg-accent-soft text-accent"><LockKeyhole className="size-5" /></span>
              <p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase">Your workspace</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Welcome back</h2>
              <p className="mt-1.5 text-sm text-muted">Sign in to pick up where you left off.</p>
            </div>
            <form onSubmit={submit} className="space-y-5">
              <FormField label="Email address" htmlFor="login-email" required>
                <Input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="h-11" />
              </FormField>
              <FormField label="Password" htmlFor="login-password" required>
                <Input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="h-11" />
              </FormField>
              {error && <p role="alert" className="rounded-lg border border-bad/25 bg-bad-soft p-3 text-sm text-bad">{error}</p>}
              <Button variant="primary" disabled={busy} className="h-11 w-full justify-between px-4">
                <span>{busy ? 'Signing in…' : 'Sign in'}</span>
                <ArrowUpRight className="size-4" />
              </Button>
            </form>
            <p className="mt-6 text-center text-xs leading-5 text-muted">Your budget is personal. Keep your sign-in details private.</p>
          </Card>
        </section>
      </div>
    </main>
  )
}
