-- ============================================================================
-- 011_listing_sold_toggle.sql
--
-- The farmer's "ಮಾರಾಟವಾಗಿದೆ" toggle, and the 12-hour token re-credit that has
-- to be honest about it.
--
-- WHAT THIS ADDS
--   1. listings.sold_at / listings.reactivated_at — when the farmer said so.
--   2. public.unlock_recredits — one audit row per re-credited unlock, with a
--      UNIQUE(unlock_id) that is the whole mint-guard (see below).
--   3. mark_listing_sold() / reactivate_listing() — the two writes, atomic,
--      ownership-checked, service-role only.
--   4. listings_browse stops carrying sold listings.
--   5. public.listings_sold — ids only, so a buyer's own unlock history can
--      still be tagged after the listing leaves the market.
--
-- WHY status IS NOT A NEW COLUMN
-- The brief says "add the status field via a migration; do not overload an
-- existing column with a new meaning." public.listings.status already carries
-- 'sold' in its CHECK constraint from 001, the farmer page already renders it
-- (farmerListings.ts VISIBLE_STATUSES), listings_browse already reads it, and
-- file_dispute() already tests it for the already_sold auto-refund. Using it
-- is not overloading — the meaning is the one it was given on day one. A
-- second boolean beside it would be a second source of truth for the same
-- fact, and the first time the two disagreed a sold listing would go back on
-- the market. What genuinely did not exist is the timestamps, and those are
-- what this migration adds.
--
-- THE MINT-GUARD, stated plainly
-- A farmer who could flip sold -> active -> sold and re-credit the same
-- unlock twice would be minting tokens. Three things stop that, and the first
-- alone is sufficient:
--
--   a) unlock_recredits.unlock_id is UNIQUE, and the credit is written as
--      INSERT ... ON CONFLICT (unlock_id) DO NOTHING ... RETURNING. Only rows
--      that actually inserted are paid. A second attempt inserts nothing and
--      therefore pays nothing. The database enforces this, not application
--      logic that a future caller could route around.
--   b) The ledger row and the wallet update are driven off that RETURNING
--      set, in the same transaction, so a balance can never move without its
--      audit row, or an audit row exist without its balance move.
--   c) The whole toggle takes a row lock on the listing first, so two
--      concurrent calls serialise rather than race.
--
-- Reactivating claws nothing back: no path here deletes an unlock_recredits
-- row or writes a negative delta. Re-credits are final.
--
-- SAFE TO RUN AS-IS. One transaction. Adds two nullable columns, one table,
-- one view, two functions; redefines one view. Drops nothing, deletes
-- nothing, alters no existing row.
-- ============================================================================

BEGIN;

-- ── 1. When the farmer said so ─────────────────────────────────────────────
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS sold_at timestamptz;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS reactivated_at timestamptz;

COMMENT ON COLUMN public.listings.sold_at IS
  'When the farmer last marked this listing sold. Set by mark_listing_sold(); '
  'left in place after a reactivation so the previous sale is still readable.';

COMMENT ON COLUMN public.listings.reactivated_at IS
  'When the farmer last put a sold listing back on the market. '
  'reactivated_at > sold_at means it is on the market now.';

-- No new index. idx_listings_farmer already covers the farmer page's read,
-- and the re-credit sweep reads unlocks, which is keyed on (buyer_id, listing_id).

