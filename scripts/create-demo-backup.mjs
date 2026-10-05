import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const output = resolve(root, 'examples/demo-finance-backup.json')

function idFor(key) {
  const bytes = createHash('sha256').update(`buckets-synthetic-demo:${key}`).digest().subarray(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const accounts = [
  { id: idFor('account:checking'), name: 'Everyday Checking', type: 'checking', sortOrder: 0, archived: false },
  { id: idFor('account:savings'), name: 'High Yield Savings', type: 'savings', sortOrder: 1, archived: false },
  { id: idFor('account:card'), name: 'Travel Rewards Card', type: 'credit_card', sortOrder: 2, archived: false },
  { id: idFor('account:cash'), name: 'Wallet Cash', type: 'cash', sortOrder: 3, archived: false },
  { id: idFor('account:archived'), name: 'Old Checking (archived)', type: 'checking', sortOrder: 4, archived: true },
]
const accountId = Object.fromEntries(accounts.map((account) => [account.name, account.id]))

const groups = [
  { id: idFor('group:home'), name: 'Home', sortOrder: 0, color: '#4b8bff' },
  { id: idFor('group:everyday'), name: 'Everyday', sortOrder: 1, color: '#00c98d' },
  { id: idFor('group:goals'), name: 'Savings goals', sortOrder: 2, color: '#d8ff36' },
  { id: idFor('group:lifestyle'), name: 'Lifestyle', sortOrder: 3, color: '#a66bff' },
]
const groupId = Object.fromEntries(groups.map((group) => [group.name, group.id]))

function bucket(key, name, group, kind, sortOrder, monthlyTargetCents, targetCents = null, targetDate = null, archived = false) {
  return {
    id: idFor(`bucket:${key}`), groupId: group ? groupId[group] : null, name, kind, sortOrder, archived,
    monthlyTargetCents, targetCents, targetDate, color: null,
  }
}

const buckets = [
  bucket('rent', 'Rent', 'Home', 'recurring', 0, 220_000),
  bucket('utilities', 'Utilities', 'Home', 'recurring', 1, 30_000),
  bucket('annual-insurance', 'Annual insurance', 'Home', 'save_by_date', 2, 5_000, 72_000, '2027-02-01'),
  bucket('groceries', 'Groceries', 'Everyday', 'plain', 0, 65_000),
  bucket('dining', 'Dining out', 'Everyday', 'plain', 1, 20_000),
  bucket('transport', 'Transportation', 'Everyday', 'plain', 2, 30_000),
  bucket('health', 'Health', 'Everyday', 'plain', 3, 15_000),
  bucket('subscriptions', 'Subscriptions', 'Everyday', 'recurring', 4, 10_000),
  bucket('pets', 'Pet care', 'Everyday', 'plain', 5, 10_000),
  bucket('emergency', 'Emergency fund', 'Savings goals', 'save_by_deposit', 0, 30_000, 1_000_000),
  bucket('vacation', 'Summer vacation', 'Savings goals', 'save_by_date', 1, 20_000, 500_000, '2027-06-30'),
  bucket('car-repairs', 'Car repairs', 'Savings goals', 'save_until_date', 2, 15_000, null, '2027-04-30'),
  bucket('gifts', 'Gifts & giving', 'Lifestyle', 'plain', 0, 7_500),
  bucket('flexible', 'Flexible spending', null, 'plain', 0, 0),
  bucket('old-laptop', 'Old laptop goal (archived)', 'Savings goals', 'save_by_deposit', 3, 0, 150_000, null, true),
]
const bucketId = Object.fromEntries(buckets.map((item) => [item.name, item.id]))

const events = []
function addEvent(key, type, date, amountCents, description, fields = {}) {
  const event = {
    id: idFor(`event:${key}`), type, date, month: null, amountCents,
    accountId: null, toAccountId: null, bucketId: null, toBucketId: null, direction: null,
    customType: null, description, payee: null, notes: null, ...fields,
  }
  events.push(event)
  return event
}

// Starting account balances use the same adjustment entries the app uses for account setup.
for (const [name, amountCents, direction] of [
  ['Everyday Checking', 420_000, 'in'],
  ['High Yield Savings', 850_000, 'in'],
  ['Travel Rewards Card', 125_000, 'out'],
  ['Wallet Cash', 9_000, 'in'],
]) {
  addEvent(`opening:${name}`, 'adjustment', '2025-12-31', amountCents, 'Starting balance', {
    accountId: accountId[name], direction, payee: name, customType: 'Starting balance',
    notes: 'Synthetic demo opening balance',
  })
}

// The $11,540 net opening balance is assigned to envelopes, so opening Rain is zero.
const openingAssignments = {
  Rent: 220_000,
  Utilities: 40_000,
  Groceries: 80_000,
  'Dining out': 30_000,
  Transportation: 35_000,
  Health: 30_000,
  Subscriptions: 15_000,
  'Emergency fund': 340_000,
  'Summer vacation': 150_000,
  'Car repairs': 80_000,
  'Gifts & giving': 30_000,
  'Pet care': 44_000,
  'Annual insurance': 60_000,
}
for (const [name, amountCents] of Object.entries(openingAssignments)) {
  addEvent(`opening-assignment:${name}`, 'allocation', '2025-12-31', amountCents, 'Opening budget assignment', {
    bucketId: bucketId[name], month: '2025-12-01', customType: 'Budget assignment',
    notes: 'Assigned from synthetic opening account balances',
  })
}

const monthlyAssignments = {
  Rent: 220_000,
  Utilities: 30_000,
  'Annual insurance': 5_000,
  Groceries: 65_000,
  'Dining out': 20_000,
  Transportation: 30_000,
  Health: 15_000,
  Subscriptions: 10_000,
  'Pet care': 10_000,
  'Emergency fund': 30_000,
  'Summer vacation': 20_000,
  'Car repairs': 15_000,
  'Gifts & giving': 7_500,
}

for (let month = 1; month <= 9; month += 1) {
  const mm = `2026-${String(month).padStart(2, '0')}`
  addEvent(`salary:${month}`, 'income', `${mm}-01`, 520_000, 'Monthly salary', {
    accountId: accountId['Everyday Checking'], payee: 'Northstar Design Co.', customType: 'Paycheck',
    notes: 'Monthly take-home pay',
  })
  if ([1, 3, 5, 7, 9].includes(month)) {
    addEvent(`freelance:${month}`, 'income', `${mm}-08`, 45_000, 'Freelance project', {
      accountId: accountId['Everyday Checking'], payee: 'Studio clients', customType: 'Freelance',
      notes: 'Design project payment',
    })
  }
  for (const [name, amountCents] of Object.entries(monthlyAssignments)) {
    addEvent(`assignment:${month}:${name}`, 'allocation', `${mm}-01`, amountCents, 'Monthly bucket assignment', {
      bucketId: bucketId[name], month: `${mm}-01`, customType: 'Budget assignment', notes: 'Monthly plan',
    })
  }
  addEvent(`rent:${month}`, 'expense', `${mm}-01`, 220_000, 'Monthly rent', {
    accountId: accountId['Everyday Checking'], bucketId: bucketId.Rent,
    payee: 'Willow Creek Property', customType: 'Housing',
  })
  if (month < 10) {
    addEvent(`utilities:${month}`, 'expense', `${mm}-05`, 19_000 + (month % 4) * 2_500, 'Electric and water', {
      accountId: accountId['Everyday Checking'], bucketId: bucketId.Utilities,
      payee: 'City Utilities', customType: 'Utility',
    })
  }
  const groceryAmounts = [10_500 + (month % 3) * 900, 12_750 + (month % 4) * 700, 15_100 + (month % 5) * 600]
  const groceryTrips = [
    ['03', groceryAmounts[0], 'Weekly grocery run', 'Market Street Foods', 'Travel Rewards Card'],
    ['12', groceryAmounts[1], 'Fresh produce and pantry', 'Green Basket Market', 'Everyday Checking'],
    ['22', groceryAmounts[2], 'Household groceries', 'Market Street Foods', 'Everyday Checking'],
  ]
  for (const [day, amount, description, payee, account] of groceryTrips) {
    addEvent(`groceries:${month}:${day}`, 'expense', `${mm}-${day}`, amount, description, {
      accountId: accountId[account], bucketId: bucketId.Groceries, payee, customType: 'Groceries',
    })
  }
  addEvent(`dining-card:${month}`, 'expense', `${mm}-09`, 3_600 + (month % 3) * 550, 'Dinner with friends', {
    accountId: accountId['Travel Rewards Card'], bucketId: bucketId['Dining out'],
    payee: 'Juniper Kitchen', customType: 'Dining',
  })
  addEvent(`dining-cash:${month}`, 'expense', `${mm}-19`, 4_200 + (month % 4) * 450, 'Coffee and lunch', {
    accountId: accountId['Wallet Cash'], bucketId: bucketId['Dining out'],
    payee: 'Corner Cafe', customType: 'Dining',
  })
  addEvent(`fuel:${month}`, 'expense', `${mm}-06`, 7_800 + (month % 4) * 900, 'Fuel', {
    accountId: accountId['Everyday Checking'], bucketId: bucketId.Transportation,
    payee: 'Pine Street Fuel', customType: 'Transport',
  })
  addEvent(`transit:${month}`, 'expense', `${mm}-20`, 3_900 + (month % 3) * 600, 'Transit pass', {
    accountId: accountId['Everyday Checking'], bucketId: bucketId.Transportation,
    payee: 'Metro Transit', customType: 'Transport',
  })
  addEvent(`subscription:${month}`, 'expense', `${mm}-11`, 4_299, 'Streaming and cloud storage', {
    accountId: accountId['Travel Rewards Card'], bucketId: bucketId.Subscriptions,
    payee: 'Streamline Media', customType: 'Subscription',
  })
  addEvent(`pet:${month}`, 'expense', `${mm}-14`, 4_000 + (month % 4) * 500, 'Pet food and supplies', {
    accountId: accountId['Everyday Checking'], bucketId: bucketId['Pet care'],
    payee: 'Paws & Co.', customType: 'Pet care',
  })
  if ([1, 3, 5, 7, 9].includes(month)) {
    addEvent(`health:${month}`, 'expense', `${mm}-17`, 4_500 + (month % 3) * 1_750, 'Clinic copay', {
      accountId: accountId['Travel Rewards Card'], bucketId: bucketId.Health,
      payee: 'Lakeview Clinic', customType: 'Healthcare',
    })
  }
  if (month === 2) {
    addEvent('annual-insurance-expense', 'expense', `${mm}-15`, 60_000, 'Annual auto insurance premium', {
      accountId: accountId['Everyday Checking'], bucketId: bucketId['Annual insurance'],
      payee: 'Pioneer Mutual', customType: 'Insurance',
    })
    addEvent('allocation-return', 'allocation', `${mm}-16`, 2_500, 'Return unused utility money to Rain', {
      bucketId: bucketId.Utilities, direction: 'out', month: `${mm}-01`,
      notes: 'Example of unassigning funds', customType: 'Budget adjustment',
    })
  }
  if (month === 3) {
    addEvent('car-repair-expense', 'expense', `${mm}-23`, 42_000, 'Brake service', {
      accountId: accountId['Everyday Checking'], bucketId: bucketId['Car repairs'],
      payee: 'Oak Auto Repair', customType: 'Car repair',
    })
  }
  if (month === 4) {
    addEvent('bucket-move-spring', 'bucket_move', `${mm}-18`, 5_000, 'Cover groceries from dining', {
      bucketId: bucketId['Dining out'], toBucketId: bucketId.Groceries,
      notes: 'A planned bucket-to-bucket move', customType: 'Bucket move',
    })
  }
  if (month === 6) {
    addEvent('gift-expense', 'expense', `${mm}-21`, 6_500, 'Birthday gift', {
      accountId: accountId['Everyday Checking'], bucketId: bucketId['Gifts & giving'],
      payee: 'Paper & Pine', customType: 'Gift',
    })
  }
  if (month === 8) {
    addEvent('vacation-expense', 'expense', `${mm}-24`, 35_000, 'Weekend trip lodging', {
      accountId: accountId['Everyday Checking'], bucketId: bucketId['Summer vacation'],
      payee: 'Harbor House Inn', customType: 'Travel',
    })
  }
  addEvent(`card-payment:${month}`, 'account_transfer', `${mm}-26`, 22_000, 'Credit card payment', {
    accountId: accountId['Everyday Checking'], toAccountId: accountId['Travel Rewards Card'],
    payee: 'Online payment', customType: 'Card payment',
  })
  if ([2, 5, 8].includes(month)) {
    addEvent(`savings-transfer:${month}`, 'account_transfer', `${mm}-27`, 35_000, 'Move savings to high-yield account', {
      accountId: accountId['Everyday Checking'], toAccountId: accountId['High Yield Savings'],
      payee: 'Monthly savings', customType: 'Savings transfer',
    })
  }
}

addEvent('salary:october', 'income', '2026-10-01', 260_000, 'First October paycheck', {
  accountId: accountId['Everyday Checking'], payee: 'Northstar Design Co.', customType: 'Paycheck',
})
addEvent('freelance:october', 'income', '2026-10-02', 40_000, 'Website refresh project', {
  accountId: accountId['Everyday Checking'], payee: 'Studio clients', customType: 'Freelance',
})
addEvent('reimbursement:october', 'income', '2026-10-03', 12_500, 'Health plan reimbursement', {
  accountId: accountId['Everyday Checking'], payee: 'Evergreen Health', customType: 'Reimbursement',
})
for (const [name, amountCents] of Object.entries(monthlyAssignments)) {
  addEvent(`assignment:october:${name}`, 'allocation', '2026-10-01', amountCents, 'October bucket assignment', {
    bucketId: bucketId[name], month: '2026-10-01', customType: 'Budget assignment', notes: 'Monthly plan',
  })
}
addEvent('rent:october', 'expense', '2026-10-01', 220_000, 'October rent', {
  accountId: accountId['Everyday Checking'], bucketId: bucketId.Rent,
  payee: 'Willow Creek Property', customType: 'Housing',
})
addEvent('groceries:october', 'expense', '2026-10-02', 13_245, 'Groceries and household items', {
  accountId: accountId['Travel Rewards Card'], bucketId: bucketId.Groceries,
  payee: 'Market Street Foods', customType: 'Groceries',
})
addEvent('pet:october', 'expense', '2026-10-02', 3_150, 'Pet food', {
  accountId: accountId['Everyday Checking'], bucketId: bucketId['Pet care'],
  payee: 'Paws & Co.', customType: 'Pet care',
})
addEvent('fuel:october', 'expense', '2026-10-03', 4_410, 'Gas for the week', {
  accountId: accountId['Everyday Checking'], bucketId: bucketId.Transportation,
  payee: 'Pine Street Fuel', customType: 'Transport',
})
addEvent('health:october', 'expense', '2026-10-03', 2_375, 'Prescription copay', {
  accountId: accountId['Travel Rewards Card'], bucketId: bucketId.Health,
  payee: 'Lakeview Pharmacy', customType: 'Healthcare',
})
addEvent('dining:october', 'expense', '2026-10-04', 1_875, 'Sunday coffee', {
  accountId: accountId['Wallet Cash'], bucketId: bucketId['Dining out'],
  payee: 'Corner Cafe', customType: 'Dining',
})
addEvent('overspend-demo', 'expense', '2026-10-04', 4_250, 'Unexpected home supplies', {
  accountId: accountId['Everyday Checking'], bucketId: bucketId['Flexible spending'],
  payee: 'Neighborhood Hardware', customType: 'Home supplies',
  notes: 'Intentional demo overspend so the budget attention state is visible.',
})
addEvent('cash-adjustment', 'adjustment', '2026-05-12', 1_000, 'Cash count correction', {
  accountId: accountId['Wallet Cash'], direction: 'in', payee: 'Wallet count',
  notes: 'Small reconciliation correction example', customType: 'Balance adjustment',
})

// The posted adjustment is linked to a reconciliation that records the before and after amounts.
const checkingId = accountId['Everyday Checking']
const checkingBalanceBeforeReconciliation = events.reduce((balance, event) => {
  if (event.date > '2026-09-30') return balance
  if (event.type === 'income' && event.accountId === checkingId) return balance + event.amountCents
  if (event.type === 'expense' && event.accountId === checkingId) return balance - event.amountCents
  if (event.type === 'account_transfer' && event.accountId === checkingId) return balance - event.amountCents
  if (event.type === 'account_transfer' && event.toAccountId === checkingId) return balance + event.amountCents
  if (event.type === 'adjustment' && event.accountId === checkingId) {
    return balance + (event.direction === 'out' ? -event.amountCents : event.amountCents)
  }
  return balance
}, 0)
const reconciliationAdjustmentId = idFor('event:reconciliation-adjustment')
events.push({
  id: reconciliationAdjustmentId, type: 'adjustment', date: '2026-09-30', month: null, amountCents: 1_850,
  accountId: checkingId, toAccountId: null, bucketId: null, toBucketId: null, direction: 'in',
  customType: 'Reconciliation', description: 'Account reconciliation adjustment', payee: 'Bank statement',
  notes: 'Balances the demo checking account to its statement.',
})

const recurringPlans = [
  {
    id: idFor('plan:utility'), name: 'Power and water bill', eventType: 'expense', amountCents: 21_500,
    accountId: checkingId, toAccountId: null, bucketId: bucketId.Utilities, toBucketId: null,
    description: 'Monthly electric and water', payee: 'City Utilities',
    notes: 'Confirm the actual statement amount before posting.', frequency: 'monthly',
    startDate: '2026-01-05', endDate: null, nextRun: '2026-10-04', active: true,
  },
  {
    id: idFor('plan:salary'), name: 'Northstar paycheck', eventType: 'income', amountCents: 260_000,
    accountId: checkingId, toAccountId: null, bucketId: null, toBucketId: null,
    description: 'Paycheck', payee: 'Northstar Design Co.', notes: null, frequency: 'biweekly',
    startDate: '2026-01-01', endDate: null, nextRun: '2026-10-15', active: true,
  },
  {
    id: idFor('plan:rent'), name: 'Rent payment', eventType: 'expense', amountCents: 220_000,
    accountId: checkingId, toAccountId: null, bucketId: bucketId.Rent, toBucketId: null,
    description: 'Monthly rent', payee: 'Willow Creek Property', notes: null, frequency: 'monthly',
    startDate: '2026-01-01', endDate: null, nextRun: '2026-11-01', active: true,
  },
  {
    id: idFor('plan:card-payment'), name: 'Credit card payment', eventType: 'account_transfer', amountCents: 22_000,
    accountId: checkingId, toAccountId: accountId['Travel Rewards Card'], bucketId: null, toBucketId: null,
    description: 'Credit card payment', payee: 'Online payment',
    notes: 'Payment only; expenses are already categorized.', frequency: 'monthly',
    startDate: '2026-01-26', endDate: null, nextRun: '2026-10-26', active: true,
  },
  {
    id: idFor('plan:grocery-move'), name: 'Boost grocery bucket', eventType: 'bucket_move', amountCents: 2_500,
    accountId: null, toAccountId: null, bucketId: bucketId['Dining out'], toBucketId: bucketId.Groceries,
    description: 'Move leftover dining money to groceries', payee: null, notes: null,
    frequency: 'monthly', startDate: '2026-01-28', endDate: '2026-12-28', nextRun: '2026-10-28', active: true,
  },
  {
    id: idFor('plan:old-stream'), name: 'Old music plan', eventType: 'expense', amountCents: 1_099,
    accountId: accountId['Travel Rewards Card'], toAccountId: null, bucketId: bucketId.Subscriptions, toBucketId: null,
    description: 'Music streaming', payee: 'Soundwave', notes: null, frequency: 'monthly',
    startDate: '2025-01-10', endDate: null, nextRun: '2026-09-10', active: false,
  },
]

const paycheckTemplates = [
  {
    id: idFor('template:paycheck'), name: 'Regular paycheck', accountId: checkingId,
    allocations: [
      { bucketId: bucketId.Rent, cents: 180_000 },
      { bucketId: bucketId.Utilities, cents: 20_000 },
      { bucketId: bucketId.Groceries, cents: 45_000 },
      { bucketId: bucketId['Emergency fund'], cents: 15_000 },
    ],
  },
  {
    id: idFor('template:freelance'), name: 'Freelance income split', accountId: checkingId,
    allocations: [
      { bucketId: bucketId['Summer vacation'], cents: 15_000 },
      { bucketId: bucketId['Emergency fund'], cents: 15_000 },
      { bucketId: bucketId.Groceries, cents: 15_000 },
    ],
  },
]

const reconciliations = [{
  id: idFor('reconciliation:checking-september'), accountId: checkingId, date: '2026-09-30',
  statementBalanceCents: checkingBalanceBeforeReconciliation + 1_850,
  appBalanceCents: checkingBalanceBeforeReconciliation, adjustmentEventId: reconciliationAdjustmentId,
}]

const backup = {
  format: 'buckets-backup', version: 1, exportedAt: '2026-10-04T12:00:00.000Z',
  accounts, groups, buckets, events, recurringPlans, paycheckTemplates, reconciliations,
}

await mkdir(dirname(output), { recursive: true })
await writeFile(output, `${JSON.stringify(backup, null, 2)}\n`, 'utf8')
console.log(`Wrote ${output}`)
console.log(`${accounts.length} accounts, ${groups.length} groups, ${buckets.length} buckets, ${events.length} events, ${recurringPlans.length} recurring plans, ${paycheckTemplates.length} paycheck templates.`)
