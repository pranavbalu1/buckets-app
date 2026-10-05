alter table buckets
  add column if not exists target_cents bigint,
  add column if not exists target_date date;
