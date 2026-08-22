-- ============================================================================
-- 006_listing_fields.sql
--
-- Closes the three gaps between the CEO's redesigned farmer form and the
-- schema, so Step B.1 can wire the form to real tables:
--
--   1. listings.variety_other  — the farmer's own words when ಇತರೆ / Other is
--                                chosen, without breaking the variety_id FK.
--   2. listings.photo_path     — the optional crop photo, private bucket.
--   3. ಜ್ಯೋತಿ / Jyothi seeded   — a common belt variety that belonged in the
--                                list rather than in Other.
--
-- SAFE TO RUN AS-IS. One transaction. Adds two nullable columns and one
-- reference row; drops nothing, alters no existing data.
-- ============================================================================

BEGIN;

-- ── 1. Free-text variety, for ಇತರೆ / Other only ────────────────────────────
-- variety_id stays NOT NULL and keeps pointing at reference.varieties, so
-- browse, filtering and indexes are unaffected. When the farmer picks
-- ಇತರೆ / Other, his own words are kept here alongside it.
--
-- The "only alongside Other" rule is enforced in the server route, not by a
-- CHECK: a CHECK cannot look up which id ಇತರೆ currently has. The length cap
-- below is the database's own guard against an unbounded free-text field.
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS variety_other text
    CHECK (variety_other IS NULL OR char_length(variety_other) BETWEEN 1 AND 60);

COMMENT ON COLUMN public.listings.variety_other IS
  'Farmer''s own variety name, set only when variety_id points at ಇತರೆ / Other. '
  'Deliberately NOT exposed in listings_browse — see the note at the end of 006.';

-- ── 2. Crop photo ──────────────────────────────────────────────────────────
-- Path within the private listing-photos bucket, same pattern as
-- buyer_documents.storage_path: never a public URL, signed URLs only when the
-- time comes to show it. Optional, as the form has it.
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS photo_path text;

COMMENT ON COLUMN public.listings.photo_path IS
  'Object path in the private listing-photos bucket. Signed URLs only; never public.';

-- ── 3. Seed ಜ್ಯೋತಿ / Jyothi ────────────────────────────────────────────────
-- Idempotent: name_en is UNIQUE, so re-running changes nothing.
INSERT INTO reference.varieties (name_en, name_kn)
VALUES ('Jyothi', 'ಜ್ಯೋತಿ')
ON CONFLICT (name_en) DO NOTHING;

COMMIT;

-- ============================================================================
-- NOTES FOR THE APP SIDE — no SQL, just what follows from the above.
--
-- a) ಇತರೆ / Other is no longer the highest id. It was id 7; Jyothi takes id 8.
--    The form must pin ಇತರೆ last explicitly rather than ordering by id, and
--    the placeholder examples must name only seeded varieties — so
--    "ಜ್ಯೋತಿ" is now fair game and "ಸಾಂಬಾ" is not.
--
-- b) listings_browse is deliberately NOT changed to show variety_other.
--    A buyer would see "ಇತರೆ" rather than the farmer's words, which is worse
--    for browsing — but variety_other is farmer-typed text on a PUBLIC view,
--    and a farmer who types his mobile number into it would publish his own
--    contact and walk straight past the unlock mechanic that /privacy §3 and
--    the consent line promise. The masked view stays free of free text.
--    The intended fix is operational: staff normalise variety_other into a
--    real reference variety during the quality check.
--
-- c) Bucket to create in the dashboard, to match photo_path:
--       name: listing-photos    public: NO    file size limit: 10 MB
--       allowed MIME types: image/jpeg, image/png
--    The farmer form already enforces 10 MB and .jpg/.jpeg/.png client-side;
--    the server route will enforce both again before upload.
-- ============================================================================
