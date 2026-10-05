# Buckets

A private, manual-entry budgeting app built around envelope budgeting. Track account balances, assign income to buckets, follow rollover from month to month, review spending, and see how money moved through a selected week, month, or year.

For a complete walkthrough of the user-facing features, see the [Buckets user guide](USER_GUIDE.md). This README covers technical setup, migrations, development, and deployment.

The app is a static React front end backed by Supabase Postgres and Auth. It does not connect to banks, store receipts, use a custom server, or send analytics to third parties. All money values are stored as integer cents; balances and reports are derived from ledger events.

The visual theme follows the included UI library: charcoal surfaces with electric lime, cyan, and emerald accents. The shipped Gilroy font files are used throughout the application.

The reusable UI library lives in [`src/components`](src/components/README.md). It has a public barrel export, self-contained theme stylesheet, and no finance-app or Supabase imports, so the folder can be copied into another Tailwind v4 project.

## Features

- Email and password sign-in with a persistent Supabase session.
- Checking, savings, cash, credit card, and other accounts with opening balances, history, editing, archive, and ordering.
- Grouped buckets with monthly targets, savings goals, allocations, and bucket-to-bucket moves.
- Monthly planning with prior-month rollover, income, net funding, spending, and available money. Each bucket can expand to show the month-end balance formula, want shortfall or overage, goal progress, remaining amount, and target-date projection where applicable.
- Transactions with add, edit, delete, category selection, optional custom transaction labels, text search, and date, account, bucket, type, and amount filters.
- Weekly, monthly, and yearly activity views with reusable stacked-bar, semicircle category, and area-line charts; includes income sources, spending by bucket, savings contributions and rate, largest expenses, and budget gauges for total, a selected group, and a selected bucket.
- A period-based Sankey diagram for income, available money, groups, buckets, spending, unspent balances, and unallocated money.
- Recurring plans that wait for confirmation before an event is added to the ledger.
- Paycheck templates that add an income event and its bucket assignments together.
- Account reconciliation that records the comparison and can add a balancing adjustment without rewriting history.
- A full JSON export and restore flow, with a 30-day export reminder stored on the current browser/device.
- Dark and light appearance preferences, saved locally in the current browser.
- A searchable command menu for page navigation, common money actions, and appearance settings (`Ctrl+K` or `⌘K`).

## Stack

- React, TypeScript, React Router, Vite, and Tailwind CSS
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
8. `008_transaction_labels.sql`
9. `009_developer_tools.sql`
10. `010_account_deletion.sql`
11. `011_unique_account_and_bucket_names.sql`

The migrations enable RLS on every app table. Migration 007 upgrades existing monthly income streams to confirm-before-post recurring plans and creates the reconciliation and atomic backup-restore functions. Migration 008 adds optional custom transaction labels and keeps them in backup restores. Migration 009 adds the development-only reset RPC, which atomically clears finance data belonging to the signed-in user while preserving their Supabase Auth account. Migration 010 adds atomic account deletion for the signed-in user and its linked records. Migration 011 makes account and bucket names unique per user, renaming later existing duplicates with a numeric suffix before creating the unique indexes. For a new project, apply the full sequence once. Back up data before applying schema changes to an existing project.

### 3. Configure the browser client

Copy `.env.example` to `.env.local` and set the project URL and **publishable/anon** key from Supabase project API settings:

