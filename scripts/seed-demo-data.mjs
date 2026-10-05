import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const userId = process.env.SUPABASE_DEMO_USER_ID
const confirmation = process.env.SUPABASE_DEMO_CONFIRM
const anchorText = process.env.DEMO_ANCHOR_DATE ?? new Date().toISOString().slice(0, 10)

if (!url || !serviceRoleKey || !userId) {
  throw new Error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_DEMO_USER_ID in .env.demo.')
}
if (confirmation !== 'seed-demo') {
  throw new Error('Set SUPABASE_DEMO_CONFIRM=seed-demo to confirm the target is a demo account.')
}
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
  throw new Error('SUPABASE_DEMO_USER_ID must be the UUID of an existing Auth user.')
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(anchorText) || Number.isNaN(Date.parse(`${anchorText}T00:00:00Z`))) {
  throw new Error('DEMO_ANCHOR_DATE must use YYYY-MM-DD.')
}

const anchor = new Date(`${anchorText}T00:00:00Z`)
const currentMonth = monthKey(anchor)
const currentDay = anchor.getUTCDate()
const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
if (authError) throw new Error(`Could not verify the demo Auth user: ${authError.message}`)
if (!authUser.user) throw new Error('No Auth user exists for SUPABASE_DEMO_USER_ID.')

function idFor(key) {
  const bytes = createHash('sha256').update(`${userId}:${key}`).digest().subarray(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function monthAt(offset) {
  return monthKey(new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + offset, 1)))
}

function dateInMonth(month, requestedDay) {
  const [year, monthNumber] = month.split('-').map(Number)
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  const latestAllowed = month === currentMonth ? currentDay : days
  const day = Math.min(requestedDay, days, latestAllowed)
  return `${month}-${String(day).padStart(2, '0')}`
}

const accounts = [
  { id: idFor('account:checking'), user_id: userId, name: 'Everyday Checking', type: 'checking', sort_order: 0, archived: false },
  { id: idFor('account:savings'), user_id: userId, name: 'High Yield Savings', type: 'savings', sort_order: 1, archived: false },
  { id: idFor('account:cash'), user_id: userId, name: 'Wallet Cash', type: 'cash', sort_order: 2, archived: false },
]
const accountId = Object.fromEntries(accounts.map((row) => [row.type, row.id]))

const groups = [
  { id: idFor('group:home'), user_id: userId, name: 'Home', sort_order: 0, color: '#00bdf9' },
  { id: idFor('group:essentials'), user_id: userId, name: 'Essentials', sort_order: 1, color: '#03d791' },
  { id: idFor('group:lifestyle'), user_id: userId, name: 'Lifestyle', sort_order: 2, color: '#e6ff4b' },
  { id: idFor('group:goals'), user_id: userId, name: 'Goals', sort_order: 3, color: '#a855f7' },
]
const groupId = Object.fromEntries(groups.map((row) => [row.name.toLowerCase(), row.id]))

const bucketSpecs = [
  { key: 'rent', name: 'Rent', group: 'home', kind: 'recurring', target: 160_000, monthly: 160_000, color: '#00bdf9' },
  { key: 'groceries', name: 'Groceries', group: 'essentials', kind: 'plain', target: null, monthly: 65_000, color: '#03d791' },
  { key: 'utilities', name: 'Utilities', group: 'home', kind: 'recurring', target: null, monthly: 24_000, color: '#38bdf8' },
  { key: 'transport', name: 'Transportation', group: 'essentials', kind: 'plain', target: null, monthly: 18_000, color: '#f59e0b' },
  { key: 'dining', name: 'Dining out', group: 'lifestyle', kind: 'plain', target: null, monthly: 25_000, color: '#e6ff4b' },
  { key: 'personal', name: 'Personal spending', group: 'lifestyle', kind: 'plain', target: null, monthly: 15_000, color: '#f43f5e' },
  { key: 'emergency', name: 'Emergency fund', group: 'goals', kind: 'save_by_date', target: 500_000, monthly: 45_000, targetDate: '2028-12-31', color: '#a855f7' },
  { key: 'travel', name: 'Japan trip', group: 'goals', kind: 'save_by_date', target: 240_000, monthly: 25_000, targetDate: '2027-10-01', color: '#14b8a6' },
]
const buckets = bucketSpecs.map((spec, sort_order) => ({
  id: idFor(`bucket:${spec.key}`),
  user_id: userId,
  group_id: groupId[spec.group],
  name: spec.name,
  kind: spec.kind,
  sort_order,
  archived: false,
  monthly_target_cents: spec.monthly,
  target_cents: spec.target,
  target_date: spec.targetDate ?? null,
  color: spec.color,
}))
const bucketId = Object.fromEntries(bucketSpecs.map((spec) => [spec.key, idFor(`bucket:${spec.key}`)]))

const events = []
function addEvent(month, key, data, day) {
  events.push({
    id: idFor(`event:${month}:${key}`),
    user_id: userId,
    date: dateInMonth(month, day),
    month: data.type === 'allocation' ? `${month}-01` : null,
    amount_cents: data.amount,
    type: data.type,
    account_id: data.account ?? null,
    to_account_id: data.toAccount ?? null,
    bucket_id: data.bucket ?? null,
    to_bucket_id: data.toBucket ?? null,
    direction: data.direction ?? null,
    description: data.description,
    payee: data.payee ?? null,
    notes: 'Sample data created by the Buckets demo seeder.',
    custom_type: data.customType ?? null,
  })
}

