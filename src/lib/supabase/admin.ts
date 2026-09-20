import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client. SERVER ONLY.
 *
 * The `server-only` import above is a build-time guard: if this module is ever
 * pulled into a Client Component, the build fails rather than shipping the
 * service-role key to a browser. Do not remove it, and do not import this
 * file from anything marked 'use client'.
 *
 * TEMP-PRE-AUTH — CEO-approved architecture ruling, now half retired. OTP is
 * live: farmers and buyers are identified by a signed session token that only
 * /api/otp/verify can mint, so WHO is making a request is no longer a guess.
 * What has not changed is HOW the request runs — every write still goes
 * through a Next.js server route using this client, RLS is bypassed on those
 * paths, and the route handler IS the security boundary: nothing may be
 * trusted from the request body without validation.
 *
 * What is left before these move behind authenticated RLS is auth.users rows
 * for farmers and buyers, so that auth.uid() resolves and the policies 001,
 * 004 and 011 already wrote start doing the gating. That is a separate piece
 * of work from OTP, and until it lands this client should survive only for
 * genuine admin work. Every caller is marked TEMP-PRE-AUTH so they stay
 * findable.
 *
 * Public listing reads do not belong here — they use the anon client.
 */

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL. Set it in .env.local (see .env.example).');
  }

  if (!serviceKey || serviceKey === 'YOUR-SERVICE-ROLE-KEY') {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Copy it from the Supabase dashboard ' +
        '(Project Settings -> API -> service_role) into .env.local. It must never ' +
        'be committed or exposed to the browser.',
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      // No session to persist or refresh: this client is used per-request on
      // the server and must never write auth state to storage.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
