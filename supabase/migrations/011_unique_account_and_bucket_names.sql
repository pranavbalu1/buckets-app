create unique index accounts_user_name_unique
  on accounts (user_id, lower(btrim(name)));

create unique index buckets_user_name_unique
  on buckets (user_id, lower(btrim(name)));
