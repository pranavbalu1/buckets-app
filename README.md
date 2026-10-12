# Buckets

Buckets is an envelope-style budgeting app. It helps you answer three
questions:

1. **Where is my money?** Track checking, savings, cash, credit-card, and other
   accounts.
2. **What is my money for?** Assign money to buckets such as Housing, Food, or
   Transportation.
3. **What happened to my money?** Record income, allocations, expenses,
   transfers, bucket moves, and adjustments in one ledger.

Balances and reports are calculated from the ledger. The app does not connect to
your bank and does not import transactions automatically.

## Run targets

- Web: `npm run dev`
- Desktop: see [DESKTOP.md](DESKTOP.md)

## Quick start

### 1. Sign in

Open the app and choose **Create account** or **Sign in**. If email confirmation
is enabled by the Supabase project, confirm your email before signing in.

### 2. Add accounts

Open **Accounts** and add each place where money is held:

- Checking
- Savings
- Cash
- Credit card
- Other

Enter the current balance as the opening balance. Use a negative amount for a
credit-card debt or another negative balance. The opening balance is stored as
an adjustment so the account balance remains part of the ledger.

### 3. Create groups and buckets

Open **Budget** and create buckets for the jobs your money needs to do. Groups
are optional; they organize related buckets:

```text
Food
  Groceries
  Restaurants

Housing
  Rent
  Utilities

Transportation
  Fuel
  Repairs
```

A bucket can be:

- **Plain old bucket**: hold money until you spend it.
- **Recurring expense**: set a monthly spending target.
- **Save by date**: reach a target by a date.
- **Save by depositing**: reach a target with a monthly contribution.
- **Save until date**: contribute a monthly amount until a date.

Targets are planning information. They do not move money automatically.

### 4. Record income

Use **New transaction → Income** or **Deposit**:

1. Select the account receiving the money.
2. Enter the date and amount.
3. Add an optional description, payee, notes, or custom label.
4. Save the transaction.

### 5. Assign income

Use **New transaction → Allocation** from the relevant budget month:

1. Choose a bucket.
2. Choose the budget month.
3. Enter the amount.
4. Save the allocation.

Allocations give money a job. They are different from expenses: an allocation
changes the budget, while an expense records money that was spent.

### 6. Record expenses

Use **New transaction → Expense**:

1. Select the account that paid.
2. Select the bucket that should cover the expense.
3. Enter the date and amount.
4. Add a description or payee.
5. Save.

An expense reduces both the selected account balance and the selected bucket
balance.

## Main pages

### Dashboard

The Dashboard gives a monthly overview:

- Unallocated money
- Planned targets
- Actual spending
- Variance
- Expense coverage
- Savings progress
- Recent activity
- Cash-flow summaries

Use the month controls to review another planning period.

### Budget

The Budget page is where you plan and review bucket balances. For a selected
month you can:

- Review income and money available to assign.
- Assign money to buckets.
- Cover recorded expenses.
- Compare targets with actual spending.
- Review uncovered expenses.
- Track savings goals.
- Inspect bucket balance calculations.
- Show archived buckets.

**Cover expenses** assigns money based on actual expense activity that is not
already covered. It does not automatically fund the full monthly target.

Only money intentionally assigned to a bucket rolls forward. An unused target
does not automatically become assigned money.

### Transactions

Transactions is the complete ledger. Search and filter by:

- Description
- Payee
- Notes
- Custom label
- Date range
- Account
- Bucket
- Event type
- Amount

You can edit or delete individual transactions.

### Accounts

Accounts represent where money is physically held. You can:

- Add, edit, reorder, and archive accounts.
- Open account history.
- View account balances.
- Delete an account and its linked records.

Deleting an account is permanent. Export a backup first if you may need its
history later.

### Analytics

Analytics provides week, month, and year views for:

- Income sources
- Spending by bucket
- Savings contributions
- Savings rate
- Largest expenses
- Planned versus actual spending
- Trends over time
- Money flow between accounts and buckets

Analytics is derived from ledger events and does not create additional
transactions.

### Settings

Settings contains supporting workflows:

- Backup export and restore
- Recurring plans
- Paycheck templates
- Account reconciliation
- Appearance and theme settings

