# Buckets

A private, manual-entry budgeting app built around envelope budgeting. Track account balances, assign income to buckets, follow rollover from month to month, review spending, and see how money moved through a selected week, month, or year.

The app is a static React front end backed by Supabase Postgres and Auth. It does not connect to banks, store receipts, use a custom server, or send analytics to third parties. All money values are stored as integer cents; balances and reports are derived from ledger events.

The visual theme follows the included UI library: charcoal surfaces with electric lime, cyan, and emerald accents.

## Features

- Email and password sign-in with a persistent Supabase session.
- Checking, savings, cash, credit card, and other accounts with history, editing, archive, and ordering.
- Grouped buckets with monthly targets, savings goals, allocations, and bucket-to-bucket moves.
- Monthly planning with prior-month rollover, income, net funding, spending, and available money. Each bucket can expand to show the month-end balance formula, want shortfall or overage, goal progress, remaining amount, and target-date projection where applicable.
- Transactions with add, edit, delete, text search, and date, account, bucket, type, and amount filters.
- Weekly, monthly, and yearly activity views: income sources, spending by bucket, savings contributions and rate, largest expenses, and budget versus actual.
- A period-based Sankey diagram for income, available money, groups, buckets, spending, unspent balances, and unallocated money.
- Recurring plans that wait for confirmation before an event is added to the ledger.
- Paycheck templates that add an income event and its bucket assignments together.
- Account reconciliation that records the comparison and can add a balancing adjustment without rewriting history.
- A full JSON export and restore flow, with a 30-day export reminder stored on the current browser/device.

## Stack

- React, TypeScript, Vite, and Tailwind CSS
- Zustand for ledger state and TanStack Query for server data fetching/cache
- Supabase Postgres, Auth, and row-level security
- Zod validation and date-fns calendar-date handling
- Recharts and d3-sankey
- Vitest domain and mapper tests

## Local setup

### 1. Create Supabase project and user

Create a free Supabase project. In **Authentication → Users**, create your single user with the email/password you will use to sign in. Then disable public sign-ups under **Authentication → Providers → Email** (the label can differ slightly as the Supabase dashboard changes). This app intentionally has no registration page.

### 2. Create the schema

Run every SQL migration in `supabase/migrations/` in numeric order in the Supabase SQL Editor:

1. `001_core.sql`
2. `002_bucket_targets.sql`
3. `003_bucket_types_and_group_colors.sql`
4. `004_bucket_goal_fields.sql`
5. `005_income_streams.sql`
6. `006_account_sort_order.sql`
7. `007_planning_reconciliation_backups.sql`

The migrations enable RLS on every app table. The final migration also upgrades existing monthly income streams to confirm-before-post recurring plans and creates the reconciliation and atomic backup-restore functions. For a new project, apply the full sequence once. Back up data before applying schema changes to an existing project.

### 3. Configure the browser client

Copy `.env.example` to `.env.local` and set the project URL and **publishable/anon** key from Supabase project API settings:

```dotenv
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

The browser key is public by design; row-level security is the boundary protecting data. Never use a Supabase `service_role` key in a `VITE_` variable, source file, GitHub Actions workflow, or static-host setting.

### 4. Run locally

```sh
npm install
npm run dev
```

To produce the static site locally:

```sh
npm run build
npm run preview
```

Other project commands are `npm run lint` and `npm test`.

## Supabase security checklist

Before putting the site on the public internet:

1. Create your account directly in the Supabase dashboard.
2. Disable public email sign-ups after that account exists.
3. Confirm RLS is enabled on `accounts`, `bucket_groups`, `buckets`, `ledger_events`, `income_streams`, `recurring_plans`, `paycheck_templates`, and `reconciliations`.
4. Confirm each table has an authenticated-only owner policy using `user_id = auth.uid()` for reads and writes. The `restore_ledger`, `record_reconciliation`, and `complete_recurring_plan` functions run as the caller and use that caller's identity.
5. Check unauthenticated access using the project URL and anon key. The request should return no user rows (usually HTTP 200 with `[]`):

   ```sh
   curl -i \
     -H "apikey: YOUR_ANON_KEY" \
     "https://YOUR-PROJECT.supabase.co/rest/v1/accounts?select=id"
   ```

6. Sign in through the app and verify your own rows load. If the unauthenticated request returns account data, stop and repair RLS before using the deployment.
7. Search the repository and deployment environment to make sure no service-role secret was added. Only the two `VITE_SUPABASE_*` values belong in the browser build.

See [`docs/security-checklist.md`](docs/security-checklist.md) for the same checks in release form.

## Backups and free-tier pause behavior

Use **Settings → Export JSON** regularly and keep the downloaded file in a private location. The backup contains ledger and planning data, so treat it as sensitive. Settings shows when this browser last exported and reminds you after 30 days. The timestamp is local to that browser; it does not sync between devices.

Import replaces all ledger and planning rows for the signed-in user in one database transaction. It cannot be undone. Export the current data first if you might need to restore it later.

Supabase free projects can pause after inactivity. The optional GitHub Actions keep-alive workflow in `.github/workflows/supabase-keepalive.yml` sends a lightweight request every five days. Add repository Actions secrets `SUPABASE_URL` and `SUPABASE_ANON_KEY` to enable it. If the project is already paused, resume it in the Supabase dashboard; the workflow cannot resume a paused project.

## Static deployment

Deploy the Vite output directory `dist` to Cloudflare Pages, Netlify, or Vercel. Set these two build environment variables in the host:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Use the host's SPA fallback so application routes resolve to `index.html` if routes are added later. This app currently uses client-side tab navigation and needs no server-side functions. GitHub Pages is not configured; a static host with free private-repository support is the intended deployment.

## Data and budgeting notes

- Ledger events are the source of truth. Account totals, bucket balances, available money, rollover, analytics, and Sankey inputs are computed from events.
- Allocation events take effect in their selected budget month. Other ledger events use their calendar date.
- Leftover and overspent bucket balances carry into later months. The Budget page shows each bucket's opening balance, assignments, moves, spending, and month-end available balance. Its expanded calculation uses `opening + net assignments + moves in - moves out - spending`; savings goals include remaining-to-goal and date progress, while date-based monthly plans show an estimate that assumes no spending or withdrawals.
- Credit cards are accounts that can carry a negative balance. A card payment is an account transfer; it is not spending a second time.
- Reconciliation adds an adjustment event when requested. It does not change earlier transactions.
- Recurring plans only create an event after you confirm a due occurrence. Skipping advances the schedule without making a ledger entry.
- Savings contributions are net allocations and bucket moves into buckets marked as savings, divided by income for the savings rate.
- Sankey visualizations use real period data and aggregate flows. The ledger does not record which particular income dollar funded a particular bucket, so the diagram does not claim individual-dollar tracing.

## Repository map

```text
src/domain/       Pure ledger, budget, and analytics calculations
src/features/     Dashboard, budget, transactions, analytics, accounts, settings
src/storage/      Repository adapter, Supabase mappings, backup schema and download
src/components/ui/Reusable UI library components
src/components/showcase/Examples of the UI library in use
supabase/migrations/  Database schema, constraints, RLS, and database functions
docs/             Security and release checklist
```

The repository must contain code and schema only. Never commit `.env.local`, JSON backups, personal ledger exports, or credentials.
