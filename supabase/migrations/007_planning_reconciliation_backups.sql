create table recurring_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  event_type text not null check (event_type in ('income','expense','account_transfer','bucket_move')),
  amount_cents bigint not null check (amount_cents > 0),
  account_id uuid references accounts(id),
  to_account_id uuid references accounts(id),
  bucket_id uuid references buckets(id),
  to_bucket_id uuid references buckets(id),
  description text not null default '',
  payee text,
  notes text,
  frequency text not null check (frequency in ('weekly','biweekly','monthly','yearly')),
  start_date date not null,
  end_date date,
  next_run date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  constraint recurring_plan_shape check (
    case event_type
      when 'income' then account_id is not null and to_account_id is null and bucket_id is null and to_bucket_id is null
      when 'expense' then account_id is not null and bucket_id is not null and to_account_id is null and to_bucket_id is null
      when 'account_transfer' then account_id is not null and to_account_id is not null and account_id <> to_account_id and bucket_id is null and to_bucket_id is null
      when 'bucket_move' then bucket_id is not null and to_bucket_id is not null and bucket_id <> to_bucket_id and account_id is null and to_account_id is null
    end
  )
);

create index recurring_plans_due on recurring_plans (user_id, active, next_run);
alter table recurring_plans enable row level security;
create policy "own rows" on recurring_plans for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Upgrade previously saved monthly income streams into confirm-before-post plans.
insert into recurring_plans (id, user_id, name, event_type, amount_cents, account_id, frequency, start_date, next_run, active)
select id, user_id, name, 'income', amount_cents, account_id, 'monthly', created_at::date, next_date, active
from income_streams
on conflict (id) do nothing;

