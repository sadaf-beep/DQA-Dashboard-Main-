-- Sets up Supabase Storage for invoice PDFs/CSVs, replacing the old
-- approach of stuffing base64 file content into the invoices table.
--
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor ->
-- New query -> paste -> Run). Alternatively, you can create the bucket via
-- Dashboard -> Storage -> New bucket (name it exactly "invoice-files",
-- leave it Private) and just run the three `create policy` statements
-- below - either way works, just don't skip the policies, since without
-- them the anon key can't upload or read anything in the bucket.
--
-- Note on access: like the rest of this app today, these policies grant
-- access to anyone holding the public anon key, not just the "logged in"
-- user in the app's own UI - the app doesn't yet have real per-user
-- identity at the database level (see SECURITY.md, "no real per-user
-- access control"). This isn't a regression - it's the same access model
-- already in place for every other table - just noting it so it's not
-- mistaken for per-user file security.

begin;

-- Create the bucket if it doesn't already exist. Private: files are only
-- reachable through an authenticated Storage API call (what the app does),
-- not via a guessable public URL.
insert into storage.buckets (id, name, public)
values ('invoice-files', 'invoice-files', false)
on conflict (id) do nothing;

create policy "invoice-files: upload"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'invoice-files');

create policy "invoice-files: read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'invoice-files');

create policy "invoice-files: update"
on storage.objects for update
to anon, authenticated
using (bucket_id = 'invoice-files');

commit;
