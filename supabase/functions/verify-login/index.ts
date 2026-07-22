// Supabase Edge Function: verify-login
//
// Password verification has to happen here rather than in the browser.
// The `users` table's `password` column is not readable by the anon key
// (see supabase/security_hardening.sql) — only this function, using the
// service role key, can read and update it. The client sends the userId
// (already known to it, since it doesn't identify anyone by password) and
// the entered password; this function reports back match/no-match without
// ever returning the stored hash to the client.
//
// Deploy via CLI:   supabase functions deploy verify-login
// Deploy via browser: Dashboard -> Edge Functions -> Deploy a new function ->
//   "Via Editor" -> name it "verify-login" -> paste this whole file -> Deploy
// Either way, set the secret first:
//   CLI:     supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your service role key>
//   Browser: Dashboard -> Edge Functions -> Secrets -> Add new secret

import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
import bcrypt from 'npm:bcryptjs@3.0.3';

// Inlined (rather than imported from a shared file) so this one file can be
// pasted directly into the Supabase Dashboard's "Deploy via Editor" box.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;
const isBcryptHash = (value: string | null | undefined) => !!value && BCRYPT_HASH_PATTERN.test(value);

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, password } = await req.json();
    if (!userId || typeof password !== 'string' || !password) {
      return json({ status: 'error', message: 'userId and password are required.' }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: row, error } = await admin
      .from('users')
      .select('id, username, name, role, avatar, email, phone, address, country, joining_date, pay_rate, password')
      .eq('id', userId)
      .single();

    if (error || !row) {
      return json({ status: 'not_found' }, 404);
    }

    const safeUser = {
      id: row.id,
      username: row.username,
      name: row.name,
      role: row.role,
      avatar: row.avatar,
      email: row.email,
      phone: row.phone,
      address: row.address,
      country: row.country,
      joiningDate: row.joining_date,
      payRate: row.pay_rate,
    };

    // First-time login: no password set yet, so this attempt sets it.
    if (!row.password) {
      const hash = await bcrypt.hash(password, 10);
      const { error: updateError } = await admin.from('users').update({ password: hash }).eq('id', userId);
      if (updateError) return json({ status: 'error', message: 'Failed to set password.' }, 500);
      return json({ status: 'ok', user: safeUser });
    }

    const matches = isBcryptHash(row.password)
      ? await bcrypt.compare(password, row.password)
      : password === row.password; // legacy plaintext account

    if (!matches) {
      return json({ status: 'invalid' }, 401);
    }

    // Silently upgrade legacy plaintext passwords to a bcrypt hash.
    if (!isBcryptHash(row.password)) {
      const hash = await bcrypt.hash(password, 10);
      await admin.from('users').update({ password: hash }).eq('id', userId);
    }

    return json({ status: 'ok', user: safeUser });
  } catch (err) {
    return json({ status: 'error', message: 'Unexpected error verifying login.' }, 500);
  }
});
