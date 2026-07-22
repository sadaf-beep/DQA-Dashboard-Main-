# Security hardening — Jul 2026

This closes the biggest issue found in review: the `users` table's
`password` column was readable by anyone holding the Supabase anon key
(which is embedded in the client bundle by design), and passwords were
stored and compared in plain text. That meant every teammate's real
password — plus phone/address/pay rate sitting in the same row — could be
pulled straight off the Supabase REST API by anyone, without ever opening
the app.

## What's fixed in this code (no action needed beyond a normal deploy)

- **Passwords are now hashed with bcrypt** before they're ever written to
  the database (`services/passwordService.ts`). Sign-up, first-time login,
  and password reset all hash before saving.
- **Legacy plaintext passwords upgrade automatically.** Anyone who logs in
  successfully with an old plaintext password has it silently re-saved as a
  bcrypt hash — no forced reset, no user-visible change.
- **`ProfileSettings` no longer pre-fills the password field with the
  stored value.** It used to load the real password into form state on
  every visit; now the field starts blank and is only touched if the user
  types a new password.

## What you need to run yourself (can't be done from here)

I don't have credentials to your live Supabase project (no service-role
key, no dashboard/CLI access), and this is a live production database used
by your team — so these two steps need to be done by someone with access,
**together, in the same deploy**:

1. **Run `supabase/security_hardening.sql`** in the Supabase Dashboard →
   SQL Editor. It revokes read access to the `password` column from the
   anon/authenticated roles and adds a `users_safe` view (all columns
   except `password`) for the app to read from instead.
2. **Deploy the `verify-login` edge function** and set its secret:
   ```
   supabase functions deploy verify-login
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your service role key>
   ```
   This function is the only thing left that can read the password column
   (via the service-role key, server-side) — it's what login now calls to
   check a password instead of comparing it in the browser.

**Deploy order matters:** the frontend code in this branch already expects
both of these to exist. If you deploy the frontend without doing steps 1–2,
or do the SQL step without deploying the function, **login will break** for
everyone. Do all three (frontend + SQL + function) in the same release.

## Known risks *not* fixed by this pass

I scoped this pass to the password/credential leak specifically. Still
open, roughly in order of severity:

- **No real per-user access control.** The app doesn't use Supabase Auth
  sessions — every browser uses the same anon key regardless of who's
  "logged in" at the app level. Role checks (agent vs. manager) are
  enforced only in the UI; anyone who opens dev tools and calls the
  Supabase REST API directly with the anon key can read/write any row in
  `tasks`, `invoices`, `escalations`, `leave_requests`, and non-password
  columns of `users` (including phone, address, and pay rate) — and could
  set their own `role` to `MANAGER`. Fixing this properly means moving to
  real Supabase Auth so RLS policies can key off `auth.uid()` — a larger
  migration, not a quick patch.
- **Gemini API key is bundled into the client** (`vite.config.ts` →
  `process.env.API_KEY`). Anyone can view-source the deployed site and lift
  it to burn your quota.
- **Slack webhook URL** lives in `localStorage` and is posted to directly
  from the browser — extractable/spoofable via dev tools.
- **Password reset is phone-number match only**, no OTP — someone who
  knows or guesses a teammate's phone number can reset their password.

Happy to take on the Gemini/Slack exposure next (same fix shape: move both
behind edge functions), or start the bigger Supabase Auth migration if
you'd rather close the access-control gap first — let me know which.
