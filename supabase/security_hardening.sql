-- Security hardening: stop the `password` column on public.users from being
-- readable by the browser (anon key). Run this once in the Supabase SQL
-- Editor (Dashboard -> SQL Editor -> New query -> paste -> Run).
--
-- Why: the app's anon key is embedded in the client bundle by design (that's
-- normal for Supabase), but until now `select('*')` on `users` returned the
-- password column to anyone who called the Supabase REST API directly with
-- that key - not just through this app's UI. This revokes read access to
-- that one column and adds a view for the columns that are fine to read.
--
-- This migration only touches the `users` table. It does NOT lock down
-- tasks/invoices/escalations/leave_requests - those still rely on the app's
-- own client-side role checks, which any holder of the anon key can bypass.
-- Closing that gap requires moving the app onto real Supabase Auth sessions
-- (so RLS policies can key off auth.uid()) - a larger follow-up, not a SQL
-- one-liner. Treat that as a known, separate risk for now.
--
-- After running this, the frontend MUST already be updated to read users via
-- the `users_safe` view instead of the base table (see storageService.ts) -
-- and the `verify-login` edge function MUST be deployed with the
-- SUPABASE_SERVICE_ROLE_KEY secret set, since that's the only place left
-- that can still read the password column. Deploy both together; if either
-- half is missing, login will break.

begin;

-- 1. Stop anon/authenticated (i.e. anyone using the public anon key) from
--    reading the password column directly.
revoke select (password) on public.users from anon, authenticated;

-- 2. Expose everything else through a view the app can keep reading freely.
create or replace view public.users_safe as
select
  id,
  username,
  name,
  role,
  avatar,
  email,
  phone,
  address,
  country,
  joining_date,
  pay_rate
from public.users;

grant select on public.users_safe to anon, authenticated;

-- 3. Let PostgREST pick up the new view immediately instead of waiting for
--    its next schema cache refresh.
notify pgrst, 'reload schema';

commit;
