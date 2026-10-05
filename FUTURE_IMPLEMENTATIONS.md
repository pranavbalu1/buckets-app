# Future implementation plan

This roadmap prioritizes reliability first, then improvements to budgeting workflows,
reporting, and deployment. Each phase should be completed and validated before the
next phase begins.

## Phase 0: Stabilize the current database

**Goal:** Make the existing Supabase project and migration history safe to maintain.

- Finish applying migrations `005` through `011` to the intended Supabase project.
- Verify the existing schema before applying each migration:
  - tables and columns
  - indexes and constraints
  - row-level security
  - policies
  - RPC functions
- Record which migrations were applied manually and which are recorded in Supabase
  migration history.
- Avoid editing an old migration after it has been applied to a shared or production
  database. If a schema change is still needed, add a new numbered migration.
- Use `IF NOT EXISTS`, guarded policy creation, and `CREATE OR REPLACE FUNCTION` only
  where rerunning an operation is safe and does not hide a schema mismatch.
- Take a JSON export before making further schema changes.

**Done when:**

- The deployed app can load accounts, buckets, ledger events, recurring plans,
  paycheck templates, and reconciliations without database errors.
- A schema inspection query shows the expected columns and constraints.
- A clean test Supabase project can apply all migrations in numeric order.

## Phase 1: Establish automated quality gates

**Goal:** Catch regressions before deployment.

- Keep `npm run build`, `npm run lint`, and `npm test` passing locally and in CI.
- Add repository tests for:
  - duplicate account and bucket names
  - archived account and bucket behavior
  - recurring-plan date advancement
  - reconciliation adjustments
  - backup validation and restore
  - custom transaction labels
  - light and dark chart color selection
- Add migration smoke tests against a disposable Supabase/Postgres database.
- Add a CI check that detects migration files changed after they have already been
  released, requiring a new migration instead.
- Add a production smoke-test checklist for login, dashboard loading, creating a
  transaction, and signing out.

**Done when:**

- Pull requests run build, lint, unit tests, and migration checks automatically.
- A failed check blocks deployment.
- The most important data mutations have regression tests.

## Phase 2: Improve data safety and recovery

**Goal:** Make destructive and recovery workflows safer.

- Add an explicit backup-before-import confirmation with the export filename and
  timestamp.
- Add a restore preview showing counts of accounts, buckets, events, plans, and
  reconciliations before replacement.
- Add a clear post-restore summary and error state.
- Add duplicate/import conflict reporting instead of silently hiding invalid rows.
- Add a visible data export action in Settings.
- Verify the private GitHub backup workflow and confirm that service-role credentials
  never appear in logs, browser code, or Vercel variables.
- Add an account deletion checklist and a final confirmation that explains what will
  be permanently removed.

**Done when:**

- Users can export, preview, restore, and verify their data without using SQL.
- Failed imports leave existing data unchanged.
- Recovery instructions are documented and tested.

## Phase 3: Complete core budgeting workflows

**Goal:** Reduce the amount of manual work required for monthly budgeting.

- Add a dedicated monthly planning workflow for:
  - assigning available income
  - moving money between buckets
  - covering overspending
  - carrying balances forward
- Improve recurring plans with:
  - next-occurrence previews
  - edit and skip controls
  - end-date handling
  - clear confirmation states
- Improve paycheck templates with:
  - reusable allocation presets
  - validation that allocation totals match the paycheck
  - an editable preview before posting
- Add transaction duplication for repeated manual entries.
- Add bulk transaction actions with an undo or confirmation step.
- Add clearer empty, loading, and error states to each major page.

**Done when:**

- A user can complete a normal monthly budgeting cycle without editing raw data.
- Recurring and paycheck actions are reversible or clearly confirmed.
- All new flows have unit tests and at least one browser-level smoke test.

## Phase 4: Improve reporting and accessibility

**Goal:** Make financial information easier to understand and use.

- Add report date-range comparison, such as current month versus previous month.
- Add filtering and drill-down from charts to the matching transactions.
- Add an accessible table alternative for every chart.
- Verify color contrast in both themes, especially chart series and progress bars.
- Add keyboard navigation and visible focus states to dialogs, menus, filters, and
  chart controls.
- Add responsive layouts for narrow screens and larger displays.
- Replace the emoji text favicon with a stable PNG or ICO asset and cache-bust the
  favicon URL when branding changes.

**Done when:**

- Key values remain understandable without relying on color alone.
- Core flows work with keyboard navigation.
- Charts and tables show the same underlying values.

## Phase 5: Deployment and observability

**Goal:** Make releases predictable on Vercel and Supabase.

- Separate preview and production Supabase projects or schemas.
- Apply database migrations through a controlled CI workflow instead of manually
  pasting old migrations into the SQL Editor.
- Add a migration backup and rollback procedure for production.
- Document Vercel environment variables and Supabase Auth redirect URLs.
- Add a deployment smoke test after each production release.
- Add a private health check for Supabase connectivity, schema readiness, and local
  storage.
- Track client-side errors without sending financial data or secrets to a third
  party.
- Add release notes for database changes and user-visible behavior changes.

**Done when:**

- A release can be reproduced from a clean checkout.
- Preview deployments cannot accidentally use production secrets or data.
- A failed deployment has a documented recovery path.

## Implementation rules for future changes

1. Write or update the data model and acceptance criteria before changing the UI.
2. Add a new Supabase migration for every schema change; never rewrite an applied
   migration for production.
3. Keep all monetary values as integer cents.
4. Enforce important invariants in both the client and the database.
5. Preserve row-level security for every user-owned table and RPC.
6. Add tests for the domain logic before changing derived balances or reports.
7. Run the smallest relevant checks, then run the full build, lint, and test suite
   before release.
8. Back up user data before destructive changes or restore operations.
9. Keep secrets out of `VITE_` variables, source code, commits, and logs.
10. Update the README whenever setup, migration, or deployment behavior changes.

## Suggested first three tasks

1. Complete and verify the current Supabase migrations on a disposable project.
2. Add migration smoke tests and a clean-project CI check.
3. Add restore preview and failure-safe backup/restore tests before extending the
   budgeting model.
