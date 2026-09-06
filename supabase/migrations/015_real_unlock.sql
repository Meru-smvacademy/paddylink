-- ============================================================================
-- 015_real_unlock.sql
--
-- The real unlock. Until now /buyer/listings flipped a card in component
-- state, revealed a fixture name and phone number, and touched nothing: no
-- token left the ledger and no farmer's contact was released. This makes the
-- unlock spend a token through the same ledger the purchase and the 12-hour
-- re-credit already use.
--
-- WHY A SECOND FUNCTION, AND NOT A CALL TO unlock_contact()
-- 001's unlock_contact(p_listing_id) derives the buyer from
-- public.current_buyer_id(), which reads auth.uid(). There is no
-- authenticated buyer yet — TEMP-PRE-AUTH, the buyer is an httpOnly cookie
-- carrying a mobile number — so that function raises not_a_buyer for every
-- caller the app can currently make. This is the same wall migration 011 hit
-- with the farmer's sold toggle, and it takes 011's answer: a sibling that
-- accepts the actor id as a parameter, called only from a server route that
-- resolved it from the cookie, service-role only and reachable from no
-- browser. unlock_contact() is left exactly as it is and becomes the live
-- path the day OTP auth lands; this one is deleted then.
--
-- FOUR THINGS THIS DOES THAT unlock_contact() DOES NOT
--
--   1. IT FAILS CLOSED ON THE PRICE. unlock_contact() reads
--        COALESCE((cfg('unlock')->>'cost')::int, 1)
--      so a missing or malformed config row silently becomes a charge of 1.
--      That is the exact bug src/lib/unlockPricing.ts exists to prevent on the
--      read side — it returns null rather than guess — and the write side must
--      not undo it. Here an unusable cost raises unlock_cost_unavailable and
--      nothing is written.
--
--   2. IT IS IDEMPOTENT. unlock_contact() raises already_unlocked on a second
--      attempt, which is correct as a guard and useless as an answer: the
--      buyer has paid for that contact and asking for it again must return
--      it. The existing unlock is looked up FIRST, before the balance check,
--      so a buyer at zero balance still gets back a contact he already owns.
--      He is charged once. unlocks already carries UNIQUE (buyer_id,
--      listing_id) from 001, so the database enforces that even if this
--      function were called twice concurrently.
--
--   3. IT WRITES AN AUDIT ROW, every call, including the replay — with
--      tokens 0 on a replay, so the audit trail distinguishes the charge from
--      the re-read rather than showing two identical unlocks.
--
--   4. IT RETURNS THE BALANCE, read back from the row it just updated, so the
--      screen never computes a balance of its own.
--
-- NO NEGATIVE BALANCE, twice over. The IF v_balance < v_cost guard refuses
-- the spend, and buyer_wallets.balance has carried CHECK (balance >= 0) since
-- 001 — the hard backstop that makes an overspend a transaction failure
-- rather than a wrong number. Nothing in this migration weakens either.
--
-- THE 12-HOUR RE-CREDIT ALREADY SEES THESE UNLOCKS, with no change needed:
-- mark_listing_sold() (011) selects FROM public.unlocks WHERE listing_id = ...
-- AND status = 'valid' AND created_at > sold_at - interval '12 hours'. The
-- INSERT below writes exactly that table with the default status 'valid', so
-- an unlock made through this route is re-credited by the farmer's sold
-- toggle like any other. That is asserted, not assumed — see the proof in the
-- commit message.
--
-- ONE ASYMMETRY, LOGGED. mark_listing_sold() still COALESCEs the cost to 1
-- when it pays a re-credit back. With a healthy config row both sides read
-- the same 1 and agree. With a broken one this function now refuses to charge
-- while that function would still refund — which fails safe for the buyer, so
-- it is left alone rather than widened into an 011 rewrite here.
--
-- NO NOTIFICATION. unlock_contact() enqueues 'contact_unlocked_farmer'. This
-- does not, following 011's standing ruling: the templates are still pending
-- DLT approval, and enqueueing against an unapproved template only fails
-- later in the processor. Flagged, not faked.
--
-- SAFE TO RUN AS-IS. One transaction. Adds one function. Drops nothing,
-- deletes no row, alters no existing row, changes no existing function.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.unlock_contact_for_buyer(
  p_listing_id uuid,
  p_buyer_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_cfg jsonb;
  v_cost int;
  v_balance int;
  v_existing public.unlocks%ROWTYPE;
  v_unlock_id uuid;
  v_already boolean := false;
  v_spent int := 0;
  v_farmer_name text;
  v_farmer_mobile text;
BEGIN
  -- ── The price, fail closed ───────────────────────────────────────────────
  -- No COALESCE, no default. A price that cannot be read is not a price of 1.
  v_cfg := public.cfg('unlock');
  IF v_cfg IS NULL OR v_cfg->>'cost' IS NULL THEN
    RAISE EXCEPTION 'unlock_cost_unavailable';
  END IF;
  BEGIN
    v_cost := (v_cfg->>'cost')::int;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'unlock_cost_unavailable';
  END;
  IF v_cost IS NULL OR v_cost < 1 THEN
    RAISE EXCEPTION 'unlock_cost_unavailable';
  END IF;

  -- ── The buyer ────────────────────────────────────────────────────────────
  -- The same rule unlock_contact() applies: only an approved buyer may spend.
  -- p_buyer_id is not taken on trust from a client — the route resolves it
  -- from the httpOnly cookie — but it is still re-checked here.
  IF NOT EXISTS (
    SELECT 1 FROM public.buyers WHERE id = p_buyer_id AND kyc_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'kyc_not_approved';
  END IF;

  -- Serialise this buyer's token ops on the wallet row, as 001 and 011 do.
  -- A buyer who has never held a token has no wallet row; 011 creates one at
  -- zero rather than failing, and the balance check below then refuses the
  -- spend with insufficient_balance — which is the true reason, where
  -- 001's 'no_wallet' would have been an implementation detail.
  PERFORM 1 FROM public.buyer_wallets WHERE buyer_id = p_buyer_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.buyer_wallets (buyer_id, balance) VALUES (p_buyer_id, 0)
    ON CONFLICT (buyer_id) DO NOTHING;
  END IF;
  SELECT balance INTO v_balance
    FROM public.buyer_wallets WHERE buyer_id = p_buyer_id FOR UPDATE;

  -- ── Idempotency, BEFORE the balance check ────────────────────────────────
  -- He has already paid for this contact. Returning it must not depend on
  -- what he can afford today.
  SELECT * INTO v_existing
    FROM public.unlocks
   WHERE buyer_id = p_buyer_id AND listing_id = p_listing_id;

  IF FOUND THEN
    v_already := true;
    v_unlock_id := v_existing.id;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.listings WHERE id = p_listing_id AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'listing_not_active';
    END IF;

    IF v_balance < v_cost THEN
      RAISE EXCEPTION 'insufficient_balance';
    END IF;

    INSERT INTO public.unlocks (buyer_id, listing_id)
    VALUES (p_buyer_id, p_listing_id)
    RETURNING id INTO v_unlock_id;

    -- Never a silent balance change: the ledger row is written in the same
    -- transaction as the wallet move, and token_ledger is append-only.
    INSERT INTO public.token_ledger (buyer_id, delta, reason, ref_id)
    VALUES (p_buyer_id, -v_cost, 'unlock', v_unlock_id);

    UPDATE public.buyer_wallets
       SET balance = balance - v_cost, updated_at = now()
     WHERE buyer_id = p_buyer_id
    RETURNING balance INTO v_balance;

    UPDATE public.listings SET unlock_count = unlock_count + 1 WHERE id = p_listing_id;
    UPDATE public.buyers SET last_active_at = now() WHERE id = p_buyer_id;

    v_spent := v_cost;
  END IF;

  -- ── The contact ──────────────────────────────────────────────────────────
  -- listings_browse carries no identity by design; this is the only place it
  -- is released, and only after the row above exists.
  SELECT f.full_name, f.mobile INTO v_farmer_name, v_farmer_mobile
    FROM public.listings l
    JOIN public.farmers f ON f.id = l.farmer_id
   WHERE l.id = p_listing_id;

  -- ── The audit row, on every call ─────────────────────────────────────────
  -- actor_id stays NULL: it references no auth.users row and there is no
  -- authenticated buyer yet (TEMP-PRE-AUTH). The buyer is carried in meta.
  INSERT INTO public.audit_log
    (actor_id, actor_role, action, entity, entity_id, meta)
  VALUES (
    NULL,
    'buyer',
    CASE WHEN v_already THEN 'contact_unlock_replay' ELSE 'contact_unlock' END,
    'unlocks',
    v_unlock_id,
    jsonb_build_object(
      'buyer_id', p_buyer_id,
      'listing_id', p_listing_id,
      'tokens', v_spent,
      'balance_after', v_balance
    )
  );

  RETURN jsonb_build_object(
    'unlock_id', v_unlock_id,
    'already', v_already,
    'tokens_spent', v_spent,
    'balance', v_balance,
    'farmer_name', v_farmer_name,
    'farmer_mobile', v_farmer_mobile
  );
END $fn$;

-- Not reachable from a browser. 004's boundary is that anon reads one view
-- and writes nothing; this is service-role only, called from the
-- TEMP-PRE-AUTH server route that resolves the buyer from the cookie.
REVOKE ALL ON FUNCTION public.unlock_contact_for_buyer(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unlock_contact_for_buyer(uuid, uuid) FROM anon, authenticated;

COMMENT ON FUNCTION public.unlock_contact_for_buyer(uuid, uuid) IS
  'TEMP-PRE-AUTH sibling of unlock_contact(): takes the buyer id as a '
  'parameter because there is no auth.uid() yet. Idempotent per '
  '(buyer, listing), fails closed on an unusable config price, writes an '
  'audit row on every call. Delete when OTP auth lands and unlock_contact() '
  'becomes reachable.';

COMMIT;
