-- ============================================================================
-- 002_rls_audit.sql — READ ONLY. Changes nothing. Run in the Supabase SQL
-- editor and paste the output back.
--
-- Purpose: prove, at the database level, what the anon role can actually
-- reach — before the first real row is written. PostgREST cannot query
-- pg_catalog, so this is the only way to see policies and grants directly.
--
-- The privacy law being tested (CEO):
--   anon may read ONLY public.listings_browse.
--   anon must have ZERO read access to farmers, buyers, buyer_documents,
--   unlocks, audit_log, otp_log, payments, token_ledger, buyer_wallets.
-- ============================================================================

-- 1. Is RLS actually enabled on every table? A table with RLS off and a
--    lingering grant is readable by anyone holding the anon key.
SELECT c.relname            AS table_name,
       c.relrowsecurity     AS rls_enabled,
       c.relforcerowsecurity AS rls_forced,
       CASE WHEN c.relrowsecurity THEN 'ok' ELSE '*** RLS OFF ***' END AS verdict
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relrowsecurity, c.relname;

-- 2. Every policy, and which roles it applies to. Anything naming {anon}
--    on a table other than listings/config is a finding.
SELECT tablename, policyname, cmd, roles::text AS applies_to,
       qual   AS using_clause,
       with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY (roles::text LIKE '%anon%') DESC, tablename, policyname;

-- 3. Table privileges actually granted to anon in public. Even with RLS
--    denying rows, a standing grant is one bad policy away from a leak.
SELECT table_name, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE grantee = 'anon' AND table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;

-- 4. Same for the reference schema (districts / taluks / varieties).
--    These carry no personal data and feed the form dropdowns.
SELECT table_schema, table_name,
       string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE grantee = 'anon' AND table_schema = 'reference'
GROUP BY table_schema, table_name
ORDER BY table_name;

-- 5. CRITICAL: is listings_browse security_invoker?
--    If false/unset the view runs as its owner and bypasses RLS on the base
--    tables — which is what makes the masking work, and means anon needs no
--    policy on public.listings at all.
--    If true, revoking anon's access to public.listings WOULD break browsing,
--    and migration 004 must not do it.
SELECT c.relname AS view_name,
       pg_get_userbyid(c.relowner) AS view_owner,
       COALESCE(
         (SELECT o FROM unnest(c.reloptions) o WHERE o LIKE 'security_invoker%'),
         'security_invoker not set (defaults to FALSE — runs as owner)'
       ) AS security_mode
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'v';

-- 6. What the config whitelist currently exposes to unauthenticated callers.
--    token_packs carries rupee prices; confirm which keys are reachable.
SELECT key,
       CASE WHEN key IN ('token_packs','unlock','listing')
            THEN '*** READABLE BY ANON ***' ELSE 'service role only' END AS anon_visibility
FROM public.config
ORDER BY key;

-- 7. Which reference tables exist, and their row counts — these replace the
--    hardcoded district/taluk/variety lists in the farmer form.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'reference'
ORDER BY table_name;
