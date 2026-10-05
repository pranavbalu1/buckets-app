do $$
declare
  item record;
  candidate text;
  suffix integer;
begin
  for item in
    select id, user_id, name
    from (
      select id, user_id, name,
        row_number() over (
          partition by user_id, lower(btrim(name))
          order by created_at, id
        ) as duplicate_number
      from accounts
    ) ranked
    where duplicate_number > 1
  loop
    suffix := 2;
    candidate := btrim(item.name) || ' (' || suffix || ')';
    while exists (
      select 1
      from accounts
      where user_id = item.user_id
        and lower(btrim(name)) = lower(candidate)
    ) loop
      suffix := suffix + 1;
      candidate := btrim(item.name) || ' (' || suffix || ')';
    end loop;
    update accounts set name = candidate where id = item.id;
  end loop;

  for item in
    select id, user_id, name
    from (
      select id, user_id, name,
        row_number() over (
          partition by user_id, lower(btrim(name))
          order by created_at, id
        ) as duplicate_number
      from buckets
    ) ranked
    where duplicate_number > 1
  loop
    suffix := 2;
    candidate := btrim(item.name) || ' (' || suffix || ')';
    while exists (
      select 1
      from buckets
      where user_id = item.user_id
        and lower(btrim(name)) = lower(candidate)
    ) loop
      suffix := suffix + 1;
      candidate := btrim(item.name) || ' (' || suffix || ')';
    end loop;
    update buckets set name = candidate where id = item.id;
  end loop;
end $$;

create unique index if not exists accounts_user_name_unique
  on accounts (user_id, lower(btrim(name)));

create unique index if not exists buckets_user_name_unique
  on buckets (user_id, lower(btrim(name)));
