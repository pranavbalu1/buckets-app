alter table buckets
  add column monthly_target_cents bigint not null default 0 check (monthly_target_cents >= 0),
  add column color text;git ad