Create a backup before importing data, restoring a backup, deleting an account,
deleting a bucket, or making a large correction.

## Moving money

### Move money between buckets

Use **New transaction → Move money**:

1. Select the source bucket.
2. Select the destination bucket.
3. Enter the amount and date.
4. Save.

The source and destination buckets must be different.

### Transfer between accounts

Use **New transaction → Transfer**:

1. Select the source account.
2. Select the destination account.
3. Enter the amount and date.
4. Save.

An account transfer changes where money is held but does not change total money.

### Adjust a balance

Use **Adjustment** for a deliberate correction, such as:

- Correcting an opening balance
- Matching a statement during reconciliation
- Recording money that entered or left outside the normal workflow

Adjustments require a direction: money in or money out.

## Editing and deleting buckets

Archiving is optional. It hides a bucket from normal entry screens while
preserving its history.

To permanently delete a bucket:

1. Open **Budget**.
2. Open the bucket editor.
3. Choose **Delete permanently**.
4. Read the confirmation and confirm.

Permanent deletion removes:

- The bucket
- Ledger events using the bucket
- Bucket moves involving the bucket
- Recurring plans using the bucket
- The bucket's entries in paycheck templates

This cannot be undone. The delete operation is scoped to the signed-in user
and runs atomically, so the bucket and its dependent records are removed
together or not at all.

If the app reports that bucket deletion is not enabled in the database, apply
[`supabase/migrations/013_delete_bucket_with_history.sql`](supabase/migrations/013_delete_bucket_with_history.sql)
to the Supabase project. The frontend change alone cannot create the database
function required for permanent deletion.

## Keyboard shortcuts

- Press `N` while the workspace is focused to open a new transaction.
- Press `Ctrl+K` on Windows/Linux or `⌘K` on macOS to open search and actions.

On smaller screens, the navigation can be scrolled horizontally.

## Data and privacy

- Each signed-in user can access only their own accounts, groups, buckets,
  events, plans, templates, and reconciliations.
- Money is stored as integer cents to avoid floating-point rounding errors.
- The ledger is the source of truth; balances are derived.
- Backups contain financial data and should be stored securely.
- Do not commit `.env.local`, Supabase keys, or exported backup files.

The profile card's cat image is a decorative demo avatar. It is not an image
uploaded as the user's profile photo.

## Local development

### Requirements

- Node.js with npm
- A Supabase project

### Install and configure

```powershell
npm install
Copy-Item .env.example .env.local
```

Set these values in `.env.local`:

```text
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

The browser client must only receive the publishable/anonymous Supabase key.
Never put a service-role key in a `VITE_` variable or browser code.

### Run locally

```powershell
npm run dev
```

### Validate changes

```powershell
npm run lint
npm test
npm run build
```

### Apply migrations

Apply the files in `supabase/migrations` in numeric order using the Supabase
CLI or the Supabase SQL Editor. Do not edit a migration that has already been
applied to a shared project; add a new numbered migration instead.

The bucket deletion workflow specifically requires migration `013`.

## Project structure

```text
src/
  domain/       Pure budgeting, ledger, money, validation, and analytics logic
  features/     User-facing pages and workflows
  components/   Reusable UI components
  storage/      Zustand state, repository interfaces, mappers, and Supabase I/O
  lib/          Supabase client, query client, theme, and shared utilities
supabase/
  migrations/   Database schema, security policies, and transactional RPCs
scripts/        Local demo and maintenance scripts
```

The repository follows a few important rules:

1. Keep monetary values as integer cents.
2. Keep the ledger as the single source of truth.
3. Validate input in both the client and database.
4. Preserve row-level security for user-owned data.
5. Add a new migration for every schema change.
6. Add tests for changes to domain calculations.
7. Keep secrets out of source code, browser bundles, logs, and commits.

## Current limitations

- There is no bank synchronization or automatic transaction import.
- Transactions are entered manually.
- Receipt scanning is not currently implemented.
- Automatic bucket assignment is not currently implemented.
- A deleted bucket and its dependent history cannot be restored except by
  restoring a backup.

## License and commercial use

Check the repository's applicable license and the licenses of all dependencies
before distributing or commercializing a deployment. Use original branding and
assets, and do not assume that similar budgeting concepts grant permission to
copy another product's implementation or identity.
