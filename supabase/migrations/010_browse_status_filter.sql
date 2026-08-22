-- ============================================================================
-- 010_browse_status_filter.sql
--
-- Stops the public browse view from showing listings nobody should see.
--
-- THE BUG, found while wiring the buyer browser
-- public.listings_browse has no WHERE clause: it selects every row in
-- public.listings regardless of status. Because the view is owner-run
-- (security_invoker = false, which is what lets it join farmers safely), RLS
-- on the base table never applies to it. So 001's listings_public_read policy
-- — "anon may read listings where status IN ('active','sold')" — only ever
-- guarded direct queries against public.listings, never the view that buyers
-- actually browse.
--
-- Proven, not assumed: a listing inserted with status 'removed' came straight
-- back through listings_browse under the anon key. Draft, expired, removed
-- and flagged listings were all publicly visible.
--
-- This predates migration 004. 004 dropped the now-redundant base-table
-- policy and revoked anon's access to public.listings, which is correct, but
-- the view was already the unguarded path.
--
-- THE FIX
-- Put the status rule where it actually applies: in the view.
--
-- Expiry is included deliberately. expire_listings() flips status to
-- 'expired' on a schedule, but if that job is late an active listing past its
-- expires_at would still be browsable — and a buyer could spend a token
-- unlocking a contact for a harvest that is over. The view now enforces the
-- date itself, so a lagging cron cannot cost anyone a token.
--
-- SAFE TO RUN AS-IS. One transaction, one view redefinition. No data changes.
-- ============================================================================

BEGIN;

CREATE OR REPLACE VIEW public.listings_browse AS
  SELECT l.id, v.name_kn AS variety_kn, v.name_en AS variety_en,
         l.quantity_quintals, l.harvest_month,
         t.name_kn AS taluk_kn, t.name_en AS taluk_en,
         d.name_en AS district_en,
         l.status, l.created_at,
         l.moisture_pct, l.quality_checked_at
  FROM public.listings l
  JOIN reference.varieties v ON v.id = l.variety_id
  JOIN public.farmers f ON f.id = l.farmer_id
  LEFT JOIN reference.taluks t ON t.id = f.taluk_id
  LEFT JOIN reference.districts d ON d.id = t.district_id
  WHERE (l.status = 'active' AND l.expires_at > now())
     OR l.status = 'sold';

-- The masking boundary, restated. This view is the only object anon can read.
ALTER VIEW public.listings_browse SET (security_invoker = false);
GRANT SELECT ON public.listings_browse TO anon, authenticated;

COMMIT;

-- ============================================================================
-- After COMMIT I re-run the same test that found the bug: insert a listing
-- with status 'removed', confirm it does NOT come back through
-- listings_browse under the anon key, and delete it. Then confirm the two
-- real active listings are still browsable and the anon-access check passes.
-- ============================================================================
