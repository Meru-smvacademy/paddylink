-- ============================================================================
-- 014_token_purchase_orders.sql
--
-- Makes public.payments an ORDER table with a lifecycle, and rewrites the
-- crediting function around it.
--
-- WHAT WAS WRONG WITH THE 001 SHAPE
-- 001 modelled a payment as something that only ever exists after money
-- moved: status defaulted to 'captured' and process_razorpay_payment()
-- INSERTED the row when the webhook arrived. That leaves nothing on record
-- between "the buyer tapped buy" and "Razorpay called us back" — so a payment
-- that is taken from the buyer and never confirmed is invisible, and there is
-- nothing to put on a pending-orders list because the row was never created.
--
-- The row is now written BEFORE checkout opens, pending, carrying the
-- Razorpay order id. The webhook finds it and flips it.
--
-- ONE CREDITING MECHANISM, NOT TWO
-- The credit still goes through token_ledger + buyer_wallets — the same two
-- tables the 12-hour re-credit writes to in mark_listing_sold() (011). This
-- migration rewrites the existing function rather than adding a second one,
-- so there remains exactly one path that moves a token balance upward.
--
-- IDEMPOTENCY, which Razorpay will test whether we like it or not
-- Razorpay retries webhooks until it gets a 2xx, so the same payment WILL
-- arrive more than once. Three independent guards, any one of which is
-- sufficient:
--
--   a) webhook_events.razorpay_event_id is UNIQUE. A replayed delivery of the
--      same event is recognised and returns 'replay' without touching money.
--   b) The claim is a conditional UPDATE:
--         SET razorpay_payment_id = ... WHERE razorpay_order_id = ...
--                                         AND razorpay_payment_id IS NULL
--      Exactly one transaction can move that column from NULL to the payment
--      id. The credit is driven off whether THAT UPDATE returned a row, so a
--      second attempt credits nothing.
--   c) payments.razorpay_payment_id is UNIQUE (001), which makes (b) safe
--      even against a concurrent insert on a different order row.
--
-- SAFE TO RUN AS-IS. One transaction. Adds a CHECK and an index, changes one
-- default, replaces one function. Drops nothing, deletes no row.
-- ============================================================================

BEGIN;

-- ── 1. The order lifecycle ─────────────────────────────────────────────────
-- 'pending' — row written, Razorpay order created, checkout not yet finished.
-- 'paid'    — webhook verified and tokens credited.
-- 'failed'  — reserved; nothing writes it in this migration.
-- 'captured'— legacy: 001's default. Permitted so no historical row breaks.
ALTER TABLE public.payments ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_valid;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_valid
  CHECK (status IN ('pending', 'paid', 'failed', 'captured'));

COMMENT ON COLUMN public.payments.status IS
  'pending -> paid. The row is created pending BEFORE checkout opens, so an '
  'order that is never confirmed is still on record and reachable by the '
  'admin pending list. Only the webhook writes paid.';

COMMENT ON COLUMN public.payments.razorpay_payment_id IS
  'NULL until the webhook claims the order. UNIQUE, and the conditional '
  'UPDATE that sets it is what makes crediting idempotent.';

