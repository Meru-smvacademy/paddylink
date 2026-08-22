-- ============================================================================
-- 009_buyer_kyc_fields.sql
--
-- Gives two required KYC fields somewhere to land.
--
-- The published /register-buyer form collects PAN and a business address, and
-- both are required. public.buyers has neither column: it has gstin and
-- apmc_license_no, and district_id / taluk_id for location, but no PAN and no
-- street address. Without these, two fields a buyer is obliged to fill would
-- be validated, accepted, and then dropped on the floor.
--
-- SAFE TO RUN AS-IS. One transaction. Adds two nullable columns; drops
-- nothing, alters no existing data.
-- ============================================================================

BEGIN;

-- ── PAN ────────────────────────────────────────────────────────────────────
-- Nullable because rows created before this migration have none, and because
-- staff-created buyers may be filled in over time. The server route requires
-- it for self-registration. The CHECK is the shape the form already enforces:
-- five letters, four digits, one letter.
ALTER TABLE public.buyers
  ADD COLUMN IF NOT EXISTS pan text;

ALTER TABLE public.buyers
  DROP CONSTRAINT IF EXISTS buyers_pan_format;
ALTER TABLE public.buyers
  ADD CONSTRAINT buyers_pan_format
  CHECK (pan IS NULL OR pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$');

COMMENT ON COLUMN public.buyers.pan IS
  'Permanent Account Number, stored uppercase. Personal/financial identifier: '
  'anon has no read path to this table, and it is never exposed in any view.';

-- ── Business address ───────────────────────────────────────────────────────
-- Free text, as the form takes it: street, taluk and pincode in one box.
-- district_id carries the structured part.
ALTER TABLE public.buyers
  ADD COLUMN IF NOT EXISTS business_address text
    CHECK (business_address IS NULL OR char_length(business_address) BETWEEN 1 AND 300);

COMMENT ON COLUMN public.buyers.business_address IS
  'Street / taluk / pincode as typed on the KYC form. The structured district '
  'lives in district_id; taluk_id stays NULL, since the form has no taluk field.';

COMMIT;

-- ============================================================================
-- After COMMIT I verify both columns exist, then register a buyer through the
-- actual UI and read the row back: buyer stored with kyc_status 'pending',
-- the certificate in the private kyc-docs bucket, and a buyer_documents row
-- pointing at it with doc_type 'gst'. Anon must still get 401 on buyers and
-- buyer_documents with a real row present.
-- ============================================================================
