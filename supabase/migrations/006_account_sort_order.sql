alter table accounts add column if not exists sort_order int not null default 0;

with ordered as (
  select id, row_number() over (partition by user_id order by created_at, id) - 1 as position
  from accounts
)
update accounts
set sort_order = ordered.position
from ordered
where accounts.id = ordered.id;
