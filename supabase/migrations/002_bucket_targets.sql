alter table buckets
  add column if not exists monthly_target_cents bigint not null default 0,
  add column if not exists color text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'buckets_monthly_target_cents_check'
      and conrelid = 'buckets'::regclass
  ) then
    alter table buckets
      add constraint buckets_monthly_target_cents_check check (monthly_target_cents >= 0);
  end if;
end $$;