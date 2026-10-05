-- RLS protects rows, but ordinary foreign keys only verify that a referenced
-- UUID exists. Scope every relationship to the owning user as well.
-- Deferred checks preserve atomic auth-user deletion and multi-row restore flows.

create unique index if not exists accounts_user_id_id_unique
  on public.accounts (user_id, id);
create unique index if not exists bucket_groups_user_id_id_unique
  on public.bucket_groups (user_id, id);
create unique index if not exists buckets_user_id_id_unique
  on public.buckets (user_id, id);
create unique index if not exists ledger_events_user_id_id_unique
  on public.ledger_events (user_id, id);

alter table public.buckets
  drop constraint if exists buckets_group_id_fkey,
  add constraint buckets_group_owner_fkey
    foreign key (user_id, group_id)
    references public.bucket_groups (user_id, id)
    on delete set null (group_id)
    deferrable initially deferred;

alter table public.ledger_events
  drop constraint if exists ledger_events_account_id_fkey,
  drop constraint if exists ledger_events_to_account_id_fkey,
  drop constraint if exists ledger_events_bucket_id_fkey,
  drop constraint if exists ledger_events_to_bucket_id_fkey,
  add constraint ledger_events_account_owner_fkey
    foreign key (user_id, account_id)
    references public.accounts (user_id, id)
    deferrable initially deferred,
  add constraint ledger_events_to_account_owner_fkey
    foreign key (user_id, to_account_id)
    references public.accounts (user_id, id)
    deferrable initially deferred,
  add constraint ledger_events_bucket_owner_fkey
    foreign key (user_id, bucket_id)
    references public.buckets (user_id, id)
    deferrable initially deferred,
  add constraint ledger_events_to_bucket_owner_fkey
    foreign key (user_id, to_bucket_id)
    references public.buckets (user_id, id)
    deferrable initially deferred;

alter table public.income_streams
  drop constraint if exists income_streams_account_id_fkey,
  add constraint income_streams_account_owner_fkey
    foreign key (user_id, account_id)
    references public.accounts (user_id, id)
    deferrable initially deferred;

alter table public.recurring_plans
  drop constraint if exists recurring_plans_account_id_fkey,
  drop constraint if exists recurring_plans_to_account_id_fkey,
  drop constraint if exists recurring_plans_bucket_id_fkey,
  drop constraint if exists recurring_plans_to_bucket_id_fkey,
  add constraint recurring_plans_account_owner_fkey
    foreign key (user_id, account_id)
    references public.accounts (user_id, id)
    deferrable initially deferred,
  add constraint recurring_plans_to_account_owner_fkey
    foreign key (user_id, to_account_id)
    references public.accounts (user_id, id)
    deferrable initially deferred,
  add constraint recurring_plans_bucket_owner_fkey
    foreign key (user_id, bucket_id)
    references public.buckets (user_id, id)
    deferrable initially deferred,
  add constraint recurring_plans_to_bucket_owner_fkey
    foreign key (user_id, to_bucket_id)
    references public.buckets (user_id, id)
    deferrable initially deferred;

alter table public.paycheck_templates
  drop constraint if exists paycheck_templates_account_id_fkey,
  add constraint paycheck_templates_account_owner_fkey
    foreign key (user_id, account_id)
    references public.accounts (user_id, id)
    deferrable initially deferred;

alter table public.reconciliations
  drop constraint if exists reconciliations_account_id_fkey,
  drop constraint if exists reconciliations_adjustment_event_id_fkey,
  add constraint reconciliations_account_owner_fkey
    foreign key (user_id, account_id)
    references public.accounts (user_id, id)
    deferrable initially deferred,
  add constraint reconciliations_adjustment_event_owner_fkey
    foreign key (user_id, adjustment_event_id)
    references public.ledger_events (user_id, id)
    on delete set null (adjustment_event_id)
    deferrable initially deferred;
