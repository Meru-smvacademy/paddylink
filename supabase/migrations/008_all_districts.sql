-- ============================================================================
-- 008_all_districts.sql
--
-- Lets buyers register from anywhere in Karnataka, without widening where
-- farmers may list.
--
-- THE PROBLEM
-- buyers.district_id references reference.districts, which holds the three
-- districts PaddyLink operates in. But a buyer's district is his business
-- address, not our operating scope: a rice mill in Bengaluru or a trader in
-- Davanagere is exactly who we want buying from Raichur. With only three rows
-- to point at, 28 of the 31 districts on the KYC form could not be stored at
-- all — they would silently land as NULL.
--
-- Restricting the buyer form to three districts would be the wrong fix: it
-- would turn away legitimate buyers. Seeding all 31 without a flag would be
-- the other wrong fix: the farmer form would offer districts we cannot visit,
-- breaking the promise "ಕಟಾವಿನ ಸಮಯದಲ್ಲಿ ನಮ್ಮ ತಂಡ ಬರುತ್ತದೆ" that the CEO's
-- three-district ruling was built on.
--
-- THE FIX
-- Seed all 31 districts, and mark which ones we operate in. The farmer form
-- filters on that flag and still offers exactly three; the buyer form offers
-- all 31. One list, two honest views of it.
--
-- SAFE TO RUN AS-IS. One transaction. Adds one column, seeds 28 rows,
-- widens one view. Existing rows and their ids are untouched, so no foreign
-- key moves.
-- ============================================================================

BEGIN;

-- ── 1. The flag ────────────────────────────────────────────────────────────
-- Defaults to false so a newly seeded district is never accidentally offered
-- to farmers; operating scope is something ops turns on deliberately.
ALTER TABLE reference.districts
  ADD COLUMN IF NOT EXISTS is_operational boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN reference.districts.is_operational IS
  'True where PaddyLink staff can actually visit at harvest. The farmer '
  'listing form offers only these; the buyer KYC form offers every district, '
  'because a buyer''s address is not our operating scope.';

-- The three we operate in today. Named, not assumed by id.
UPDATE reference.districts
  SET is_operational = true
  WHERE name_en IN ('Raichur', 'Koppal', 'Yadgir');

-- ── 2. The other 28 ────────────────────────────────────────────────────────
-- name_en is UNIQUE, so re-running changes nothing and the three existing
-- rows keep their ids.
INSERT INTO reference.districts (name_en, name_kn) VALUES
  ('Bagalkote',      'ಬಾಗಲಕೋಟೆ'),
  ('Ballari',        'ಬಳ್ಳಾರಿ'),
  ('Belagavi',       'ಬೆಳಗಾವಿ'),
  ('Bengaluru Rural','ಬೆಂಗಳೂರು ಗ್ರಾಮಾಂತರ'),
  ('Bengaluru Urban','ಬೆಂಗಳೂರು ನಗರ'),
  ('Bidar',          'ಬೀದರ್'),
  ('Chamarajanagara','ಚಾಮರಾಜನಗರ'),
  ('Chikkaballapura','ಚಿಕ್ಕಬಳ್ಳಾಪುರ'),
  ('Chikkamagaluru', 'ಚಿಕ್ಕಮಗಳೂರು'),
  ('Chitradurga',    'ಚಿತ್ರದುರ್ಗ'),
  ('Dakshina Kannada','ದಕ್ಷಿಣ ಕನ್ನಡ'),
  ('Davanagere',     'ದಾವಣಗೆರೆ'),
  ('Dharwad',        'ಧಾರವಾಡ'),
  ('Gadag',          'ಗದಗ'),
  ('Hassan',         'ಹಾಸನ'),
  ('Haveri',         'ಹಾವೇರಿ'),
  ('Kalaburagi',     'ಕಲಬುರಗಿ'),
  ('Kodagu',         'ಕೊಡಗು'),
  ('Kolar',          'ಕೋಲಾರ'),
  ('Mandya',         'ಮಂಡ್ಯ'),
  ('Mysuru',         'ಮೈಸೂರು'),
  ('Ramanagara',     'ರಾಮನಗರ'),
  ('Shivamogga',     'ಶಿವಮೊಗ್ಗ'),
  ('Tumakuru',       'ತುಮಕೂರು'),
  ('Udupi',          'ಉಡುಪಿ'),
  ('Uttara Kannada', 'ಉತ್ತರ ಕನ್ನಡ'),
  ('Vijayanagara',   'ವಿಜಯನಗರ'),
  ('Vijayapura',     'ವಿಜಯಪುರ')
ON CONFLICT (name_en) DO NOTHING;

-- ── 3. Expose the flag ─────────────────────────────────────────────────────
-- Appended at the end: CREATE OR REPLACE VIEW permits new columns only there.
CREATE OR REPLACE VIEW public.ref_districts AS
  SELECT id, name_en, name_kn, is_operational
  FROM reference.districts;

GRANT SELECT ON public.ref_districts TO anon, authenticated;

COMMIT;

-- ============================================================================
-- After COMMIT I verify: 31 districts present, exactly three flagged
-- operational, ಚಿತ್ರದುರ್ಗ among the new ones, the three original ids unchanged
-- so no listing moved, the farmer form still offering only three, and the
-- anon-access check still passing.
--
-- Taluks are NOT seeded for the 28 new districts. Nothing needs them: the
-- farmer form only reaches operational districts, and the buyer KYC form has
-- no taluk field — it takes a free-text business address. buyers.taluk_id
-- stays NULL until there is a reason to fill it.
-- ============================================================================
