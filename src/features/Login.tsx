import { useState } from 'react'
import { ArrowUpRight, Check, Layers3, LockKeyhole } from 'lucide-react'
import { Button, Card, FormField, Input, SegmentedControl } from '../components'
import BrandMark from '../app/components/BrandMark'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import loginHero from '../assets/login-hero.jpg'

const emailSchema = z.email('Enter a valid email address.').max(254, 'Email addresses must be 254 characters or fewer.')
const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.').max(256, 'Password is too long.'),
})
const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(80, 'Name must be 80 characters or fewer.'),
  email: emailSchema,
  password: z.string().min(8, 'Use a password with at least 8 characters.').max(72, 'Password must be 72 characters or fewer.'),
  confirmPassword: z.string(),
}).refine((input) => input.password === input.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match.',
})
const registrationNotice = 'If you can’t sign in, check your inbox for any required confirmation message. If you already have an account, choose Sign in instead.'

export default function Login({ initialError = '' }: { initialError?: string }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'register'>('signin')
  const [error, setError] = useState(initialError)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')
    const normalizedEmail = email.trim().toLowerCase()
    let displayName = ''
    if (mode === 'signin') {
      const input = signInSchema.safeParse({ email: normalizedEmail, password })
      if (!input.success) {
        setError(input.error.issues[0]?.message ?? 'Enter valid sign-in details.')
        return
      }
    } else {
      const input = registerSchema.safeParse({ name, email: normalizedEmail, password, confirmPassword })
      if (!input.success) {
        setError(input.error.issues[0]?.message ?? 'Enter valid account details.')
        return
      }
      displayName = input.data.name
    }

    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
        if (signInError) throw signInError
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { full_name: displayName } },
        })
        if (signUpError) {
          if (/user already registered|email.*already (?:registered|exists)/i.test(signUpError.message)) {
            setNotice(registrationNotice)
            return
          }
          throw signUpError
        }
        if (data.user?.identities?.length === 0) {
          setNotice(registrationNotice)
          return
        }
        setNotice(data.session ? 'Your account is ready. Opening your workspace…' : registrationNotice)
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : mode === 'signin' ? 'Unable to sign in. Please try again.' : 'Unable to create your account. Please try again.')
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
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
              <p className="mt-1.5 text-sm text-muted">{mode === 'signin' ? 'Sign in to pick up where you left off.' : 'Set up your personal budgeting workspace.'}</p>
            </div>
            <SegmentedControl
              value={mode}
              onChange={(nextMode) => {
                setMode(nextMode as 'signin' | 'register')
                setError('')
                setNotice('')
              }}
              options={[{ id: 'signin', label: 'Sign in' }, { id: 'register', label: 'Create account' }]}
            />
            <form onSubmit={submit} className="space-y-5">
              {mode === 'register' && (
                <FormField label="Full name" htmlFor="register-name" required>
                  <Input id="register-name" type="text" autoComplete="name" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" className="h-11" />
                </FormField>
              )}
              <FormField label="Email address" htmlFor="login-email" required>
                <Input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="h-11" />
              </FormField>
              <FormField label="Password" htmlFor="login-password" required helperText={mode === 'register' ? 'Use at least 8 characters.' : undefined}>
                <Input id="login-password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="h-11" />
              </FormField>
              {mode === 'register' && (
                <FormField label="Confirm password" htmlFor="register-confirm-password" required>
                  <Input id="register-confirm-password" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter your password again" className="h-11" />
                </FormField>
              )}
              {error && <p role="alert" className="rounded-lg border border-bad/25 bg-bad-soft p-3 text-sm text-bad">{error}</p>}
              {notice && <p role="status" className="rounded-lg border border-good/25 bg-good/10 p-3 text-sm text-good">{notice}</p>}
              <Button variant="primary" disabled={busy} className="h-11 w-full justify-between px-4">
                <span>{busy ? (mode === 'signin' ? 'Signing in…' : 'Creating account…') : mode === 'signin' ? 'Sign in' : 'Create account'}</span>
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
