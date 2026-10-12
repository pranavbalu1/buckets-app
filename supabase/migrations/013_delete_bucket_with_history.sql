-- Permanently remove one of the signed-in user's buckets and all records that
-- require that bucket to exist. This runs atomically and never affects another
-- user's data or their Supabase Auth account.
--
-- The client calls this function instead of deleting from buckets directly
-- because bucket history is intentionally retained by normal delete behavior.
-- The explicit cleanup below makes permanent deletion an opt-in operation and
-- keeps dependent JSON paycheck-template allocations valid.
create or replace function public.delete_user_bucket(p_bucket_id uuid) returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  perform 1
  from public.buckets
  where user_id = v_user_id and id = p_bucket_id
  for update;

  if not found then
    raise exception 'Bucket not found';
  end if;

  delete from public.recurring_plans
  where user_id = v_user_id
    and (bucket_id = p_bucket_id or to_bucket_id = p_bucket_id);

  -- Ledger events are the source of truth for balances, so events referencing
  -- the deleted bucket must be removed in the same transaction.
  delete from public.ledger_events
  where user_id = v_user_id
    and (bucket_id = p_bucket_id or to_bucket_id = p_bucket_id);

  -- Paycheck templates store bucket references inside JSON rather than a
  -- relational foreign key. Remove only the matching allocation and preserve
  -- the order of every remaining allocation.
  update public.paycheck_templates as template
  set allocations = coalesce((
    select jsonb_agg(allocation.value order by allocation.ordinality)
    from jsonb_array_elements(template.allocations)
      with ordinality as allocation(value, ordinality)
    where allocation.value->>'bucketId' is distinct from p_bucket_id::text
  ), '[]'::jsonb),
  updated_at = now()
  where template.user_id = v_user_id
    and exists (
      select 1
      from jsonb_array_elements(template.allocations) as allocation(value)
      where allocation.value->>'bucketId' = p_bucket_id::text
    );

  -- The earlier deletes must finish before the bucket itself is removed.
  delete from public.buckets
  where user_id = v_user_id and id = p_bucket_id;
end;
$$;

revoke all on function public.delete_user_bucket(uuid) from public;
grant execute on function public.delete_user_bucket(uuid) to authenticated;
