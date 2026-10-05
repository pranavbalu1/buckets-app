import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArchiveRestore, CalendarClock, Check, CircleDollarSign, Download, FileUp, Palette, Plus, WalletCards } from 'lucide-react'
import { Button, Card, FormField, Input, Modal, Select, Tile, TileBoard } from '../components'
import { computeBalances } from '../domain/balances'
import { makeEvent } from '../domain/events'
import { todayString } from '../domain/dates'
import { formatCents, parseDollars } from '../domain/money'
import { maxAllocatable } from '../domain/budget'
import { queryClient } from '../lib/queryClient'
import { supabase } from '../lib/supabase'
import { useLedger } from '../storage/store'
import { supabaseRepository } from '../storage/supabaseRepository'
import { downloadBackup, parseBackup } from '../storage/backup'
import type { ThemePreference } from '../lib/theme'
import { z } from 'zod'
import {
  dateSchema,
  entityNameSchema,
  frequencySchema,
  firstIssueMessage,
  paycheckTemplateInputSchema,
  planTypeSchema,
  recurringPlanInputSchema,
  reconciliationInputSchema,
} from '../domain/validate'

type PlanType = z.infer<typeof planTypeSchema>
type Frequency = z.infer<typeof frequencySchema>
const planRowSchema = z.object({
  id: z.string().uuid(), name: entityNameSchema,
  event_type: planTypeSchema,
  amount_cents: z.number().int().positive().safe(),
  account_id: z.string().uuid().nullable(), to_account_id: z.string().uuid().nullable(),
  bucket_id: z.string().uuid().nullable(), to_bucket_id: z.string().uuid().nullable(),
  description: z.string().max(240), payee: z.string().max(120).nullable(), notes: z.string().max(2_000).nullable(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'yearly']),
  start_date: dateSchema, end_date: dateSchema.nullable(), next_run: dateSchema, active: z.boolean(),
}).superRefine((row, context) => {
  const result = recurringPlanInputSchema.safeParse({
    name: row.name, eventType: row.event_type, amountCents: row.amount_cents,
    accountId: row.account_id, toAccountId: row.to_account_id,
    bucketId: row.bucket_id, toBucketId: row.to_bucket_id,
    description: row.description, payee: row.payee, notes: row.notes,
    frequency: row.frequency, startDate: row.start_date, endDate: row.end_date, nextRun: row.next_run,
  })
  if (!result.success) result.error.issues.forEach((issue) => context.addIssue({ code: 'custom', path: issue.path, message: issue.message }))
})
const templateRowSchema = z.object({
  id: z.string().uuid(), name: entityNameSchema, account_id: z.string().uuid().nullable(),
  allocations: z.array(z.object({ bucketId: z.string().uuid(), cents: z.number().int().positive().safe() })),
}).superRefine((row, context) => {
  const result = paycheckTemplateInputSchema.safeParse({ name: row.name, accountId: row.account_id, allocations: row.allocations })
  if (!result.success) result.error.issues.forEach((issue) => context.addIssue({ code: 'custom', path: issue.path, message: issue.message }))
})
const reconciliationRowSchema = z.object({
  id: z.string().uuid(), account_id: z.string().uuid(), date: dateSchema,
  statement_balance_cents: z.number().int().safe(), app_balance_cents: z.number().int().safe(),
  adjustment_event_id: z.string().uuid().nullable(),
}).superRefine((row, context) => {
  const result = reconciliationInputSchema.safeParse({
    accountId: row.account_id, date: row.date,
    statementBalanceCents: row.statement_balance_cents, appBalanceCents: row.app_balance_cents,
  })
  if (!result.success) result.error.issues.forEach((issue) => context.addIssue({ code: 'custom', path: issue.path, message: issue.message }))
})

type PlanRow = z.infer<typeof planRowSchema>
type TemplateRow = z.infer<typeof templateRowSchema>
type ReconciliationRow = z.infer<typeof reconciliationRowSchema>
interface PlanningData { plans: PlanRow[]; templates: TemplateRow[]; reconciliations: ReconciliationRow[] }

const LAST_EXPORT_KEY = 'buckets.last-export.v1'
const today = todayString()

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