for (let offset = -5; offset <= 0; offset += 1) {
  const month = monthAt(offset)
  addEvent(month, 'paycheck', {
    type: 'income', amount: 460_000, account: accountId.checking,
    description: 'Monthly paycheck', payee: 'Northstar Studio', customType: 'Salary',
  }, 1)
  addEvent(month, 'freelance', {
    type: 'income', amount: 85_000, account: accountId.checking,
    description: 'Design project payment', payee: 'Juniper Creative', customType: 'Freelance',
  }, 15)

  for (const spec of bucketSpecs) {
    addEvent(month, `assign:${spec.key}`, {
      type: 'allocation', amount: spec.monthly, bucket: bucketId[spec.key],
      direction: 'in', description: `Monthly assignment · ${spec.name}`,
    }, 1)
  }

  const expense = (key, bucket, amount, description, payee, day, customType) => addEvent(month, key, {
    type: 'expense', amount, account: accountId.checking, bucket: bucketId[bucket], description, payee, customType,
  }, day)
  expense('rent', 'rent', 160_000, 'Monthly rent', 'Willow Creek Apartments', 3, 'Housing')
  expense('groceries-1', 'groceries', 20_000, 'Weekly groceries', 'Market Street Grocery', 5, 'Groceries')
  expense('groceries-2', 'groceries', 18_500, 'Produce and pantry', 'Green Basket Market', 12, 'Groceries')
  expense('groceries-3', 'groceries', 16_500, 'Weekly groceries', 'Market Street Grocery', 22, 'Groceries')
  expense('utilities', 'utilities', 22_000, 'Electricity and internet', 'City Utilities', 8, 'Utilities')
  expense('fuel-1', 'transport', 8_000, 'Fuel', 'Oak Street Fuel', 10, 'Fuel')
  expense('fuel-2', 'transport', 7_400, 'Transit pass', 'Metro Transit', 18, 'Transit')
  expense('dining-1', 'dining', 12_000, 'Dinner with friends', 'Olive & Stone', 14, 'Dining out')
  expense('dining-2', 'dining', 8_000, 'Coffee and lunch', 'Harbor Coffee', 24, 'Dining out')
  expense('personal', 'personal', 12_000, 'Household supplies', 'Juniper Home', 20, 'Household')

  addEvent(month, 'savings-transfer', {
    type: 'account_transfer', amount: 35_000, account: accountId.checking, toAccount: accountId.savings,
    description: 'Monthly savings transfer', payee: 'High Yield Savings', customType: 'Savings',
  }, 26)
}

const paycheckTemplates = [{
  id: idFor('paycheck-template:monthly'),
  user_id: userId,
  name: 'Monthly essentials and goals',
  account_id: accountId.checking,
  allocations: [
    { bucketId: bucketId.rent, cents: 160_000 },
    { bucketId: bucketId.groceries, cents: 65_000 },
    { bucketId: bucketId.utilities, cents: 24_000 },
    { bucketId: bucketId.emergency, cents: 45_000 },
    { bucketId: bucketId.travel, cents: 25_000 },
  ],
}]

const nextMonth = monthAt(1)
const recurringPlans = [
  {
    id: idFor('recurring:rent'), user_id: userId, name: 'Rent', event_type: 'expense', amount_cents: 160_000,
    account_id: accountId.checking, to_account_id: null, bucket_id: bucketId.rent, to_bucket_id: null,
    description: 'Monthly rent', payee: 'Willow Creek Apartments', notes: 'Demo recurring expense',
    frequency: 'monthly', start_date: `${monthAt(-5)}-01`, end_date: null, next_run: `${nextMonth}-03`, active: true,
  },
  {
    id: idFor('recurring:utilities'), user_id: userId, name: 'Electricity and internet', event_type: 'expense', amount_cents: 22_000,
    account_id: accountId.checking, to_account_id: null, bucket_id: bucketId.utilities, to_bucket_id: null,
    description: 'Electricity and internet', payee: 'City Utilities', notes: 'Demo recurring expense',
    frequency: 'monthly', start_date: `${monthAt(-5)}-01`, end_date: null, next_run: `${nextMonth}-08`, active: true,
  },
]

const appCheckingBalance = events.reduce((balance, event) => {
  if (event.type === 'income' && event.account_id === accountId.checking) return balance + event.amount_cents
  if (event.type === 'expense' && event.account_id === accountId.checking) return balance - event.amount_cents
  if (event.type === 'account_transfer' && event.account_id === accountId.checking) return balance - event.amount_cents
  if (event.type === 'account_transfer' && event.to_account_id === accountId.checking) return balance + event.amount_cents
  if (event.type === 'adjustment' && event.account_id === accountId.checking) return balance + (event.direction === 'out' ? -event.amount_cents : event.amount_cents)
  return balance
}, 0)
const reconciliations = [{
  id: idFor('reconciliation:checking'), user_id: userId, account_id: accountId.checking,
  date: anchorText, statement_balance_cents: appCheckingBalance, app_balance_cents: appCheckingBalance,
  adjustment_event_id: null,
}]

async function upsertRows(table, rows) {
  const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' })
  if (error) throw new Error(`Could not seed ${table}: ${error.message}`)
}

await upsertRows('accounts', accounts)
await upsertRows('bucket_groups', groups)
await upsertRows('buckets', buckets)
await upsertRows('ledger_events', events)
await upsertRows('recurring_plans', recurringPlans)
await upsertRows('paycheck_templates', paycheckTemplates)
await upsertRows('reconciliations', reconciliations)

console.log(`Seeded ${accounts.length} accounts, ${groups.length} groups, ${buckets.length} buckets, ${events.length} ledger entries, ${recurringPlans.length} recurring plans, one paycheck template, and one reconciliation.`)
console.log('The seed is repeatable: it updates its own records and leaves unrelated user data untouched.')
