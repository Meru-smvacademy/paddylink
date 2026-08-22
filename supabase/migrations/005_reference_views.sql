-- ============================================================================
-- 005_reference_views.sql
--
-- Makes the reference data reachable by the app.
--
-- 001 granted anon and authenticated SELECT on reference.districts / taluks /
-- varieties, but PostgREST only exposes `public` and `graphql_public`:
--
--   GET /rest/v1/districts  (Accept-Profile: reference)
--   -> 406 PGRST106 "Only the following schemas are exposed: public,
--      graphql_public"
--
-- So the grant is real at the Postgres level and useless through the API —
-- neither the anon key nor the service role can read those tables today. The
-- farmer form's district / taluk / variety dropdowns need them, and they are
-- where the missing ಚಿತ್ರದುರ್ಗ and the ಯಾದಗಿರ / ಗುಲಬರ್ಗಾ spellings get fixed.
--
-- Two ways to solve it. This is the narrower one: read-only views in public,
-- rather than adding `reference` to the exposed-schema list in the dashboard.
-- Exposing a whole schema widens the API surface permanently; three views
-- expose exactly what the dropdowns need and nothing else, which matches the
-- posture 004 just established.
--
-- These carry no personal data — district, taluk and variety names are a map
-- of Karnataka — so anon may read them, per CEO ruling.
--
-- SAFE TO RUN AS-IS. One transaction; nothing is dropped or altered.
-- ============================================================================

BEGIN;

-- ── Views ──────────────────────────────────────────────────────────────────
-- Owner-run (security_invoker defaults to false), so they do not depend on
-- the caller holding privileges inside the reference schema.

CREATE OR REPLACE VIEW public.ref_districts AS
  SELECT id, name_en, name_kn
  FROM reference.districts;

CREATE OR REPLACE VIEW public.ref_taluks AS
  SELECT id, district_id, name_en, name_kn
  FROM reference.taluks;

CREATE OR REPLACE VIEW public.ref_varieties AS
  SELECT id, name_en, name_kn
  FROM reference.varieties;

-- ── Grants ─────────────────────────────────────────────────────────────────
-- 004 revoked anon from everything in public and set a default-privileges
-- rule, so each new view needs its grant stated explicitly. That is the
-- intended behaviour: nothing in public reaches anon by accident again.

GRANT SELECT ON public.ref_districts  TO anon, authenticated;
GRANT SELECT ON public.ref_taluks     TO anon, authenticated;
GRANT SELECT ON public.ref_varieties  TO anon, authenticated;

COMMIT;

-- ============================================================================
-- After COMMIT I re-run the anon-access check, which must still report
-- "anon reads listings_browse and nothing else" for every person-bearing
-- table, plus these three reference views now readable — and I read the
-- actual district / taluk / variety rows to confirm the seed data, including
-- whether ಚಿತ್ರದುರ್ಗ is present and how ಯಾದಗಿರಿ / ಕಲಬುರಗಿ are spelled.
-- ============================================================================
