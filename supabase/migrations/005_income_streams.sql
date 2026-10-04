create table income_streams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  amount_cents bigint not null check (amount_cents > 0),
  account_id uuid not null references accounts(id),
  next_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table income_streams enable row level security;
create policy "own rows" on income_streams for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
