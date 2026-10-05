# Buckets user guide

Buckets is a manual-entry envelope budgeting app. Use accounts to represent where
your money is held, buckets to represent what your money is for, and ledger events
to record every movement.

## Before you begin

Buckets does not connect to banks or import transactions automatically. You enter
your accounts and transactions manually. Create a backup before importing data,
deleting an account, or making a large correction.

## Sign in and navigate

1. Open the Buckets site.
2. Choose **Create account** to register with your name, email, and password, or
   sign in with an existing account.
3. If email confirmation is enabled for the Supabase project, follow the link in
   your confirmation email before signing in.
   Registration requires the project's Supabase Email provider to allow new
   users; confirmation behavior follows that project's Auth settings.
4. Use the navigation to open:
   - **Dashboard** for a monthly overview and quick actions.
   - **Budget** for monthly bucket planning.
   - **Transactions** for the ledger.
   - **Analytics** for charts and money-flow reports.
   - **Accounts** for account balances and account management.
   - **Settings** for backups, recurring plans, paycheck templates,
     reconciliation, and appearance.
5. The sidebar profile card shows the account name and email. Its cat photo is a
   decorative demo avatar, not a profile photo uploaded by the user.
6. On desktop, the sidebar shows active account balances.
7. On smaller screens, the navigation can be scrolled horizontally.

Use **New transaction** in the sidebar to open the quick-entry form. Press `N`
when the workspace is focused. Press `Ctrl+K` on Windows/Linux or `⌘K` on macOS
to search pages and common actions.

## Recommended first-time setup

### 1. Add your accounts

Open **Accounts** and create each place where you hold money, such as checking,
savings, cash, or a credit card.

For each account:

1. Enter a unique name.
2. Choose the account type.
3. Enter the current opening balance. Use a minus sign for a credit-card debt or
   another negative balance.
4. Save the account.

The opening balance is recorded as an adjustment event so the account balance
remains derived from the ledger.

You can:

- Edit account details.
- Drag accounts to change their order.
- Open account history.
- Archive an account to hide it from normal entry screens without deleting its
  history.
- Turn on **Show archived** to view archived accounts.
- Delete an account and its linked records. This is permanent and requires
  confirmation.

Account names must be unique for your user, including archived accounts.

### 2. Create your buckets

Open **Budget** and add buckets for the jobs your money needs to do. You can
organize buckets into groups such as Housing, Food, Transportation, or Savings.

For each bucket, you can configure:

- A bucket name and group.
- A bucket kind: spending, savings, or obligation.
- A monthly target.
- A savings target amount.
- A target date.
- A custom color.
- An archived state.

Bucket names must be unique for your user, including archived buckets.

### 3. Record income

Use **New transaction → Income** or **Deposit**:

1. Enter the date and amount.
2. Choose the account receiving the money.
3. Add an optional description, payee, notes, or custom label.
4. Save the event.

Income increases the selected account. It becomes available for allocation in
the corresponding budget month.

### 4. Assign income to buckets

Use **New transaction → Allocation** from the relevant budget month:

1. Choose the bucket.
2. Choose the month.
3. Enter the amount.
4. Choose whether money is being added to or returned from the bucket.
5. Save the allocation.

Buckets prevent allocating more money than is available. Returning money also
cannot exceed the amount available in that bucket.

## Recording everyday activity

### Expenses

Choose **New transaction → Expense**:

1. Select the account that paid.
2. Select the bucket the expense belongs to.
3. Enter the amount and date.
4. Add a description, payee, notes, or custom transaction label if useful.
5. Save.

An expense reduces the account and bucket balances.

### Moving money between buckets

Choose **New transaction → Move money**:

1. Select the source bucket.
2. Select the destination bucket.
3. Enter the amount and date.
4. Save.

The source and destination must be different buckets.

### Transferring money between accounts

Choose **New transaction → Transfer**:

1. Select the source account.
2. Select the destination account.
3. Enter the amount and date.
4. Save.

An account transfer changes where money is held without changing the overall
amount of money.

### Deposits and adjustments

- Use **Deposit** for income entering an account.
- Use **Adjustment** for a deliberate balance correction, such as correcting a
  starting balance or recording a reconciliation difference.
- Adjustments require a direction: money in or money out.

## Dashboard

The **Dashboard** provides a quick view of the selected month:

- Available money and budget progress.
- Income, spending, and savings totals.
- Recent activity.
- Cash-flow bars.
- Shortcuts to add a transaction, review the budget, or manage accounts.

Use the month controls to move between planning periods. Dashboard values are
calculated from the ledger rather than entered separately.

## Monthly budgeting

The **Budget** page is where you give every dollar a job.

For the selected month:

- Review income, allocations, spending, and available money.
- Expand a bucket to see its month-end balance calculation.
- Compare actual funding with the monthly target.
- Review want shortfalls or overages.
- Track savings-goal progress.
- Review remaining amounts and target-date projections.
- Use archived-bucket controls when you need to inspect older categories.

Create or edit a bucket from the budget controls. Use allocation events to move
money into or out of buckets; do not manually change derived balances.

### Rollover

Bucket balances can carry from one month to the next. Review the prior-month
balance before allocating new income so you do not allocate money twice.

## Transactions

The **Transactions** page contains the full ledger.

You can:

