-- ============================================================================
-- 004_rls_hardening.sql
--
-- Enforces the privacy law at the database level:
--   anon may read ONLY public.listings_browse.
--   anon must have ZERO read access to farmers, buyers, buyer_documents,
--   unlocks, audit_log, otp_log, payments, token_ledger, buyer_wallets.
--
-- This backs /privacy §3 ("A farmer's name and mobile number are not public")
-- and the farmer consent line, in the database rather than in app code alone.
--
-- 001 was well built: RLS is enabled on all 17 tables, and the sensitive
-- tables carry no anon policy, so they already deny reads. This migration
-- closes the two places anon was deliberately let in, and adds a grant-level
-- backstop so a future policy mistake cannot leak anything.
--
-- SAFE TO RUN AS-IS. Section 1 pins the view's security mode before anything
-- is revoked, so the outcome does not depend on what that mode was before.
-- Run top to bottom in the SQL editor; it is one transaction.
-- ============================================================================

BEGIN;

-- ── 1. Pin the masking boundary FIRST ──────────────────────────────────────
-- listings_browse is what makes public browsing safe: it joins public.farmers
-- for taluk but exposes no identity column at all. It must run as its owner,
-- not as the caller, so that revoking anon's access to the base tables in
-- section 3 cannot break it. Postgres already defaults to this; setting it
-- explicitly means the later REVOKE is safe whatever the current state, and a
-- future default change cannot silently flip it.
ALTER VIEW public.listings_browse SET (security_invoker = false);

-- ── 2. config: token pack PRICES must never be public ──────────────────────
-- 001 exposed token_packs, unlock and listing to anon. token_packs carries
-- rupee prices (₹199 / ₹799 / ₹1,499 … ₹11,999), which the standing marketing
-- rule keeps off every public surface — and the database was serving them to
-- anyone holding the anon key, which ships in the client bundle. The buyer
-- top-up screen still needs them, so the whitelist survives for authenticated
-- callers only.
DROP POLICY IF EXISTS config_public_read ON public.config;

CREATE POLICY config_client_read ON public.config
  FOR SELECT TO authenticated
  USING (key IN ('token_packs', 'unlock', 'listing'));

-- ── 3. listings: anon reads the masked view, never the base table ──────────
-- public.listings carries farmer_id. Anon could read it directly and
-- correlate listings to farmer rows. Public browsing goes through
-- listings_browse, which carries no identity column.
DROP POLICY IF EXISTS listings_public_read ON public.listings;

CREATE POLICY listings_authenticated_read ON public.listings
  FOR SELECT TO authenticated
  USING (status IN ('active', 'sold'));

-- ── 4. Grant-level backstop ────────────────────────────────────────────────
-- RLS already denies reads on the sensitive tables because they carry no anon
-- policy. But the SELECT grant still stands on most of them, so one careless
-- policy later would open the door. Take the privilege away entirely, then
-- hand back exactly one object.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

GRANT SELECT ON public.listings_browse TO anon;

-- ── 5. Stop future tables from inheriting anon access ──────────────────────
-- Without this, the next CREATE TABLE in public silently grants anon again.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;

-- ---------------------------------------------------------------------------
-- NOT CHANGED, and why:
--
-- reference.districts / taluks / varieties keep their anon SELECT grant, per
-- CEO ruling. They hold no personal data — a map of Karnataka is public
-- knowledge — and they feed the farmer form's dropdowns, which is where the
-- missing ಚಿತ್ರದುರ್ಗ and the ಯಾದಗಿರ / ಗುಲಬರ್ಗಾ spellings get fixed. The privacy
-- law covers person-bearing tables only, as written.
--
-- token_ledger already had anon revoked in 001 and stays that way.
-- The authenticated role's own-row policies are untouched.
-- ---------------------------------------------------------------------------

COMMIT;

-- ============================================================================
-- After COMMIT, I re-verify from the app side with the anon key and report:
--   farmers, buyers, buyer_documents, unlocks, audit_log, otp_log, payments,
--   buyer_wallets  -> must return HTTP 401 (privilege revoked), not 200
--   config         -> must return 0 rows to anon (was 3, incl. rupee prices)
--   listings       -> must return HTTP 401 to anon
--   listings_browse-> must still return HTTP 200
-- ============================================================================