create table paycheck_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  account_id uuid references accounts(id),
  allocations jsonb not null default '[]'::jsonb check (jsonb_typeof(allocations) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table paycheck_templates enable row level security;
create policy "own rows" on paycheck_templates for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table reconciliations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null references accounts(id),
  date date not null,
  statement_balance_cents bigint not null,
  app_balance_cents bigint not null,
  adjustment_event_id uuid references ledger_events(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reconciliations_by_account on reconciliations (user_id, account_id, date desc);
alter table reconciliations enable row level security;
create policy "own rows" on reconciliations for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Record an account check and its optional ledger adjustment atomically.
create function record_reconciliation(
  p_account_id uuid,
  p_date date,
  p_statement_balance_cents bigint,
  p_app_balance_cents bigint,
  p_post_adjustment boolean
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_difference bigint := p_statement_balance_cents - p_app_balance_cents;
  v_event_id uuid;
  v_reconciliation_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from accounts where id = p_account_id and user_id = v_user_id) then
    raise exception 'Account not found';
  end if;

  if p_post_adjustment and v_difference <> 0 then
    insert into ledger_events (user_id, type, date, amount_cents, account_id, direction, description)
    values (v_user_id, 'adjustment', p_date, abs(v_difference), p_account_id,
      case when v_difference > 0 then 'in' else 'out' end, 'Account reconciliation')
    returning id into v_event_id;
  end if;

  insert into reconciliations (user_id, account_id, date, statement_balance_cents, app_balance_cents, adjustment_event_id)
  values (v_user_id, p_account_id, p_date, p_statement_balance_cents, p_app_balance_cents, v_event_id)
  returning id into v_reconciliation_id;
  return v_reconciliation_id;
end;
$$;
revoke all on function record_reconciliation(uuid, date, bigint, bigint, boolean) from public;
grant execute on function record_reconciliation(uuid, date, bigint, bigint, boolean) to authenticated;

-- Confirm a pending occurrence once, or skip it. The event and schedule update
-- happen in the same transaction so two devices cannot post the same occurrence.
create function complete_recurring_plan(p_plan_id uuid, p_occurrence_date date, p_confirm boolean)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan recurring_plans%rowtype;
  v_next date;
  v_event_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select * into v_plan from recurring_plans
    where id = p_plan_id and user_id = v_user_id and active for update;
  if not found or v_plan.next_run <> p_occurrence_date then
    raise exception 'This recurring occurrence is no longer pending';
  end if;

  if p_confirm then
    insert into ledger_events (user_id, type, date, amount_cents, account_id, to_account_id,
      bucket_id, to_bucket_id, description, payee, notes)
    values (v_user_id, v_plan.event_type, p_occurrence_date, v_plan.amount_cents,
      v_plan.account_id, v_plan.to_account_id, v_plan.bucket_id, v_plan.to_bucket_id,
      coalesce(nullif(v_plan.description, ''), v_plan.name), v_plan.payee, v_plan.notes)
    returning id into v_event_id;
  end if;

  v_next := case v_plan.frequency
    when 'weekly' then (p_occurrence_date + interval '1 week')::date
    when 'biweekly' then (p_occurrence_date + interval '2 weeks')::date
    when 'monthly' then (p_occurrence_date + interval '1 month')::date
    when 'yearly' then (p_occurrence_date + interval '1 year')::date
  end;
  update recurring_plans set next_run = v_next,
    active = (end_date is null or v_next <= end_date), updated_at = now()
    where id = p_plan_id and user_id = v_user_id;
  return v_event_id;
end;
$$;
revoke all on function complete_recurring_plan(uuid, date, boolean) from public;
grant execute on function complete_recurring_plan(uuid, date, boolean) to authenticated;

-- Restore a complete portable backup as one database transaction. RLS remains enabled;
-- every inserted user_id is taken from the authenticated session, never from the file.
create function restore_ledger(p_backup jsonb) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_backup is null
    or jsonb_typeof(p_backup) is distinct from 'object'
    or p_backup->>'format' is distinct from 'buckets-backup'
    or p_backup->>'version' is distinct from '1'
    or jsonb_typeof(p_backup->'accounts') is distinct from 'array'
    or jsonb_typeof(p_backup->'groups') is distinct from 'array'
    or jsonb_typeof(p_backup->'buckets') is distinct from 'array'
    or jsonb_typeof(p_backup->'events') is distinct from 'array'
    or jsonb_typeof(p_backup->'recurringPlans') is distinct from 'array'
    or jsonb_typeof(p_backup->'paycheckTemplates') is distinct from 'array'
    or jsonb_typeof(p_backup->'reconciliations') is distinct from 'array'
  then
    raise exception 'Unsupported Buckets backup format';
  end if;

  delete from reconciliations where user_id = v_user_id;
  delete from paycheck_templates where user_id = v_user_id;
  delete from recurring_plans where user_id = v_user_id;
  delete from income_streams where user_id = v_user_id;
  delete from ledger_events where user_id = v_user_id;
  delete from buckets where user_id = v_user_id;
  delete from bucket_groups where user_id = v_user_id;
  delete from accounts where user_id = v_user_id;

  insert into accounts (id, user_id, name, type, sort_order, archived)
  select id, v_user_id, name, type, "sortOrder", archived
  from jsonb_to_recordset(coalesce(p_backup->'accounts', '[]'::jsonb)) as x(
    id uuid, name text, type text, "sortOrder" integer, archived boolean
  );

  insert into bucket_groups (id, user_id, name, sort_order, color)
  select id, v_user_id, name, "sortOrder", color
  from jsonb_to_recordset(coalesce(p_backup->'groups', '[]'::jsonb)) as x(
    id uuid, name text, "sortOrder" integer, color text
  );

  insert into buckets (id, user_id, group_id, name, kind, sort_order, archived, monthly_target_cents, target_cents, target_date, color)
  select id, v_user_id, "groupId", name, kind, "sortOrder", archived, "monthlyTargetCents", "targetCents", "targetDate", color
  from jsonb_to_recordset(coalesce(p_backup->'buckets', '[]'::jsonb)) as x(
    id uuid, "groupId" uuid, name text, kind text, "sortOrder" integer, archived boolean,
    "monthlyTargetCents" bigint, "targetCents" bigint, "targetDate" date, color text
  );

  insert into ledger_events (id, user_id, type, date, month, amount_cents, account_id, to_account_id, bucket_id, to_bucket_id, direction, description, payee, notes)
  select id, v_user_id, type, date, month, "amountCents", "accountId", "toAccountId", "bucketId", "toBucketId", direction, description, payee, notes
  from jsonb_to_recordset(coalesce(p_backup->'events', '[]'::jsonb)) as x(
    id uuid, type text, date date, month date, "amountCents" bigint,
    "accountId" uuid, "toAccountId" uuid, "bucketId" uuid, "toBucketId" uuid,
    direction text, description text, payee text, notes text
  );

  insert into recurring_plans (id, user_id, name, event_type, amount_cents, account_id, to_account_id, bucket_id, to_bucket_id, description, payee, notes, frequency, start_date, end_date, next_run, active)
  select id, v_user_id, name, "eventType", "amountCents", "accountId", "toAccountId", "bucketId", "toBucketId",
    description, payee, notes, frequency, "startDate", "endDate", "nextRun", active
  from jsonb_to_recordset(coalesce(p_backup->'recurringPlans', '[]'::jsonb)) as x(
    id uuid, name text, "eventType" text, "amountCents" bigint, "accountId" uuid, "toAccountId" uuid,
    "bucketId" uuid, "toBucketId" uuid, description text, payee text, notes text, frequency text,
    "startDate" date, "endDate" date, "nextRun" date, active boolean
  );

  insert into paycheck_templates (id, user_id, name, account_id, allocations)
  select id, v_user_id, name, "accountId", allocations
  from jsonb_to_recordset(coalesce(p_backup->'paycheckTemplates', '[]'::jsonb)) as x(
    id uuid, name text, "accountId" uuid, allocations jsonb
  );

  insert into reconciliations (id, user_id, account_id, date, statement_balance_cents, app_balance_cents, adjustment_event_id)
  select id, v_user_id, "accountId", date, "statementBalanceCents", "appBalanceCents", "adjustmentEventId"
  from jsonb_to_recordset(coalesce(p_backup->'reconciliations', '[]'::jsonb)) as x(
    id uuid, "accountId" uuid, date date, "statementBalanceCents" bigint,
    "appBalanceCents" bigint, "adjustmentEventId" uuid
  );
end;
$$;
revoke all on function restore_ledger(jsonb) from public;
grant execute on function restore_ledger(jsonb) to authenticated;