-- ── 2. The audit trail for re-credits ──────────────────────────────────────
-- One row per unlock that was paid back. Never an adjustment in place: this
-- table only grows, and the token_ledger row beside it is append-only by the
-- trigger 001 put on it.
CREATE TABLE IF NOT EXISTS public.unlock_recredits (
  id bigserial PRIMARY KEY,
  -- THE MINT-GUARD. One unlock, at most one re-credit, for all time.
  unlock_id uuid NOT NULL UNIQUE REFERENCES public.unlocks(id),
  buyer_id uuid NOT NULL REFERENCES public.buyers(id),
  listing_id uuid NOT NULL REFERENCES public.listings(id),
  reason text NOT NULL CHECK (reason IN ('sold_within_12h')),
  tokens int NOT NULL CHECK (tokens > 0),
  unlocked_at timestamptz NOT NULL,      -- the unlock this pays back
  sold_at timestamptz NOT NULL,          -- the sale that triggered it
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recredits_listing ON public.unlock_recredits (listing_id);
CREATE INDEX IF NOT EXISTS idx_recredits_buyer ON public.unlock_recredits (buyer_id);

COMMENT ON TABLE public.unlock_recredits IS
  'One row per token re-credited because a farmer marked a listing sold within '
  '12 hours of the unlock. UNIQUE(unlock_id) is the guard that stops a farmer '
  'minting tokens by toggling sold -> active -> sold.';

ALTER TABLE public.unlock_recredits ENABLE ROW LEVEL SECURITY;

-- The buyer may read his own re-credits, same shape as unlocks_self from 001.
-- No INSERT/UPDATE/DELETE policy exists for anyone: the only write path is
-- mark_listing_sold(), which is SECURITY DEFINER.
CREATE POLICY recredits_self ON public.unlock_recredits
  FOR SELECT TO authenticated USING (buyer_id = public.current_buyer_id());

-- 004 revoked anon from everything in public and set default privileges to
-- keep revoking it. Nothing here hands any of that back.
REVOKE ALL ON public.unlock_recredits FROM anon;
GRANT SELECT ON public.unlock_recredits TO authenticated;

-- ── 3. Mark sold ───────────────────────────────────────────────────────────
-- p_farmer_id is NOT taken on trust from a client: the route resolves it from
-- the httpOnly farmer cookie, and this function re-checks that the listing
-- actually belongs to it before touching a row. A caller who guesses a
-- listing id gets not_your_listing and no write happens.
CREATE OR REPLACE FUNCTION public.mark_listing_sold(p_listing_id uuid, p_farmer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_listing public.listings%ROWTYPE;
  v_sold_at timestamptz := now();
  v_cost int := COALESCE((public.cfg('unlock')->>'cost')::int, 1);
  v_credited int := 0;
  v_tokens int := 0;
  r record;
BEGIN
  -- Row lock first: two taps on a slow phone must not run side by side.
  SELECT * INTO v_listing FROM public.listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing_not_found'; END IF;

  -- OWNERSHIP. The listing id came from a browser; the farmer id did not.
  IF v_listing.farmer_id <> p_farmer_id THEN RAISE EXCEPTION 'not_your_listing'; END IF;

  IF v_listing.status = 'sold' THEN
    RETURN jsonb_build_object('status', 'sold', 'already', true, 'recredited', 0);
  END IF;
  -- Only a live listing can be sold. draft / expired / removed / flagged are
  -- staff and cron territory, and the farmer screen never offers the control
  -- on them.
  IF v_listing.status <> 'active' THEN RAISE EXCEPTION 'listing_not_active'; END IF;

  UPDATE public.listings
     SET status = 'sold', sold_at = v_sold_at
   WHERE id = p_listing_id;

  -- ── The 12-hour rule ─────────────────────────────────────────────────────
  -- Every unlock of THIS listing in the previous 12 hours, still valid (a
  -- disputed or already-refunded unlock was settled elsewhere and must not be
  -- paid twice), that has never been re-credited before.
  --
  -- ON CONFLICT DO NOTHING + RETURNING is the whole guard: the wallet moves
  -- only for rows that actually inserted. On a second sale of the same
  -- listing the old unlocks conflict, return nothing, and are paid nothing.
  FOR r IN
    INSERT INTO public.unlock_recredits
      (unlock_id, buyer_id, listing_id, reason, tokens, unlocked_at, sold_at)
    SELECT u.id, u.buyer_id, u.listing_id, 'sold_within_12h', v_cost,
           u.created_at, v_sold_at
      FROM public.unlocks u
     WHERE u.listing_id = p_listing_id
       AND u.status = 'valid'
       AND u.created_at > v_sold_at - interval '12 hours'
    ON CONFLICT (unlock_id) DO NOTHING
    RETURNING unlock_id, buyer_id, tokens
  LOOP
    -- Serialise this buyer's token ops on the wallet row, as 001 does.
    PERFORM 1 FROM public.buyer_wallets WHERE buyer_id = r.buyer_id FOR UPDATE;
    IF NOT FOUND THEN
      INSERT INTO public.buyer_wallets (buyer_id, balance) VALUES (r.buyer_id, 0)
      ON CONFLICT (buyer_id) DO NOTHING;
      PERFORM 1 FROM public.buyer_wallets WHERE buyer_id = r.buyer_id FOR UPDATE;
    END IF;

    -- Never a silent balance change: the ledger row is written in the same
    -- transaction as the wallet move, and token_ledger is append-only.
    INSERT INTO public.token_ledger (buyer_id, delta, reason, ref_id)
    VALUES (r.buyer_id, r.tokens, 'refund', r.unlock_id);

    UPDATE public.buyer_wallets
       SET balance = balance + r.tokens, updated_at = now()
     WHERE buyer_id = r.buyer_id;

    -- TODO(SMS): tell the buyer his token came back. Deliberately NOT wired
    -- in this diff — the unlock / re-credit template is still pending DLT
    -- approval, and enqueueing against an unapproved template would only fail
    -- in the processor. When the template clears, this becomes:
    --
    --   PERFORM public.enqueue_notification(
    --     'unlock_recredited',
    --     (SELECT mobile FROM public.buyers WHERE id = r.buyer_id),
    --     'kn',
    --     jsonb_build_object('listing_id', p_listing_id, 'tokens', r.tokens));
    --
    -- with a matching row in notification_templates.

    v_credited := v_credited + 1;
    v_tokens := v_tokens + r.tokens;
  END LOOP;

  RETURN jsonb_build_object(
    'status', 'sold',
    'sold_at', v_sold_at,
    'recredited', v_credited,
    'tokens', v_tokens
  );
END $fn$;

-- ── 4. Put it back on the market ───────────────────────────────────────────
-- Claws nothing back. There is no DELETE and no negative delta in here, and
-- that is the point: a re-credit is final the moment it is written.
CREATE OR REPLACE FUNCTION public.reactivate_listing(p_listing_id uuid, p_farmer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_listing public.listings%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_listing FROM public.listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing_not_found'; END IF;
  IF v_listing.farmer_id <> p_farmer_id THEN RAISE EXCEPTION 'not_your_listing'; END IF;

  IF v_listing.status = 'active' THEN
    RETURN jsonb_build_object('status', 'active', 'already', true);
  END IF;
  IF v_listing.status <> 'sold' THEN RAISE EXCEPTION 'listing_not_sold'; END IF;

  -- The listing goes back exactly as it was. expires_at is untouched, so one
  -- whose harvest window has passed returns already expired to
  -- listings_browse rather than getting a free extension.
  UPDATE public.listings
     SET status = 'active', reactivated_at = v_now
   WHERE id = p_listing_id;

  RETURN jsonb_build_object('status', 'active', 'reactivated_at', v_now);
END $fn$;

-- Neither function is reachable from a browser. 004's boundary is that anon
-- reads one view and writes nothing; these are service-role only, called from
-- the TEMP-PRE-AUTH server route that does the ownership check.
REVOKE ALL ON FUNCTION public.mark_listing_sold(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reactivate_listing(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_listing_sold(uuid, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.reactivate_listing(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_listing_sold(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reactivate_listing(uuid, uuid) TO service_role;

-- ── 5. Sold listings leave the market ──────────────────────────────────────
-- 010 put the status rule inside the view so no caller has to remember it.
-- Same place, one clause shorter: `OR l.status = 'sold'` goes. A sold listing
-- is now absent from every buyer query by construction — the browser cannot
-- ask for it, so no client-side sift can accidentally put it back.
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
  WHERE l.status = 'active' AND l.expires_at > now();

ALTER VIEW public.listings_browse SET (security_invoker = false);
GRANT SELECT ON public.listings_browse TO anon, authenticated;

-- ── 6. Ids only, so a paid-for unlock is never lost ────────────────────────
-- A buyer who unlocked a contact keeps it in his history even after the
-- farmer marks the paddy sold — he paid for it, and the card vanishing from
-- the grid would read as the platform taking it back. But the sold listing is
-- now out of listings_browse, so the client has no way to tell that it sold
-- rather than that a filter moved.
--
-- This view is the smallest thing that closes that: the id and the sale time,
-- and nothing else. No variety, no quantity, no location, no farmer, no
-- identity of any kind — it says a uuid sold, to someone who already has to
-- know the uuid for that to mean anything. The masking boundary 004 drew is
-- unchanged.
CREATE OR REPLACE VIEW public.listings_sold AS
  SELECT l.id, l.sold_at
  FROM public.listings l
  WHERE l.status = 'sold';

ALTER VIEW public.listings_sold SET (security_invoker = false);
GRANT SELECT ON public.listings_sold TO anon, authenticated;

COMMIT;

-- ============================================================================
-- After COMMIT, verified against the project rather than assumed — the
-- double-credit guard especially, since a farmer minting tokens is the one
-- failure here that costs real money:
--
--   1. Ownership: mark_listing_sold(<listing A>, <farmer B>) must raise
--      not_your_listing and leave listing A untouched.
--   2. Sold leaves the market: the listing is gone from listings_browse under
--      the anon key, and present in listings_sold.
--   3. The 12-hour line: an unlock 1 hour old is re-credited, an unlock 13
--      hours old is not.
--   4. THE MINT TEST: sold -> active -> sold, and the wallet ends one token
--      up, not two. unlock_recredits holds exactly one row for that unlock and
--      token_ledger exactly one refund.
--   5. Reactivation claws nothing back: the balance across step 4's middle
--      reactivation is unchanged.
--   6. verify-anon-access.mjs still passes.
-- ============================================================================
