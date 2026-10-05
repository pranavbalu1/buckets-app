-- Clear the signed-in user's application data while leaving their Supabase Auth
-- account and credentials untouched. The RPC runs atomically as the caller.
create function clear_user_finance_data() returns void
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

  delete from reconciliations where user_id = v_user_id;
  delete from paycheck_templates where user_id = v_user_id;
  delete from recurring_plans where user_id = v_user_id;
  delete from income_streams where user_id = v_user_id;
  delete from ledger_events where user_id = v_user_id;
  delete from buckets where user_id = v_user_id;
  delete from bucket_groups where user_id = v_user_id;
  delete from accounts where user_id = v_user_id;
end;
$$;

revoke all on function clear_user_finance_data() from public;
grant execute on function clear_user_finance_data() to authenticated;
