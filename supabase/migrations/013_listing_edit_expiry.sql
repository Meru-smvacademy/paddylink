-- ============================================================================
-- 013_listing_edit_expiry.sql
--
-- Keeps expires_at true once harvest_month can change.
--
-- THE PROBLEM THIS CLOSES
-- 001 derives expires_at from harvest_month in listing_before_insert():
--
--   expires_at := last day of harvest_month + config listing.ttl_days
--
-- and that trigger fires on INSERT only, because until now harvest_month
-- could only ever be set once. The farmer edit screen makes it editable, and
-- without this migration a farmer who corrects October to December would keep
-- an October expiry: expire_listings() would flip his listing to 'expired'
-- weeks before the harvest he just told us about, and it would vanish from
-- listings_browse (010) while the paddy was still coming. He would have made
-- his listing worse by fixing it.
--
-- WHY A TRIGGER AND NOT THE ROUTE
-- The derivation already exists, in SQL, in listing_before_insert(). Writing
-- it a second time in TypeScript would be two copies of one rule, and the
-- first time config listing.ttl_days changed they would disagree. The rule
-- stays in one place and the UPDATE path is taught to use it.
--
-- DELIBERATELY NARROW. The trigger does nothing unless harvest_month actually
-- changes, so every other UPDATE on listings is untouched:
--   - mark_listing_sold() / reactivate_listing() (011) change status only,
--   - the admin quality desk (007) writes the quality columns only,
--   - expire_listings() writes status only.
-- None of them move harvest_month, so none of them get a new expiry.
--
-- It also does NOT extend a listing's life on its own: the expiry is
-- recomputed from whatever harvest month is now recorded, by the same formula
-- as on the day it was created. Editing is not a renewal mechanism.
--
-- SAFE TO RUN AS-IS. One transaction. Adds one function and one trigger;
-- drops nothing, alters no existing row.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.listing_before_update() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
  -- IS DISTINCT FROM, not <>, so a NULL on either side behaves.
  IF NEW.harvest_month IS DISTINCT FROM OLD.harvest_month THEN
    -- Same two lines as listing_before_insert(), and for the same reasons:
    -- the month is normalised to its first day, and the expiry is the last
    -- day of that month plus the configured TTL.
    NEW.harvest_month := date_trunc('month', NEW.harvest_month)::date;
    NEW.expires_at := (
      date_trunc('month', NEW.harvest_month) + interval '1 month' - interval '1 day'
      + make_interval(days => COALESCE((public.cfg('listing')->>'ttl_days')::int, 30))
    )::timestamptz;
  END IF;
  RETURN NEW;
END $fn$;

COMMENT ON FUNCTION public.listing_before_update() IS
  'Recomputes expires_at when harvest_month changes, by the same formula '
  'listing_before_insert() uses. No-op for every other UPDATE on listings.';

DROP TRIGGER IF EXISTS trg_listing_upd ON public.listings;
CREATE TRIGGER trg_listing_upd BEFORE UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.listing_before_update();

COMMIT;

-- ============================================================================
-- After COMMIT, verified rather than assumed:
--
--   1. Moving a listing's harvest_month forward moves expires_at with it, to
--      the same date a listing created with that month would have got.
--   2. Moving it backward moves expires_at back — editing cannot be used to
--      extend a listing indefinitely.
--   3. A mid-month date is normalised to the first of the month, as on insert.
--   4. An UPDATE that does not touch harvest_month leaves expires_at exactly
--      as it was: the sold toggle, the quality desk and expire_listings() all
--      behave as before.
-- ============================================================================
