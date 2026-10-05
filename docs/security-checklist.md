# Supabase security checklist

Complete these checks before publishing a deployment and after changing database policies.

- [ ] Create the single app user directly in Supabase Auth.
- [ ] Disable public email sign-ups.
- [ ] Confirm RLS is enabled on `accounts`, `bucket_groups`, `buckets`, `ledger_events`, `income_streams`, `recurring_plans`, `paycheck_templates`, and `reconciliations`.
- [ ] Confirm each table has only the intended authenticated owner policy: `user_id = auth.uid()` for reads and writes.
- [ ] Confirm database functions use caller identity and never accept a client supplied `user_id` for restored rows.
- [ ] Without a session, request `GET /rest/v1/accounts?select=id` with the anon key. It must return no account rows.
- [ ] Sign in and confirm the owner can load and change their own rows.
- [ ] Confirm the frontend and static-host environment use only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- [ ] Search tracked files, build output, and host settings to confirm no service-role key is in frontend code or exposed as a `VITE_` value. If scheduled backup is enabled, keep it only as the encrypted `SUPABASE_SERVICE_ROLE_KEY` Actions secret and restrict repository/workflow access.
- [ ] Keep JSON backups private. They include the complete personal ledger and planning data.

Example unauthenticated request:

```sh
curl -i \
  -H "apikey: YOUR_ANON_KEY" \
  "https://YOUR-PROJECT.supabase.co/rest/v1/accounts?select=id"
```

With RLS active and no matching anon policy, the normal response is HTTP 200 with an empty array. Treat any returned user data as a release blocker.
