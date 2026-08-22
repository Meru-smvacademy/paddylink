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
 * TEMP-PRE-AUTH — CEO-approved architecture ruling. Real OTP auth is not live
 * yet (MSG91/DLT pending), so every write goes through a Next.js server route
 * using this client, with strict server-side validation at the route. That
 * means RLS is bypassed on those paths and the route handler IS the security
 * boundary: nothing may be trusted from the request body without validation.
 *
 * When real OTP lands, these writes get re-pointed through authenticated RLS
 * flows and this client should survive only for genuine admin work. Every
 * caller is marked TEMP-PRE-AUTH so they are findable then.
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
