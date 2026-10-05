-- Transactions can use a custom user-defined label alongside their built-in ledger type.
alter table ledger_events add column custom_type text;
alter table ledger_events add constraint ledger_events_custom_type_check
  check (custom_type is null or length(btrim(custom_type)) between 1 and 40);

-- Keep the v7 atomic restore routine for replacing ledger data, then restore labels
-- from the same backup payload. Missing labels in older v1 backups remain null.
alter function restore_ledger(jsonb) rename to restore_ledger_v7;

create function restore_ledger(p_backup jsonb) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  perform restore_ledger_v7(p_backup);

  update ledger_events as event
  set custom_type = imported."customType"
  from jsonb_to_recordset(coalesce(p_backup->'events', '[]'::jsonb)) as imported(
    id uuid, "customType" text
  )
  where event.id = imported.id and event.user_id = v_user_id;
end;
$$;

revoke all on function restore_ledger(jsonb) from public;
grant execute on function restore_ledger(jsonb) to authenticated;