- Search descriptions, payees, notes, and custom labels.
- Filter by date range.
- Filter by account.
- Filter by bucket.
- Filter by event type.
- Filter by amount.
- Edit an existing transaction.
- Delete a transaction.
- Open the account or bucket associated with an event.

Use consistent descriptions and payees so search and analytics remain useful.
Custom transaction labels are optional and can be up to 40 characters.

## Analytics and money flow

Open **Analytics** to review activity over a selected week, month, or year.

Available views include:

- Income sources.
- Spending by bucket.
- Savings contributions and savings rate.
- Largest expenses.
- Total budget gauges.
- A selected group budget gauge.
- A selected bucket budget gauge.
- Stacked activity bars.
- Category and area-line charts.
- A Sankey diagram showing how money moved from income through available money,
  groups, buckets, spending, unspent balances, and unallocated money.

Use group and bucket selectors to focus the budget gauges. Use the date range
controls to compare different periods. Charts are derived from the same ledger
used by the Dashboard and Budget pages.

## Recurring plans

Open **Settings** and find **Recurring plans** to schedule expected activity.

Supported plan types:

- Income.
- Expense.
- Account transfer.
- Bucket move.

When creating a plan:

1. Enter a name.
2. Choose the transaction type.
3. Enter the amount.
4. Choose weekly, every two weeks, monthly, or yearly frequency.
5. Choose the first occurrence date.
6. Optionally choose an end date.
7. Select the accounts or buckets involved.
8. Save the plan.

Recurring plans do not automatically add events to the ledger. When the next
occurrence is due, it appears as **Pending**:

- **Confirm** posts the event and advances the next occurrence.
- **Skip** advances the schedule without posting an event.
- **Pause** stops future pending occurrences.
- **Resume** reactivates a paused plan.
- **Delete** removes the plan.

Review pending plans regularly so expected bills and income do not remain
unrecorded.

## Paycheck templates

Open **Settings** and find **Paycheck templates** to save a repeatable paycheck
allocation.

To create one:

1. Enter a template name.
2. Choose the account receiving the paycheck.
3. Enter bucket allocations.
4. Save the template.

To use one:

1. Enter the paycheck amount and date.
2. Select the account.
3. Choose the saved template.
4. Review the allocation preview.
5. Apply it.

The action creates the income event and its bucket allocations together. Check
that the allocations are appropriate before confirming.

## Account reconciliation

Use **Settings → Reconciliation** to compare an account with a statement.

1. Choose an active account.
2. Enter the statement date.
3. Enter the statement balance.
4. Review the app's calculated balance and difference.
5. Choose whether to post a balancing adjustment.
6. Save the reconciliation.

Reconciliation records the comparison without rewriting previous transactions.
If an adjustment is posted, it appears as a separate ledger event.

## Backups and restore

Open **Settings → Your data and backups**.

### Export

Click **Export JSON** to download a portable backup containing:

- Accounts.
- Bucket groups and buckets.
- Ledger events.
- Recurring plans.
- Paycheck templates.
- Reconciliation history.

Export regularly. The app records the last export date on the current browser
and shows a reminder after 30 days.

### Import

1. Export a current backup first.
2. Click **Import JSON**.
3. Select a Buckets backup file.
4. Read the replacement warning.
5. Confirm only if you intend to replace the current finance and planning data.

Import replaces the current user's accounts, buckets, events, plans, templates,
and reconciliation history. It does not replace the login. Do not close the
browser while the restore is running.

## Appearance and accessibility

Open **Settings → Appearance** and choose:

- **Dark - library palette**
- **Light - accessible contrast**

The preference is saved on the current browser/device. It does not change other
devices or users.

The app uses semantic colors for charts, progress bars, alerts, and controls.
Do not rely on color alone when reading a chart; use the displayed labels and
values as well.

## Command menu

Press `Ctrl+K` on Windows/Linux or `⌘K` on macOS, or click **Search pages and
actions** in the sidebar.

Use it to:

- Navigate to a page.
- Open common money actions.
- Switch between appearance themes.

Press `Escape` to close the menu.

## Troubleshooting

### The app cannot load data

Check that:

- You are signed in.
- The Supabase project URL and publishable/anon key are configured.
- The required migrations have been applied in numeric order.
- The browser has an internet connection.

Refresh the page and retry. If the error continues, open the development-only
`/devtools` route when running a local development build to inspect configuration,
authentication, schema access, and local storage.

### A record cannot be created

Check that:

- The amount is greater than zero.
- Required accounts or buckets are selected.
- Source and destination records are different for transfers and moves.
- The name is not already used by another account or bucket.
- The allocation does not exceed available money.

### A migration says an object already exists

Do not drop the table or delete user data. Back up first, then use the corrected
migration for the project state and inspect the existing schema before applying
additional changes.

### The favicon does not change

Browsers cache favicons aggressively. Use a PNG or ICO asset, update the favicon
URL with a new filename or query string, redeploy, and hard-refresh or reopen the
tab.

## Safe-use checklist

- Export a backup before imports, deletions, or schema changes.
- Use a separate demo account for sample data.
- Never share your password or private service-role key.
- Never put a Supabase service-role key in a `VITE_` environment variable.
- Review pending recurring plans.
- Reconcile important accounts regularly.
- Verify the selected month before allocating money.
