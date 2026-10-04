-- Accounts: where money physically is
create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('checking','savings','cash','credit_card','other')),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bucket groups: major categories (Food, Transportation...) used for Sankey levels
create table bucket_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Buckets: what money is for
create table buckets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  group_id uuid references bucket_groups(id) on delete set null,
  name text not null,
  kind text not null default 'spending' check (kind in ('spending','savings','obligation')),
  sort_order int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ledger: the single source of truth. Balances are DERIVED from this.
create table ledger_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in
    ('income','allocation','expense','account_transfer','bucket_move','adjustment')),
  date date not null,
  month date,                               -- first day of month; used by allocations
  amount_cents bigint not null check (amount_cents > 0),
  account_id uuid references accounts(id),
  to_account_id uuid references accounts(id),
  bucket_id uuid references buckets(id),
  to_bucket_id uuid references buckets(id),
  direction text check (direction in ('in','out')),  -- adjustments only
  description text not null default '',
  payee text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shape_by_type check (
    case type
      when 'income'           then account_id is not null and bucket_id is null
      when 'allocation'       then bucket_id is not null and month is not null
      when 'expense'          then account_id is not null and bucket_id is not null
      when 'account_transfer' then account_id is not null and to_account_id is not null
                                   and account_id <> to_account_id
      when 'bucket_move'      then bucket_id is not null and to_bucket_id is not null
                                   and bucket_id <> to_bucket_id
      when 'adjustment'       then account_id is not null and direction is not null
    end
  )
);

create index on ledger_events (user_id, date);
create index on ledger_events (user_id, type);

-- Row Level Security: each table only exposes rows owned by the logged-in user
alter table accounts      enable row level security;
alter table bucket_groups enable row level security;
alter table buckets       enable row level security;
alter table ledger_events enable row level security;

create policy "own rows" on accounts      for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on bucket_groups for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on buckets       for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on ledger_events for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));