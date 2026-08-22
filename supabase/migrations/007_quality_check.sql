-- ============================================================================
-- 007_quality_check.sql
--
-- Gives the quality badge something true to stand on.
--
-- The frame has three badge states, but nothing in the schema recorded a
-- quality check, so no listing could honestly show
-- "ಗುಣಮಟ್ಟ ಪರಿಶೀಲಿತ · ತೇವಾಂಶ 13.2%" and the buyer browser's
-- "ಗುಣಮಟ್ಟ ಪರಿಶೀಲಿತ ಮಾತ್ರ" toggle had nothing to filter on.
--
-- Minimal form, per CEO ruling: three columns on listings, no separate table.
-- One check per listing is the ops model; a history table can follow if it is
-- ever needed.
--
-- WRITE PATH: none in B.1-B.4. Nothing the farmer or buyer can do sets these
-- columns. They are written only by the future admin portal, through the
-- service role, when the team actually visits at harvest. Until then every
-- listing is honestly unchecked and farmer cards keep reading
-- "ಪರಿಶೀಲನೆ ಬಾಕಿ — ಕೊಯ್ಲಿನ ಸಮಯದಲ್ಲಿ ನಮ್ಮ ತಂಡ ಬರುತ್ತದೆ", which is exactly the
-- promise the listing form makes.
--
-- SAFE TO RUN AS-IS. One transaction. Adds three nullable columns and widens
-- one view; drops nothing, alters no existing data.
-- ============================================================================

BEGIN;

-- ── 1. The three columns ───────────────────────────────────────────────────
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS moisture_pct numeric(4,1)
    CHECK (moisture_pct IS NULL OR (moisture_pct >= 0 AND moisture_pct <= 100)),
  ADD COLUMN IF NOT EXISTS quality_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS quality_checked_by text;

-- A moisture reading with no check behind it would be a number from nowhere.
ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_moisture_needs_check;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_moisture_needs_check
  CHECK (moisture_pct IS NULL OR quality_checked_at IS NOT NULL);

COMMENT ON COLUMN public.listings.quality_checked_at IS
  'Set when PaddyLink staff physically checked the crop. NULL means unchecked, '
  'which is what the farmer card and the buyer badge both report. This column '
  'is the single source of truth for "verified".';
COMMENT ON COLUMN public.listings.quality_checked_by IS
  'Who performed the check. Deliberately NOT exposed in listings_browse — it '
  'identifies staff, and the public view carries no identities.';

-- Buyers filter on "checked only", so make that filter cheap while the
-- listing is live.
CREATE INDEX IF NOT EXISTS idx_listings_quality
  ON public.listings (quality_checked_at)
  WHERE status = 'active';

-- ── 2. Widen the masked public view ────────────────────────────────────────
-- CREATE OR REPLACE keeps the view's grants and options, and permits new
-- columns only at the end — which is why moisture_pct and quality_checked_at
-- are appended rather than slotted in beside status.
--
-- quality_checked_by is NOT exposed: it names a member of staff, and this view
-- is the one thing anon can read.
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
  LEFT JOIN reference.districts d ON d.id = t.district_id;

-- ── 3. Re-assert what the privacy model depends on ─────────────────────────
-- Both of these should survive a CREATE OR REPLACE, but this view is the only
-- object anon can read and the masking boundary of the whole system. Stating
-- them again costs nothing and removes the doubt.
ALTER VIEW public.listings_browse SET (security_invoker = false);
GRANT SELECT ON public.listings_browse TO anon, authenticated;

COMMIT;

-- ============================================================================
-- After COMMIT I re-run the anon-access check (the person-bearing tables must
-- still be 401 and listings_browse still readable), confirm the two new
-- columns appear in the view while quality_checked_by does not, and confirm
-- both existing listings read as unchecked.
-- ============================================================================
