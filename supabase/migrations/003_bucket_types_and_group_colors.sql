alter table bucket_groups
  add column if not exists color text;

alter table buckets
  drop constraint if exists buckets_kind_check,
  add constraint buckets_kind_check check (
    kind in (
      'plain',
      'recurring',
      'save_by_date',
      'save_by_deposit',
      'save_until_date',
      -- Keep legacy values readable for existing installations.
      'spending',
      'savings',
      'obligation'
    )
  );