```dotenv
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

The browser key is public by design; row-level security is the boundary protecting data. Never put a Supabase `service_role` key in a `VITE_` variable, source file, or static-host setting. The optional private-backup workflow uses it only as an encrypted GitHub Actions secret; it must never be exposed in logs or bundled into the app.

### 4. Run locally

```sh
npm install
npm run dev
```

During local development, type `/devtools` in the address bar to open the private health dashboard. It has no link in the app navigation and is omitted from production builds. The page can diagnose missing Supabase configuration before sign-in; authenticate to verify RLS access or use its reset action. It checks app/browser readiness, Supabase Auth, access to the expected schema, and local storage. The reset requires typing a confirmation phrase and a second browser confirmation; it deletes only the current user's finance data and keeps the login. Apply migration `009_developer_tools.sql` before using that action.

### Deploy to Vercel

Push the project to GitHub, import its repository from Vercel, and keep the project root at `/`. Vercel detects Vite; the build command is `npm run build` and the output directory is `dist`. The included `vercel.json` rewrites direct React Router URLs such as `/budget` and `/accounts` to the app entry page.

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the Vercel project's Environment Variables for Production (and Preview if you want preview deployments connected to Supabase). Use the project URL and publishable/anon key from Supabase API settings. These `VITE_` values are included in browser code, so only use the publishable/anon key; never use a service-role/secret key here. Apply every pending migration in `supabase/migrations/` to the matching Supabase project before using the deployed app. Set Supabase Auth's Site URL to your production Vercel domain. Add the production and any required preview domains to its allowed redirect URLs.

### Ready-to-import JSON demo

[`examples/demo-finance-backup.json`](examples/demo-finance-backup.json) is a synthetic, ready-to-import backup with checking, savings, cash, and credit-card accounts; grouped and ungrouped buckets; savings goals; 295 ledger events; transaction labels; all ledger event types; recurring plans; paycheck templates; and a linked account reconciliation. It includes one intentional small overspend to demonstrate the budget alert. Its activity covers the months leading up to October 2026 so the dashboard, Budget, Transactions, Accounts, Analytics, Sankey, and planning views have useful data to explore.

To load it, sign in to a development or demo account, open **Settings → Import JSON**, select that file, and confirm. Import replaces the account's existing finance and planning data, but keeps its login. The entries are fictitious. To recreate the file after editing its source, run `node scripts/create-demo-backup.mjs`.

### Optional demo data

The repeatable demo seeder creates a populated set of accounts, groups, buckets, six months of ledger activity, recurring plans, a paycheck template, and a reconciliation. Use a dedicated demo Auth user in a development Supabase project. The script uses a service-role key, adds/upserts only its deterministic demo records, and does not delete existing rows.

```sh
cp .env.demo.example .env.demo
# Set the project URL, private service-role key, dedicated Auth user UUID, and confirmation in .env.demo.
npm run seed:demo
```

Keep `.env.demo` private. Do not use a production account or put the service-role key in a `VITE_` variable. Apply all migrations through `009_developer_tools.sql` before running the seeder.

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
7. Search the repository and deployment environment to make sure no service-role key is in source code, build output, or a `VITE_` variable. If scheduled backups are enabled, keep that key only in the encrypted `SUPABASE_SERVICE_ROLE_KEY` Actions secret.

See [`docs/security-checklist.md`](docs/security-checklist.md) for the same checks in release form.

## Backups and free-tier pause behavior

Use **Settings → Export JSON** regularly and keep the downloaded file in a private location. The backup contains ledger and planning data, so treat it as sensitive. Settings shows when this browser last exported and reminds you after 30 days. The timestamp is local to that browser; it does not sync between devices.

Import replaces all ledger and planning rows for the signed-in user in one database transaction. It cannot be undone. Export the current data first if you might need to restore it later.

Supabase free projects can pause after inactivity. The optional GitHub Actions keep-alive workflow in `.github/workflows/supabase-keepalive.yml` sends a lightweight request every five days. Add repository Actions secrets `SUPABASE_URL` and `SUPABASE_ANON_KEY` to enable it. If the project is already paused, resume it in the Supabase dashboard; the workflow cannot resume a paused project.

An optional weekly job in `.github/workflows/supabase-backup.yml` exports one user's complete backup and stores it as a 30-day GitHub Actions artifact. It refuses to run unless the repository is private. To enable it, add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_USER_ID` as encrypted repository Actions secrets. The service-role key bypasses RLS, so restrict repository and workflow access, protect the default branch, and never reuse that secret in the frontend or static-host settings. Download and retain important artifacts privately before they expire.

The CI workflow in `.github/workflows/ci.yml` runs lint, domain tests, and the production build on pushes and pull requests.

## Static deployment

Deploy the Vite output directory `dist` to Cloudflare Pages, Netlify, or Vercel. Set these two build environment variables in the host:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Configure the host's SPA fallback so direct visits to `/dashboard`, `/budget`, `/transactions`, `/accounts`, `/analytics`, and `/settings` resolve to `index.html`. Navigation uses React Router in the browser and needs no server-side functions. GitHub Pages is not configured; a static host with free private-repository support is the intended deployment.

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
src/components/  Portable UI components, theme tokens, and showcase examples
src/app/         App-specific navigation, page skeletons, and money formatting
src/features/analytics/  Finance-data Sankey diagram
supabase/migrations/  Database schema, constraints, RLS, and database functions
docs/             Security and release checklist
```

Keep real user data and secrets out of the repository. The included JSON file is explicitly synthetic; never commit `.env.local`, private backups, personal ledger exports, or credentials.
