-- Delete an account and all account-specific records atomically. This is
-- exposed only to the authenticated owner and called from the account UI.
create or replace function public.delete_account(p_account_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  perform 1
  from public.accounts
  where id = p_account_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Account not found';
  end if;

  -- Remove dependent planning and reconciliation records before ledger rows.
  delete from public.reconciliations
  where user_id = v_user_id and account_id = p_account_id;

  delete from public.income_streams
  where user_id = v_user_id and account_id = p_account_id;

  delete from public.recurring_plans
  where user_id = v_user_id
    and (account_id = p_account_id or to_account_id = p_account_id);

  delete from public.paycheck_templates
  where user_id = v_user_id and account_id = p_account_id;

  -- A transfer is one event, so remove it if either side uses this account.
  delete from public.ledger_events
  where user_id = v_user_id
    and (account_id = p_account_id or to_account_id = p_account_id);

  delete from public.accounts
  where id = p_account_id and user_id = v_user_id;
end;
$$;

revoke all on function public.delete_account(uuid) from public, anon;
grant execute on function public.delete_account(uuid) to authenticated;