-- The admin pending list asks one question: which orders are still pending,
-- oldest first. Partial index, because paid rows are the overwhelming
-- majority in any healthy month.
CREATE INDEX IF NOT EXISTS idx_payments_pending
  ON public.payments (created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments (razorpay_order_id);

-- ── 2. Crediting, rewritten around the order row ───────────────────────────
-- Signature unchanged from 001, so nothing that already knew how to call this
-- has to learn a new shape.
CREATE OR REPLACE FUNCTION public.process_razorpay_payment(
  p_event_id text, p_payment_id text, p_order_id text,
  p_buyer_id uuid, p_amount int, p_tokens int, p_raw jsonb
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_prior_status text;
  v_payment_uuid uuid;
  v_gst_rate int := COALESCE((public.cfg('gst')->>'rate')::int, 18);
  v_invoice_prefix text := COALESCE(public.cfg('gst')->>'invoice_prefix', 'PL');
  v_invoice_no text;
BEGIN
  -- ── Guard (a): the event id. Insert-first, so there is no check-then-act
  -- window between two concurrent deliveries of the same event.
  INSERT INTO public.webhook_events (razorpay_event_id, raw_payload, signature_valid, processing_status)
  VALUES (p_event_id, p_raw, true, 'pending')
  ON CONFLICT (razorpay_event_id) DO NOTHING;

  IF NOT FOUND THEN
    SELECT processing_status INTO v_prior_status
      FROM public.webhook_events WHERE razorpay_event_id = p_event_id FOR UPDATE;
    IF v_prior_status = 'success' THEN
      RETURN 'replay';
    END IF;
    -- A recorded-but-failed event must not be skipped forever.
    UPDATE public.webhook_events
      SET raw_payload = p_raw, processing_status = 'pending', error_message = NULL
      WHERE razorpay_event_id = p_event_id;
  END IF;

  -- ── Guard (b): claim the order. Only one transaction can take
  -- razorpay_payment_id from NULL to this payment id; everything below hangs
  -- off whether this UPDATE returned a row.
  UPDATE public.payments
     SET razorpay_payment_id = p_payment_id,
         status = 'paid',
         amount = p_amount,
         tokens = p_tokens
   WHERE razorpay_order_id = p_order_id
     AND razorpay_payment_id IS NULL
     AND status = 'pending'
  RETURNING id INTO v_payment_uuid;

  IF v_payment_uuid IS NULL THEN
    -- Either this order was already claimed — the ordinary retry — or no
    -- order row exists at all, which means a payment arrived for an order
    -- this system never wrote. The second case is recorded rather than
    -- dropped: money moved, and a missing row must not swallow it.
    IF EXISTS (SELECT 1 FROM public.payments WHERE razorpay_order_id = p_order_id) THEN
      UPDATE public.webhook_events SET processing_status = 'success', processed_at = now()
        WHERE razorpay_event_id = p_event_id;
      RETURN 'duplicate';
    END IF;

    INSERT INTO public.payments
      (buyer_id, razorpay_order_id, razorpay_payment_id, amount, tokens, status)
    VALUES (p_buyer_id, p_order_id, p_payment_id, p_amount, p_tokens, 'paid')
    ON CONFLICT (razorpay_payment_id) DO NOTHING   -- guard (c)
    RETURNING id INTO v_payment_uuid;

    IF v_payment_uuid IS NULL THEN
      UPDATE public.webhook_events SET processing_status = 'success', processed_at = now()
        WHERE razorpay_event_id = p_event_id;
      RETURN 'duplicate';
    END IF;
  END IF;

  -- Whose order it is comes from the row, not from the caller: the webhook
  -- body is attacker-shaped input even after the signature checks out.
  SELECT buyer_id INTO p_buyer_id FROM public.payments WHERE id = v_payment_uuid;

  -- GST invoice number (sequential, gapless enough for a small issuer).
  v_invoice_no := v_invoice_prefix || '-' || to_char(now(),'YYYYMM') || '-' ||
                  lpad(nextval('public.gst_invoice_seq')::text, 5, '0');
  UPDATE public.payments
    SET gst_invoice_no = v_invoice_no,
        gst_amount = (p_amount - (p_amount * 100) / (100 + v_gst_rate))  -- inclusive pricing
    WHERE id = v_payment_uuid;

  -- ── The credit. Same two tables the 12-hour re-credit writes to; the
  -- wallet row is locked first, exactly as mark_listing_sold() does.
  PERFORM 1 FROM public.buyer_wallets WHERE buyer_id = p_buyer_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.buyer_wallets (buyer_id, balance) VALUES (p_buyer_id, 0)
    ON CONFLICT (buyer_id) DO NOTHING;
    PERFORM 1 FROM public.buyer_wallets WHERE buyer_id = p_buyer_id FOR UPDATE;
  END IF;

  INSERT INTO public.token_ledger (buyer_id, delta, reason, ref_id)
  VALUES (p_buyer_id, p_tokens, 'purchase', v_payment_uuid);

  UPDATE public.buyer_wallets SET balance = balance + p_tokens, updated_at = now()
  WHERE buyer_id = p_buyer_id;

  -- TODO(SMS): tell the buyer his tokens landed. Deliberately NOT wired in
  -- this diff — the token-credit DLT template is approved but MSG91 is not
  -- live, and enqueueing against a processor that cannot send would only
  -- build a backlog. Placed here, beside the ledger write and inside the same
  -- transaction, for the same reason the re-credit TODO in 011 is: a
  -- notification must never be sent for a credit that then rolled back.
  -- When MSG91 is live this becomes:
  --
  --   PERFORM public.enqueue_notification(
  --     'tokens_credited',
  --     (SELECT mobile FROM public.buyers WHERE id = p_buyer_id),
  --     'kn',
  --     jsonb_build_object('tokens', p_tokens, 'invoice_no', v_invoice_no));

  -- ── The audit row. Never a silent credit.
  INSERT INTO public.audit_log (actor_role, action, entity, entity_id, meta)
  VALUES ('system', 'tokens_credited', 'payments', v_payment_uuid,
          jsonb_build_object(
            'buyer_id', p_buyer_id,
            'razorpay_order_id', p_order_id,
            'razorpay_payment_id', p_payment_id,
            'tokens', p_tokens,
            'amount_paise', p_amount,
            'gst_invoice_no', v_invoice_no));

  UPDATE public.webhook_events SET processing_status = 'success', processed_at = now()
    WHERE razorpay_event_id = p_event_id;
  RETURN 'credited';
END $fn$;

-- Not reachable from a browser: 001 revoked it from anon and authenticated,
-- and it is called only by the webhook route on the service-role client.
REVOKE ALL ON FUNCTION public.process_razorpay_payment(text,text,text,uuid,int,int,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_razorpay_payment(text,text,text,uuid,int,int,jsonb)
  TO service_role;

COMMIT;

-- ============================================================================
-- After COMMIT, verified rather than assumed:
--
--   1. An order row is written pending, with its Razorpay order id, before
--      checkout opens, and appears on the admin pending list once it is more
--      than ten minutes old.
--   2. A verified webhook flips that same row to paid — one row, not two —
--      and credits 50 tokens through token_ledger + buyer_wallets.
--   3. THE REPLAY TEST: the identical payload posted twice credits once. The
--      second call returns 'replay', the balance does not move, and
--      token_ledger holds exactly one purchase row for that payment.
--   4. A payload with a bad signature is rejected before any of this runs.
--   5. audit_log carries the buyer, order id, payment id, tokens and time.
-- ============================================================================