function readBalance(text: string): number | null {
  const cleaned = text.trim()
  const negative = cleaned.startsWith('-')
  const positive = cleaned.startsWith('+')
  const cents = parseDollars(cleaned.replace(/^[+-]/, ''))
  if (cents === null) return null
  return negative ? -cents : positive ? cents : cents
}

export default function Settings({ userId, theme, onThemeChange }: {
  userId: string
  theme: ThemePreference
  onThemeChange: (theme: ThemePreference) => void
}) {
  const ledger = useLedger()
  const [lastExport, setLastExport] = useState(() => {
    try { return localStorage.getItem(LAST_EXPORT_KEY) } catch { return null }
  })
  const [exportIsOld, setExportIsOld] = useState(true)
  const [backupBusy, setBackupBusy] = useState(false)
  const [backupMessage, setBackupMessage] = useState('')
  const [error, setError] = useState('')
  const [recurringMessage, setRecurringMessage] = useState('')
  const [templateMessage, setTemplateMessage] = useState('')
  const [reconciliationMessage, setReconciliationMessage] = useState('')
  const [applyTemplate, setApplyTemplate] = useState<TemplateRow | null>(null)
  const [applyAmount, setApplyAmount] = useState('')
  const [applyDate, setApplyDate] = useState(today)
  const [applyError, setApplyError] = useState('')
  const [applyBusy, setApplyBusy] = useState(false)
  const [planName, setPlanName] = useState('')
  const [planType, setPlanType] = useState<PlanType>('income')
  const [planAmount, setPlanAmount] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [planStart, setPlanStart] = useState(today)
  const [planEnd, setPlanEnd] = useState('')
  const [planAccount, setPlanAccount] = useState('')
  const [planToAccount, setPlanToAccount] = useState('')
  const [planBucket, setPlanBucket] = useState('')
  const [planToBucket, setPlanToBucket] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [templateAccount, setTemplateAccount] = useState('')
  const [allocationInputs, setAllocationInputs] = useState<Record<string, string>>({})
  const [reconcileAccount, setReconcileAccount] = useState('')
  const [reconcileDate, setReconcileDate] = useState(today)
  const [statementBalance, setStatementBalance] = useState('')
  const [postAdjustment, setPostAdjustment] = useState(true)

  const planningQuery = useQuery<PlanningData>({
    queryKey: ['planning-settings', userId],
    queryFn: async () => {
      const [plans, templates, reconciliations] = await Promise.all([
        supabase.from('recurring_plans').select('*').order('next_run'),
        supabase.from('paycheck_templates').select('*').order('created_at'),
        supabase.from('reconciliations').select('*').order('date', { ascending: false }).limit(100),
      ])
      fail(plans.error); fail(templates.error); fail(reconciliations.error)
      return {
        plans: z.array(planRowSchema).parse(plans.data ?? []),
        templates: z.array(templateRowSchema).parse(templates.data ?? []),
        reconciliations: z.array(reconciliationRowSchema).parse(reconciliations.data),
      }
    },
  })

  const activeAccounts = ledger.accounts.filter((account) => !account.archived)
  const activeBuckets = ledger.buckets.filter((bucket) => !bucket.archived)
  const planning = planningQuery.data
  const lastExportDate = lastExport ? new Date(lastExport) : null
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const timestamp = lastExport ? Date.parse(lastExport) : NaN
      setExportIsOld(!Number.isFinite(timestamp) || Date.now() - timestamp > 30 * 24 * 60 * 60 * 1000)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [lastExport])
  const selectedAccountBalance = useMemo(() => {
    if (!reconcileAccount || !reconcileDate) return 0
    return computeBalances(ledger.events, reconcileDate).accounts[reconcileAccount] ?? 0
  }, [ledger.events, reconcileAccount, reconcileDate])
  const parsedStatement = readBalance(statementBalance)
  const difference = parsedStatement === null ? null : parsedStatement - selectedAccountBalance

  async function refreshPlanning() {
    await queryClient.invalidateQueries({ queryKey: ['planning-settings'] })
  }

  async function exportAll() {
    setBackupBusy(true); setBackupMessage(''); setError('')
    try {
      const backup = await supabaseRepository.exportAll()
      downloadBackup(backup)
      const timestamp = new Date().toISOString()
      try { localStorage.setItem(LAST_EXPORT_KEY, timestamp) } catch { /* The download still succeeded. */ }
      setLastExport(timestamp)
      setBackupMessage('Backup downloaded. Keep the JSON file somewhere private and safe.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Backup export failed.')
    } finally { setBackupBusy(false) }
  }

  async function importFile(file?: File) {
    if (!file) return
    if (file.size > 50 * 1024 * 1024) {
      setError('This backup is larger than the 50 MB import limit.')
      return
    }
    setBackupBusy(true); setBackupMessage(''); setError('')
    try {
      const backup = parseBackup(JSON.parse(await file.text()))
      if (!window.confirm('Import this backup and replace all current accounts, buckets, events, plans, templates, and reconciliation history? This cannot be undone.')) return
      await supabaseRepository.importAll(backup)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ledger'] }),
        queryClient.invalidateQueries({ queryKey: ['planning-settings'] }),
      ])
      setBackupMessage('Backup restored successfully.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Backup import failed. Check that this is a valid Buckets backup file.')
    } finally { setBackupBusy(false) }
  }

  async function saveRecurring(event: React.FormEvent) {
    event.preventDefault(); setRecurringMessage(''); setError('')
    const cents = parseDollars(planAmount)
    if (!planName.trim() || cents === null || cents <= 0) { setError('Enter a plan name and a positive amount.'); return }
    const candidate = {
      name: planName,
      eventType: planType,
      amountCents: cents,
      accountId: planType === 'income' || planType === 'expense' || planType === 'account_transfer' ? planAccount || null : null,
      toAccountId: planType === 'account_transfer' ? planToAccount || null : null,
      bucketId: planType === 'expense' || planType === 'bucket_move' ? planBucket || null : null,
      toBucketId: planType === 'bucket_move' ? planToBucket || null : null,
      description: '', payee: null, notes: null,
      frequency, startDate: planStart, endDate: planEnd || null, nextRun: planStart,
    }
    const parsed = recurringPlanInputSchema.safeParse(candidate)
    if (!parsed.success) { setError(firstIssueMessage(parsed.error, 'Enter a valid recurring plan.')); return }
    if (parsed.data.accountId && !activeAccounts.some((account) => account.id === parsed.data.accountId)) { setError('Choose an active account for this plan.'); return }
    for (const id of [parsed.data.toAccountId]) {
      if (id && !activeAccounts.some((account) => account.id === id)) { setError('Choose an active destination account.'); return }
    }
    for (const id of [parsed.data.bucketId, parsed.data.toBucketId]) {
      if (id && !activeBuckets.some((bucket) => bucket.id === id)) { setError('Choose an active bucket for this plan.'); return }
    }
    const shaped = {
      name: parsed.data.name,
      event_type: parsed.data.eventType,
      amount_cents: parsed.data.amountCents,
      account_id: parsed.data.accountId,
      to_account_id: parsed.data.toAccountId,
      bucket_id: parsed.data.bucketId,
      to_bucket_id: parsed.data.toBucketId,
      description: parsed.data.description,
      payee: parsed.data.payee,
      notes: parsed.data.notes,
      frequency: parsed.data.frequency,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      next_run: parsed.data.nextRun,
    }
    try {
      const { error: insertError } = await supabase.from('recurring_plans').insert(shaped)
      if (insertError) throw new Error(insertError.message)
      setPlanName(''); setPlanAmount(''); setRecurringMessage('Recurring plan saved. Its next occurrence will wait for your confirmation.')
      await refreshPlanning()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this recurring plan.')
    }
  }

  async function completePlan(plan: PlanRow, confirm: boolean) {
    setError(''); setRecurringMessage('')
    const { error: rpcError } = await supabase.rpc('complete_recurring_plan', {
      p_plan_id: plan.id, p_occurrence_date: plan.next_run, p_confirm: confirm,
    })
    if (rpcError) { setError(rpcError.message); return }
    if (confirm) await queryClient.invalidateQueries({ queryKey: ['ledger'] })
    await refreshPlanning()
    setRecurringMessage(confirm ? 'The planned transaction was added to your ledger.' : 'The occurrence was skipped; the next date is now pending.')
  }

  async function togglePlan(plan: PlanRow) {
    const { error: updateError } = await supabase.from('recurring_plans').update({ active: !plan.active, updated_at: new Date().toISOString() }).eq('id', plan.id)
    if (updateError) setError(updateError.message); else await refreshPlanning()
  }

  async function removePlan(plan: PlanRow) {
    if (!window.confirm(`Delete the recurring plan “${plan.name}”?`)) return
    const { error: deleteError } = await supabase.from('recurring_plans').delete().eq('id', plan.id)
    if (deleteError) setError(deleteError.message); else await refreshPlanning()
  }

  async function saveTemplate(event: React.FormEvent) {
    event.preventDefault(); setTemplateMessage(''); setError('')
    const invalidAllocation = Object.values(allocationInputs).some((text) => text.trim() !== '' && (parseDollars(text) === null || parseDollars(text) === 0))
    if (invalidAllocation) { setError('Enter each bucket allocation as a positive dollar amount, or leave it blank.'); return }
    const allocations = Object.entries(allocationInputs).flatMap(([bucketId, text]) => {
      const cents = parseDollars(text)
      return cents && cents > 0 ? [{ bucketId, cents }] : []
    })
    const parsed = paycheckTemplateInputSchema.safeParse({ name: templateName, accountId: templateAccount || null, allocations })
    if (!parsed.success) { setError(firstIssueMessage(parsed.error, 'Enter a valid paycheck template.')); return }
    if (!activeAccounts.some((account) => account.id === parsed.data.accountId)) { setError('Choose an active deposit account.'); return }
    if (parsed.data.allocations.some((item) => !activeBuckets.some((bucket) => bucket.id === item.bucketId))) {
      setError('Remove allocations for buckets that are no longer active.')
      return
    }
    try {
      const { error: insertError } = await supabase.from('paycheck_templates').insert({
        name: parsed.data.name, account_id: parsed.data.accountId, allocations: parsed.data.allocations,
      })
      if (insertError) throw new Error(insertError.message)
      setTemplateName(''); setAllocationInputs({}); setTemplateMessage('Paycheck template saved.')
      await refreshPlanning()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this paycheck template.')
    }
  }

  async function deleteTemplate(template: TemplateRow) {
    if (!window.confirm(`Delete the paycheck template “${template.name}”?`)) return
    const { error: deleteError } = await supabase.from('paycheck_templates').delete().eq('id', template.id)
    if (deleteError) setError(deleteError.message); else await refreshPlanning()
  }

  async function postPaycheck(event: React.FormEvent) {
    event.preventDefault(); setApplyError('')
    if (!applyTemplate) return
    const cents = parseDollars(applyAmount)
    if (cents === null || cents <= 0) { setApplyError('Enter a positive paycheck amount.'); return }
    const dateResult = dateSchema.safeParse(applyDate)
    if (!dateResult.success) { setApplyError(firstIssueMessage(dateResult.error)); return }
    if (!activeAccounts.some((account) => account.id === applyTemplate.account_id)) { setApplyError('The template deposit account is no longer active.'); return }
    if (applyTemplate.allocations.some((item) => !activeBuckets.some((bucket) => bucket.id === item.bucketId))) { setApplyError('The template includes a bucket that is no longer active.'); return }
    const allocated = applyTemplate.allocations.reduce((sum, item) => sum + item.cents, 0)
    if (allocated > cents) { setApplyError(`The template allocates ${formatCents(allocated)}, more than this paycheck.`); return }
    const income = { ...makeEvent({ type: 'income', date: applyDate, amountCents: cents, accountId: applyTemplate.account_id, description: applyTemplate.name }), id: 'paycheck-preview' }
    const allowed = maxAllocatable([...ledger.events, income], applyDate.slice(0, 7))
    if (allocated > allowed) { setApplyError(`Only ${formatCents(allowed)} can be assigned without making later available money negative.`); return }
    const entries = [
      makeEvent({ type: 'income', date: applyDate, amountCents: cents, accountId: applyTemplate.account_id, description: applyTemplate.name }),
      ...applyTemplate.allocations.map((item) => makeEvent({
        type: 'allocation', date: applyDate, month: `${applyDate.slice(0, 7)}-01`, amountCents: item.cents,
        bucketId: item.bucketId, description: `Paycheck · ${applyTemplate.name}`,
      })),
    ]
    setApplyBusy(true)
    const ok = await ledger.addEvents(entries)
    setApplyBusy(false)
    if (ok) { setApplyTemplate(null); setApplyAmount(''); setTemplateMessage(`Added ${applyTemplate.name} and assigned ${formatCents(allocated)}.`) }
  }

  async function reconcile(event: React.FormEvent) {
    event.preventDefault(); setError(''); setReconciliationMessage('')
    if (parsedStatement === null) { setError('Enter a valid statement balance.'); return }
    const parsed = reconciliationInputSchema.safeParse({
      accountId: reconcileAccount || null,
      date: reconcileDate,
      statementBalanceCents: parsedStatement,
      appBalanceCents: selectedAccountBalance,
    })
    if (!parsed.success) { setError(firstIssueMessage(parsed.error, 'Enter a valid reconciliation.')); return }
    if (!activeAccounts.some((account) => account.id === parsed.data.accountId)) { setError('Choose an active account.'); return }
    try {
      const { error: rpcError } = await supabase.rpc('record_reconciliation', {
        p_account_id: parsed.data.accountId,
        p_date: parsed.data.date,
        p_statement_balance_cents: parsed.data.statementBalanceCents,
        p_app_balance_cents: parsed.data.appBalanceCents,
        p_post_adjustment: postAdjustment,
      })
      if (rpcError) throw new Error(rpcError.message)
      if (postAdjustment && difference !== 0) await queryClient.invalidateQueries({ queryKey: ['ledger'] })
      await refreshPlanning()
      setReconciliationMessage(postAdjustment && difference !== 0 ? `Reconciliation saved and ${formatCents(Math.abs(difference ?? 0))} adjustment added.` : 'Reconciliation saved. No ledger adjustment was added.')
      setStatementBalance('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this reconciliation.')
    }
  }

  const accountName = (id: string | null) => ledger.accounts.find((account) => account.id === id)?.name ?? 'Deleted account'
  const bucketName = (id: string) => ledger.buckets.find((bucket) => bucket.id === id)?.name ?? 'Deleted bucket'
  const pending = planning?.plans.filter((plan) => plan.active && plan.next_run <= today) ?? []

  return (
    <div className="space-y-5 md:space-y-6">
      {error && <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {planningQuery.error && <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">Could not load planning data: {(planningQuery.error as Error).message}</p>}
      {planningQuery.isLoading && <p className="text-sm text-muted-foreground" role="status">Loading your plans, templates, and reconciliation history…</p>}

      <TileBoard page="settings" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Tile id="appearance" label="Appearance" className="col-span-full">
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><Palette className="size-4" /></span>
          <div><h2 className="font-semibold">Appearance</h2><p className="mt-1 text-sm text-muted-foreground">Choose a theme for this browser. Your preference is saved on this device.</p></div>
        </div>
        <div className="w-full sm:max-w-56">
          <FormField label="Color theme">
            <Select value={theme} onChange={(event) => onThemeChange(event.target.value === 'light' ? 'light' : 'dark')} options={[
              { value: 'dark', label: 'Dark - library palette' },
              { value: 'light', label: 'Light - accessible contrast' },
            ]} />
          </FormField>
        </div>
      </Card>
      </Tile>

      <Tile id="backups" label="Data and backups" className="col-span-full">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><ArchiveRestore className="size-5" /></span>
            <div><h2 className="font-semibold">Your data and backups</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Export every account, bucket, transaction, recurring plan, paycheck template, and reconciliation into one portable JSON file.</p>
              <p className={`mt-2 text-xs ${exportIsOld ? 'font-semibold text-warning' : 'text-muted-foreground'}`}>
                {lastExportDate ? `Last exported on this device ${lastExportDate.toLocaleDateString()}.` : 'No backup has been exported on this device yet.'}
                {exportIsOld && ' Export a backup now; the reminder appears every 30 days.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" disabled={backupBusy} onClick={exportAll}><Download className="size-4" /> {backupBusy ? 'Working…' : 'Export JSON'}</Button>
            <label className="btn cursor-pointer">
              <FileUp className="size-4" /> Import JSON
              <input type="file" accept="application/json,.json" className="sr-only" disabled={backupBusy} onChange={(event) => { void importFile(event.target.files?.[0]); event.currentTarget.value = '' }} />
            </label>
          </div>
        </div>
        {backupMessage && <p role="status" className="mt-4 text-sm text-good">{backupMessage}</p>}
      </Card>
      </Tile>

      <Tile id="recurring-plans" label="Recurring plans">
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex items-start gap-3"><span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><CalendarClock className="size-4" /></span><div><h2 className="font-semibold">Recurring plans</h2><p className="mt-1 text-sm text-muted-foreground">Expected bills and income stay pending until you confirm them.</p></div></div>
          <form onSubmit={saveRecurring} className="space-y-3 border-b border-border/70 pb-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Plan name"><Input required placeholder="Rent, paycheck, subscription" value={planName} onChange={(event) => setPlanName(event.target.value)} /></FormField>
              <FormField label="Transaction type"><Select value={planType} onChange={(event) => { const result = planTypeSchema.safeParse(event.target.value); if (result.success) setPlanType(result.data) }} options={[{ value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }, { value: 'account_transfer', label: 'Account transfer' }, { value: 'bucket_move', label: 'Bucket move' }]} /></FormField>
              <FormField label="Amount"><Input inputMode="decimal" placeholder="0.00" value={planAmount} onChange={(event) => setPlanAmount(event.target.value)} /></FormField>
              <FormField label="Frequency"><Select value={frequency} onChange={(event) => { const result = frequencySchema.safeParse(event.target.value); if (result.success) setFrequency(result.data) }} options={[{ value: 'weekly', label: 'Weekly' }, { value: 'biweekly', label: 'Every two weeks' }, { value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} /></FormField>
              <FormField label="First occurrence"><Input type="date" value={planStart} onChange={(event) => setPlanStart(event.target.value)} /></FormField>
              <FormField label="End date (optional)"><Input type="date" value={planEnd} onChange={(event) => setPlanEnd(event.target.value)} /></FormField>
              {(planType === 'income' || planType === 'expense' || planType === 'account_transfer') && <FormField label={planType === 'income' ? 'Deposit to' : 'From account'}><Select value={planAccount} onChange={(event) => setPlanAccount(event.target.value)} options={activeAccounts.map((account) => ({ value: account.id, label: account.name }))} placeholder="Choose account" /></FormField>}
              {planType === 'account_transfer' && <FormField label="To account"><Select value={planToAccount} onChange={(event) => setPlanToAccount(event.target.value)} options={activeAccounts.map((account) => ({ value: account.id, label: account.name }))} placeholder="Choose account" /></FormField>}
              {(planType === 'expense' || planType === 'bucket_move') && <FormField label={planType === 'expense' ? 'Expense bucket' : 'From bucket'}><Select value={planBucket} onChange={(event) => setPlanBucket(event.target.value)} options={activeBuckets.map((bucket) => ({ value: bucket.id, label: bucket.name }))} placeholder="Choose bucket" /></FormField>}
              {planType === 'bucket_move' && <FormField label="To bucket"><Select value={planToBucket} onChange={(event) => setPlanToBucket(event.target.value)} options={activeBuckets.map((bucket) => ({ value: bucket.id, label: bucket.name }))} placeholder="Choose bucket" /></FormField>}
            </div>
            <Button variant="primary"><Plus className="size-4" /> Save recurring plan</Button>
          </form>
          {recurringMessage && <p role="status" className="mt-3 text-sm text-good">{recurringMessage}</p>}
          <div className="mt-4 space-y-2">
            {pending.length > 0 && <h3 className="text-xs font-semibold uppercase tracking-wide text-primary">Needs confirmation</h3>}
            {planning?.plans.map((plan) => {
              const isPending = plan.active && plan.next_run <= today
              return <div key={plan.id} className="rounded-xl border border-border/70 p-3">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <div className="min-w-0 flex-[1_1_15rem]"><div className="flex min-w-0 flex-wrap items-center gap-2"><strong className="min-w-0 truncate text-sm">{plan.name}</strong>{isPending && <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Pending</span>}{!plan.active && <span className="shrink-0 rounded-full bg-sunken px-2 py-0.5 text-[10px] font-medium text-muted">Paused</span>}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{formatCents(plan.amount_cents)} · {plan.frequency} · next {plan.next_run}</p></div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    {isPending && <><Button size="sm" variant="primary" onClick={() => void completePlan(plan, true)}><Check className="size-3.5" /> Confirm</Button><Button size="sm" onClick={() => void completePlan(plan, false)}>Skip</Button></>}
                    {!isPending && <Button size="sm" onClick={() => void togglePlan(plan)}>{plan.active ? 'Pause' : 'Resume'}</Button>}
                    <Button size="sm" variant="danger" onClick={() => void removePlan(plan)}>Delete</Button>
                  </div>
                </div>
              </div>
            })}
            {planning && planning.plans.length === 0 && <p className="py-3 text-sm text-muted-foreground">No recurring plans yet.</p>}
          </div>
        </Card>

      </Tile>
      <Tile id="paycheck-templates" label="Paycheck templates">
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex items-start gap-3"><span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><CircleDollarSign className="size-4" /></span><div><h2 className="font-semibold">Paycheck templates</h2><p className="mt-1 text-sm text-muted-foreground">Add one income entry and assign it to buckets with a single action.</p></div></div>
          <form onSubmit={saveTemplate} className="space-y-3 border-b border-border/70 pb-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Template name"><Input required placeholder="Regular paycheck" value={templateName} onChange={(event) => setTemplateName(event.target.value)} /></FormField>
              <FormField label="Deposit account"><Select value={templateAccount} onChange={(event) => setTemplateAccount(event.target.value)} options={activeAccounts.map((account) => ({ value: account.id, label: account.name }))} placeholder="Choose account" /></FormField>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Amount to assign to each bucket</p>
              {activeBuckets.length === 0 && <p className="text-sm text-muted-foreground">Create a bucket before saving a paycheck template.</p>}
              {activeBuckets.map((bucket) => <div key={bucket.id} className="grid grid-cols-[1fr_8rem] items-center gap-3"><label className="truncate text-sm" htmlFor={`template-${bucket.id}`}>{bucket.name}</label><Input id={`template-${bucket.id}`} inputMode="decimal" placeholder="0.00" value={allocationInputs[bucket.id] ?? ''} onChange={(event) => setAllocationInputs((current) => ({ ...current, [bucket.id]: event.target.value }))} /></div>)}
            </div>
            <Button variant="primary"><Plus className="size-4" /> Save template</Button>
          </form>
          {templateMessage && <p role="status" className="mt-3 text-sm text-good">{templateMessage}</p>}
          <div className="mt-4 space-y-2">
            {planning?.templates.map((template) => {
              const total = template.allocations.reduce((sum, item) => sum + item.cents, 0)
              return <div key={template.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 p-3">
                <div className="min-w-0"><strong className="block truncate text-sm">{template.name}</strong><p className="mt-1 truncate text-xs text-muted-foreground">{accountName(template.account_id)} · {template.allocations.map((item) => bucketName(item.bucketId)).join(', ')} · {formatCents(total)} planned</p></div>
                <div className="flex gap-1.5"><Button size="sm" variant="primary" disabled={!template.account_id} onClick={() => { setApplyTemplate(template); setApplyAmount(''); setApplyDate(today); setApplyError('') }}>Apply</Button><Button size="sm" variant="danger" onClick={() => void deleteTemplate(template)}>Delete</Button></div>
              </div>
            })}
            {planning && planning.templates.length === 0 && <p className="py-3 text-sm text-muted-foreground">No paycheck templates yet.</p>}
          </div>
        </Card>
      </Tile>

      <Tile id="account-reconciliation" label="Reconcile an account">
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex items-start gap-3"><span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><WalletCards className="size-4" /></span><div><h2 className="font-semibold">Reconcile an account</h2><p className="mt-1 text-sm text-muted-foreground">Compare the statement to your ledger. An adjustment preserves all history.</p></div></div>
          <form onSubmit={reconcile} className="space-y-3">
            <FormField label="Account"><Select value={reconcileAccount} onChange={(event) => setReconcileAccount(event.target.value)} options={activeAccounts.map((account) => ({ value: account.id, label: account.name }))} placeholder="Choose account" /></FormField>
            <FormField label="Statement date"><Input type="date" value={reconcileDate} onChange={(event) => setReconcileDate(event.target.value)} /></FormField>
            <FormField label="Statement balance"><Input inputMode="decimal" placeholder="0.00 (negative for card debt)" value={statementBalance} onChange={(event) => setStatementBalance(event.target.value)} /></FormField>
            <div className="rounded-xl bg-muted/20 p-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">App balance on {reconcileDate}</span><strong>{formatCents(selectedAccountBalance)}</strong></div><div className="mt-2 flex justify-between border-t border-border/60 pt-2"><span className="text-muted-foreground">Difference</span><strong className={difference && difference < 0 ? 'text-destructive' : 'text-primary'}>{difference === null ? '—' : formatCents(difference)}</strong></div></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-primary" checked={postAdjustment} onChange={(event) => setPostAdjustment(event.target.checked)} /> Add an adjustment event for the difference</label>
            <Button variant="primary" disabled={!reconcileAccount || parsedStatement === null}><Check className="size-4" /> Save reconciliation</Button>
          </form>
          {reconciliationMessage && <p role="status" className="mt-3 text-sm text-good">{reconciliationMessage}</p>}
        </Card>
      </Tile>

      <Tile id="reconciliation-history" label="Reconciliation history">
        <Card className="p-5 sm:p-6">
          <div className="mb-4"><h2 className="font-semibold">Reconciliation history</h2><p className="mt-1 text-sm text-muted-foreground">Your last 100 statement checks.</p></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm"><thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="py-2 pr-3 font-medium">Date</th><th className="py-2 pr-3 font-medium">Account</th><th className="py-2 pr-3 text-right font-medium">Statement</th><th className="py-2 pr-3 text-right font-medium">App</th><th className="py-2 text-right font-medium">Difference</th></tr></thead>
              <tbody>{planning?.reconciliations.map((row) => <tr key={row.id} className="border-b border-border/50"><td className="py-3 pr-3">{row.date}</td><td className="py-3 pr-3">{accountName(row.account_id)}</td><td className="py-3 pr-3 text-right tabular-nums">{formatCents(row.statement_balance_cents)}</td><td className="py-3 pr-3 text-right tabular-nums">{formatCents(row.app_balance_cents)}</td><td className="py-3 text-right tabular-nums">{formatCents(row.statement_balance_cents - row.app_balance_cents)}</td></tr>)}</tbody>
            </table>
          </div>
          {planning && planning.reconciliations.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No reconciliations recorded yet.</p>}
        </Card>
      </Tile>

      <Tile id="security-note" label="Security note" className="col-span-full">
      <Card className="p-4 text-xs leading-5 text-muted-foreground">
        <strong className="text-foreground">Security note.</strong> The app uses the public Supabase anon key in the browser. RLS must stay enabled on every user table, and public sign-ups should be disabled after creating your account. Never add a service role key to the app or deployment environment.
      </Card>
      </Tile>
      </TileBoard>

      {applyTemplate && <Modal title={`Apply ${applyTemplate.name}`} onClose={() => setApplyTemplate(null)}>
        <form onSubmit={postPaycheck} className="space-y-4">
          <p className="text-sm text-muted-foreground">Records income in {accountName(applyTemplate.account_id)} and assigns the saved bucket amounts on the date below.</p>
          <FormField label="Paycheck amount"><Input autoFocus inputMode="decimal" placeholder="0.00" value={applyAmount} onChange={(event) => setApplyAmount(event.target.value)} /></FormField>
          <FormField label="Pay date"><Input type="date" value={applyDate} onChange={(event) => setApplyDate(event.target.value)} /></FormField>
          <ul className="rounded-xl border border-border/70 px-3 text-sm divide-y divide-border/60">
            {applyTemplate.allocations.map((item) => <li key={item.bucketId} className="flex justify-between gap-3 py-2"><span>{bucketName(item.bucketId)}</span><span className="tabular-nums">{formatCents(item.cents)}</span></li>)}
            <li className="flex justify-between gap-3 py-2 font-semibold"><span>Total assignment</span><span className="tabular-nums">{formatCents(applyTemplate.allocations.reduce((sum, item) => sum + item.cents, 0))}</span></li>
          </ul>
          {applyError && <p role="alert" className="text-sm text-destructive">{applyError}</p>}
          <div className="flex gap-2"><Button type="submit" variant="primary" disabled={applyBusy}>{applyBusy ? 'Saving…' : 'Add paycheck and assign'}</Button><Button type="button" onClick={() => setApplyTemplate(null)}>Cancel</Button></div>
        </form>
      </Modal>}
    </div>
  )
}
