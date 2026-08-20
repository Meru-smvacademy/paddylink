-- ============================================================================
-- PaddyLink — Migration 001 (Architecture v8, Razorpay)
-- Run against a fresh Supabase project (SQL editor or supabase db push).
-- Requires: Supabase-managed auth schema. pg_cron optional (guarded below).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================== REFERENCE ===================================
CREATE SCHEMA IF NOT EXISTS reference;

CREATE TABLE reference.districts (
  id serial PRIMARY KEY,
  name_en text NOT NULL UNIQUE,
  name_kn text NOT NULL
);

CREATE TABLE reference.taluks (
  id serial PRIMARY KEY,
  district_id int NOT NULL REFERENCES reference.districts(id),
  name_en text NOT NULL,
  name_kn text NOT NULL,
  UNIQUE (district_id, name_en)
);

CREATE TABLE reference.varieties (
  id serial PRIMARY KEY,
  name_en text NOT NULL UNIQUE,
  name_kn text NOT NULL
);

-- =============================== CONFIG =====================================
CREATE TABLE public.config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================== IDENTITY ===================================
CREATE TABLE public.farmers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile text UNIQUE NOT NULL,
  full_name text,
  village text,
  taluk_id int REFERENCES reference.taluks(id),
  created_via text NOT NULL CHECK (created_via IN ('self','staff')),
  staff_id uuid REFERENCES auth.users(id),
  last_otp_verified_at timestamptz DEFAULT now(),
  contact_share_consent_at timestamptz,          -- DPDP: required before any listing activates
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','flagged','suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.buyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_uid uuid UNIQUE REFERENCES auth.users(id),
  name text NOT NULL,
  business_name text,
  mobile text UNIQUE NOT NULL,
  email text,
  business_type text CHECK (business_type IN ('mill_owner','trader','wholesaler')),
  gstin text,
  apmc_license_no text,
  district_id int REFERENCES reference.districts(id),
  taluk_id int REFERENCES reference.taluks(id),
  kyc_status text NOT NULL DEFAULT 'pending'
    CHECK (kyc_status IN ('pending','under_review','approved','rejected')),
  consent_withdrawn_at timestamptz,
  dispute_count_30d int NOT NULL DEFAULT 0,
  last_active_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================== LISTINGS ===================================
CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL REFERENCES public.farmers(id),
  variety_id int NOT NULL REFERENCES reference.varieties(id),
  quantity_quintals numeric NOT NULL CHECK (quantity_quintals > 0),
  harvest_month date NOT NULL,                   -- first of month; UI: "spans months? pick the last"
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','active','sold','expired','removed','flagged')),
  created_by text NOT NULL CHECK (created_by IN ('farmer','staff','admin')),
  staff_id uuid REFERENCES auth.users(id),
  unlock_count int NOT NULL DEFAULT 0,
  dispute_count int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_listings_browse ON public.listings (status, harvest_month, variety_id);
CREATE INDEX idx_listings_farmer ON public.listings (farmer_id);
CREATE INDEX idx_listings_expiry ON public.listings (expires_at) WHERE status = 'active';

CREATE TABLE public.listing_removals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id),
  farmer_id uuid NOT NULL REFERENCES public.farmers(id),
  staff_id uuid REFERENCES auth.users(id),
  reason text NOT NULL CHECK (reason IN ('wrong_number','wrong_quantity','not_my_listing','other')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================ TOKENS & MONEY ================================
CREATE TABLE public.buyer_wallets (
  buyer_id uuid PRIMARY KEY REFERENCES public.buyers(id),
  balance int NOT NULL DEFAULT 0 CHECK (balance >= 0),   -- hard overspend backstop
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.token_ledger (                       -- APPEND-ONLY (trigger + grants below)
  id bigserial PRIMARY KEY,
  buyer_id uuid NOT NULL REFERENCES public.buyers(id),
  delta int NOT NULL,
  reason text NOT NULL CHECK (reason IN ('purchase','unlock','refund','admin_adjust')),
  ref_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ledger_buyer ON public.token_ledger (buyer_id);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.buyers(id),
  razorpay_order_id text,
  razorpay_payment_id text UNIQUE,                       -- idempotency key
  amount int NOT NULL,                                   -- paise
  tokens int NOT NULL,
  status text NOT NULL DEFAULT 'captured',
  gst_invoice_no text,
  gst_amount int,                                        -- paise
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razorpay_event_id text UNIQUE NOT NULL,                -- replay guard
  raw_payload jsonb,
  signature_valid boolean,
  processing_status text NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending','success','failed')),
  error_message text,
  processed_at timestamptz
);

CREATE TABLE public.unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.buyers(id),
  listing_id uuid NOT NULL REFERENCES public.listings(id),
  status text NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','disputed','refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (buyer_id, listing_id)                          -- never charge twice for same listing
);

CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unlock_id uuid UNIQUE NOT NULL REFERENCES public.unlocks(id),
  reason text NOT NULL CHECK (reason IN ('wrong_number','already_sold','no_response')),
  resolution text CHECK (resolution IN ('auto_refunded','rejected','manual_refund','pending_admin')),
  resolved_by uuid REFERENCES auth.users(id),
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ================================= KYC ======================================
CREATE TABLE public.buyer_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.buyers(id),
  doc_type text NOT NULL CHECK (doc_type IN ('gst','pan','trade_license','apmc_license')),
  storage_path text NOT NULL,                            -- private bucket; signed URLs only
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  reject_reason text,
  delete_after timestamptz,                              -- DPDP retention; enforced by cron
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================ NOTIFICATIONS =================================
CREATE TABLE public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  language text NOT NULL CHECK (language IN ('kn','en')),
  channel text NOT NULL CHECK (channel IN ('whatsapp_rich','whatsapp_simple','sms')),
  template_text text NOT NULL,
  template_category text CHECK (template_category IN ('utility','marketing','authentication','service','n/a')),
  meta_approval_status text NOT NULL DEFAULT 'pending'
    CHECK (meta_approval_status IN ('approved','pending','rejected','n/a')),
  UNIQUE (event_type, language, channel)
);

-- Channel is chosen by the PROCESSOR at send time (rich -> simple -> sms cascade,
-- driven by notification_templates.meta_approval_status). Deliberately no channel
-- column here; sent_via records the channel that actually succeeded.
CREATE TABLE public.notification_queue (
  id bigserial PRIMARY KEY,
  event_type text NOT NULL,
  recipient_mobile text NOT NULL,
  language text NOT NULL DEFAULT 'kn',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed')),
  attempts int NOT NULL DEFAULT 0,
  sent_via text,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_nq_pending ON public.notification_queue (status, created_at) WHERE status = 'pending';

-- ================================ OPS =======================================
CREATE TABLE public.otp_log (
  id bigserial PRIMARY KEY,
  mobile text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  ip inet,
  user_agent text,
  purpose text NOT NULL CHECK (purpose IN ('login','mark_sold','edit_listing','remove_listing'))
);
CREATE INDEX idx_otp_rate ON public.otp_log (mobile, requested_at);

CREATE TABLE public.reconciliation_runs (
  id bigserial PRIMARY KEY,
  run_at timestamptz NOT NULL DEFAULT now(),
  mismatch_count int NOT NULL,
  details jsonb
);

CREATE TABLE public.audit_log (
  id bigserial PRIMARY KEY,
  actor_id uuid,
  actor_role text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  meta jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- HELPERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_buyer_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.buyers WHERE auth_uid = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.cfg(p_key text)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT value FROM public.config WHERE key = p_key
$$;

CREATE OR REPLACE FUNCTION public.enqueue_notification(
  p_event text, p_mobile text, p_language text, p_payload jsonb
) RETURNS void LANGUAGE sql AS $$
  INSERT INTO public.notification_queue (event_type, recipient_mobile, language, payload)
  VALUES (p_event, p_mobile, COALESCE(p_language,'kn'), COALESCE(p_payload,'{}'::jsonb))
$$;

-- One alert row PER admin mobile in config.admin_alert_mobiles (jsonb array).
CREATE OR REPLACE FUNCTION public.enqueue_admin_alert(p_event text, p_payload jsonb)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_mobile text;
BEGIN
  FOR v_mobile IN SELECT jsonb_array_elements_text(COALESCE(public.cfg('admin_alert_mobiles'),'[]'::jsonb))
  LOOP
    PERFORM public.enqueue_notification(p_event, v_mobile, 'en', p_payload);
  END LOOP;
END $$;

-- ============================================================================
-- APPEND-ONLY ENFORCEMENT ON token_ledger
-- ============================================================================
CREATE OR REPLACE FUNCTION public.forbid_ledger_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'token_ledger is append-only; corrections are new admin_adjust rows';
END $$;

CREATE TRIGGER trg_ledger_no_update BEFORE UPDATE OR DELETE ON public.token_ledger
FOR EACH ROW EXECUTE FUNCTION public.forbid_ledger_mutation();

-- ============================================================================
-- CORE FUNCTION 1: Razorpay webhook processing (one transaction, idempotent)
-- Called by the webhook Edge Function AFTER raw-body HMAC verification.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_razorpay_payment(
  p_event_id text, p_payment_id text, p_order_id text,
  p_buyer_id uuid, p_amount int, p_tokens int, p_raw jsonb
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prior_status text;
  v_payment_uuid uuid;
  v_gst_rate int := COALESCE((public.cfg('gst')->>'rate')::int, 18);
  v_invoice_prefix text := COALESCE(public.cfg('gst')->>'invoice_prefix', 'PL');
  v_invoice_no text;
  v_buyer_mobile text;
BEGIN
  -- Idempotency layer 1: event id (insert-first; no check-then-insert window).
  INSERT INTO public.webhook_events (razorpay_event_id, raw_payload, signature_valid, processing_status)
  VALUES (p_event_id, p_raw, true, 'pending')
  ON CONFLICT (razorpay_event_id) DO NOTHING;

  IF NOT FOUND THEN
    SELECT processing_status INTO v_prior_status
      FROM public.webhook_events WHERE razorpay_event_id = p_event_id FOR UPDATE;
    IF v_prior_status = 'success' THEN
      RETURN 'replay';
    END IF;
    -- Reprocess a failed/pending event (a recorded-but-failed event must never
    -- be skipped forever). Refresh payload with the latest delivery.
    UPDATE public.webhook_events
      SET raw_payload = p_raw, processing_status = 'pending', error_message = NULL
      WHERE razorpay_event_id = p_event_id;
  END IF;

  -- Idempotency layer 2: payment id.
  INSERT INTO public.payments (buyer_id, razorpay_order_id, razorpay_payment_id, amount, tokens, status)
  VALUES (p_buyer_id, p_order_id, p_payment_id, p_amount, p_tokens, 'captured')
  ON CONFLICT (razorpay_payment_id) DO NOTHING
  RETURNING id INTO v_payment_uuid;

  IF v_payment_uuid IS NULL THEN
    UPDATE public.webhook_events SET processing_status = 'success', processed_at = now()
      WHERE razorpay_event_id = p_event_id;
    RETURN 'duplicate';
  END IF;

  -- GST invoice number (sequential, gapless enough for a small issuer).
  v_invoice_no := v_invoice_prefix || '-' || to_char(now(),'YYYYMM') || '-' ||
                  lpad(nextval('public.gst_invoice_seq')::text, 5, '0');
  UPDATE public.payments
    SET gst_invoice_no = v_invoice_no,
        gst_amount = (p_amount - (p_amount * 100) / (100 + v_gst_rate))  -- inclusive pricing
    WHERE id = v_payment_uuid;

  -- Credit: wallet row lock; ledger + wallet in this same transaction.
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

  -- Notify the buyer (queued; processor picks channel).
  SELECT mobile INTO v_buyer_mobile FROM public.buyers WHERE id = p_buyer_id;
  PERFORM public.enqueue_notification('payment_success', v_buyer_mobile, 'kn',
    jsonb_build_object('tokens', p_tokens, 'invoice_no', v_invoice_no, 'payment_id', v_payment_uuid));

  UPDATE public.webhook_events SET processing_status = 'success', processed_at = now()
    WHERE razorpay_event_id = p_event_id;
  RETURN 'credited';
END $$;

CREATE SEQUENCE IF NOT EXISTS public.gst_invoice_seq;

-- ============================================================================
-- CORE FUNCTION 2: unlock_contact (atomic; buyer derived from auth, never a param)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.unlock_contact(p_listing_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_buyer_id uuid;
  v_unlock_cost int := COALESCE((public.cfg('unlock')->>'cost')::int, 1);
  v_unlock_id uuid;
  v_farmer_mobile text;
  v_farmer_name text;
  v_buyer_name text;
  v_buyer_taluk text;
  v_balance int;
BEGIN
  v_buyer_id := public.current_buyer_id();
  IF v_buyer_id IS NULL THEN RAISE EXCEPTION 'not_a_buyer'; END IF;

  -- Serialize all token ops for this buyer on the wallet row.
  SELECT balance INTO v_balance FROM public.buyer_wallets WHERE buyer_id = v_buyer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'no_wallet'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.buyers WHERE id = v_buyer_id AND kyc_status = 'approved') THEN
    RAISE EXCEPTION 'kyc_not_approved';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.listings WHERE id = p_listing_id AND status = 'active') THEN
    RAISE EXCEPTION 'listing_not_active';
  END IF;
  IF EXISTS (SELECT 1 FROM public.unlocks WHERE buyer_id = v_buyer_id AND listing_id = p_listing_id) THEN
    RAISE EXCEPTION 'already_unlocked';
  END IF;
  IF v_balance < v_unlock_cost THEN RAISE EXCEPTION 'insufficient_balance'; END IF;

  INSERT INTO public.unlocks (buyer_id, listing_id) VALUES (v_buyer_id, p_listing_id)
  RETURNING id INTO v_unlock_id;

  INSERT INTO public.token_ledger (buyer_id, delta, reason, ref_id)
  VALUES (v_buyer_id, -v_unlock_cost, 'unlock', v_unlock_id);

  UPDATE public.buyer_wallets SET balance = balance - v_unlock_cost, updated_at = now()
  WHERE buyer_id = v_buyer_id;

  UPDATE public.listings SET unlock_count = unlock_count + 1 WHERE id = p_listing_id;
  UPDATE public.buyers SET last_active_at = now() WHERE id = v_buyer_id;

  SELECT f.mobile, f.full_name INTO v_farmer_mobile, v_farmer_name
  FROM public.listings l JOIN public.farmers f ON f.id = l.farmer_id
  WHERE l.id = p_listing_id;

  SELECT b.name, COALESCE(t.name_kn, t.name_en, '') INTO v_buyer_name, v_buyer_taluk
  FROM public.buyers b LEFT JOIN reference.taluks t ON t.id = b.taluk_id
  WHERE b.id = v_buyer_id;

  PERFORM public.enqueue_notification('contact_unlocked_farmer', v_farmer_mobile, 'kn',
    jsonb_build_object('buyer_name', v_buyer_name, 'buyer_taluk', v_buyer_taluk));

  RETURN jsonb_build_object(
    'unlock_id', v_unlock_id,
    'farmer_name', v_farmer_name,
    'farmer_mobile', v_farmer_mobile
  );
END $$;

-- ============================================================================
-- CORE FUNCTION 3: dispute filing with auto-resolution rules
-- ============================================================================
CREATE OR REPLACE FUNCTION public.file_dispute(p_unlock_id uuid, p_reason text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_buyer_id uuid := public.current_buyer_id();
  v_u public.unlocks%ROWTYPE;
  v_listing public.listings%ROWTYPE;
  v_cap int := COALESCE((public.cfg('caps')->>'disputes_per_month')::int, 3);
  v_month_disputes int;
  v_prior_valid int;
  v_sold_before boolean := false;
  v_resolution text;
BEGIN
  IF v_buyer_id IS NULL THEN RAISE EXCEPTION 'not_a_buyer'; END IF;

  SELECT * INTO v_u FROM public.unlocks WHERE id = p_unlock_id AND buyer_id = v_buyer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'unlock_not_found'; END IF;
  IF v_u.status <> 'valid' THEN RAISE EXCEPTION 'already_disputed'; END IF;
  IF v_u.created_at < now() - interval '48 hours' THEN RAISE EXCEPTION 'dispute_window_closed'; END IF;
  IF p_reason NOT IN ('wrong_number','already_sold','no_response') THEN RAISE EXCEPTION 'bad_reason'; END IF;

  -- no_response never refunds (stated upfront in UI); recorded for pattern data.
  IF p_reason = 'no_response' THEN
    INSERT INTO public.disputes (unlock_id, reason, resolution)
    VALUES (p_unlock_id, p_reason, 'rejected');
    RETURN 'rejected_no_refund';
  END IF;

  SELECT COUNT(*) INTO v_month_disputes
  FROM public.disputes d JOIN public.unlocks u ON u.id = d.unlock_id
  WHERE u.buyer_id = v_buyer_id AND d.created_at > now() - interval '30 days';

  SELECT * INTO v_listing FROM public.listings WHERE id = v_u.listing_id;

  IF p_reason = 'already_sold' THEN
    v_sold_before := (v_listing.status = 'sold');
  END IF;

  SELECT COUNT(*) INTO v_prior_valid
  FROM public.unlocks
  WHERE listing_id = v_u.listing_id AND status = 'valid' AND id <> p_unlock_id;

  IF (p_reason = 'already_sold' AND v_sold_before)
     OR (p_reason = 'wrong_number' AND v_month_disputes < v_cap AND v_prior_valid = 0) THEN
    v_resolution := 'auto_refunded';
  ELSE
    v_resolution := 'pending_admin';
  END IF;

  INSERT INTO public.disputes (unlock_id, reason, resolution)
  VALUES (p_unlock_id, p_reason, v_resolution);

  UPDATE public.unlocks SET status = 'disputed' WHERE id = p_unlock_id;
  UPDATE public.listings SET dispute_count = dispute_count + 1 WHERE id = v_u.listing_id;
  UPDATE public.buyers SET dispute_count_30d = v_month_disputes + 1 WHERE id = v_buyer_id;

  IF v_resolution = 'auto_refunded' THEN
    PERFORM 1 FROM public.buyer_wallets WHERE buyer_id = v_buyer_id FOR UPDATE;
    INSERT INTO public.token_ledger (buyer_id, delta, reason, ref_id)
    VALUES (v_buyer_id, COALESCE((public.cfg('unlock')->>'cost')::int,1), 'refund', p_unlock_id);
    UPDATE public.buyer_wallets
      SET balance = balance + COALESCE((public.cfg('unlock')->>'cost')::int,1), updated_at = now()
      WHERE buyer_id = v_buyer_id;
    UPDATE public.unlocks SET status = 'refunded' WHERE id = p_unlock_id;
  END IF;

  -- 2+ wrong-number disputes hides the listing pending human review. Never auto-suspend farmers.
  IF p_reason = 'wrong_number' THEN
    UPDATE public.listings SET status = 'flagged'
    WHERE id = v_u.listing_id AND dispute_count >= 2 AND status = 'active';
  END IF;

  RETURN v_resolution;
END $$;

-- ============================================================================
-- CRON FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reconcile_wallets() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_mismatches jsonb; v_count int;
BEGIN
  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb), COUNT(*) INTO v_mismatches, v_count
  FROM (
    SELECT w.buyer_id, w.balance AS wallet,
           COALESCE(SUM(l.delta),0) AS ledger_sum,
           w.balance - COALESCE(SUM(l.delta),0) AS diff
    FROM public.buyer_wallets w
    LEFT JOIN public.token_ledger l USING (buyer_id)
    GROUP BY w.buyer_id, w.balance
    HAVING w.balance <> COALESCE(SUM(l.delta),0)
  ) t;

  INSERT INTO public.reconciliation_runs (mismatch_count, details) VALUES (v_count, v_mismatches);
  IF v_count > 0 THEN
    PERFORM public.enqueue_admin_alert('reconciliation_alert',
      jsonb_build_object('count', v_count, 'details', v_mismatches));
  END IF;

  -- Also alert on webhooks stuck failed > 1 hour.
  IF EXISTS (SELECT 1 FROM public.webhook_events
             WHERE processing_status = 'failed' AND processed_at < now() - interval '1 hour') THEN
    PERFORM public.enqueue_admin_alert('failed_webhooks_alert',
      (SELECT jsonb_build_object('count', COUNT(*)) FROM public.webhook_events
       WHERE processing_status = 'failed'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.expire_listings() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  -- Renewal nudge 7 days before expiry (once per listing per window).
  FOR r IN
    SELECT l.id, f.mobile
    FROM public.listings l JOIN public.farmers f ON f.id = l.farmer_id
    WHERE l.status = 'active'
      AND l.expires_at BETWEEN now() + interval '6 days' AND now() + interval '7 days'
  LOOP
    PERFORM public.enqueue_notification('expiry_nudge', r.mobile, 'kn',
      jsonb_build_object('listing_id', r.id));
  END LOOP;

  UPDATE public.listings SET status = 'expired'
  WHERE status = 'active' AND expires_at < now();
END $$;

CREATE OR REPLACE FUNCTION public.retention_cleanup() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- DPDP: delete doc rows past delete_after (storage objects removed by a companion
  -- Edge Function reading this table before row deletion; see runbook).
  INSERT INTO public.audit_log (actor_role, action, entity, meta)
  SELECT 'system', 'dpdp_doc_deleted', 'buyer_documents',
         jsonb_build_object('id', id, 'buyer_id', buyer_id, 'doc_type', doc_type)
  FROM public.buyer_documents WHERE delete_after IS NOT NULL AND delete_after < now();

  DELETE FROM public.buyer_documents WHERE delete_after IS NOT NULL AND delete_after < now();

  -- Set delete_after for approved docs of buyers inactive > 1 year.
  UPDATE public.buyer_documents d SET delete_after = now() + interval '7 days'
  FROM public.buyers b
  WHERE d.buyer_id = b.id AND d.status = 'approved' AND d.delete_after IS NULL
    AND COALESCE(b.last_active_at, b.created_at) < now() - interval '1 year';
END $$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Listings: enforce consent + compute expiry.
CREATE OR REPLACE FUNCTION public.listing_before_insert() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'active' AND NOT EXISTS (
    SELECT 1 FROM public.farmers
    WHERE id = NEW.farmer_id AND contact_share_consent_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'farmer_consent_missing';
  END IF;
  NEW.harvest_month := date_trunc('month', NEW.harvest_month)::date;
  NEW.expires_at := COALESCE(NEW.expires_at,
    (date_trunc('month', NEW.harvest_month) + interval '1 month' - interval '1 day'
     + make_interval(days => COALESCE((public.cfg('listing')->>'ttl_days')::int, 30)))::timestamptz);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_listing_ins BEFORE INSERT ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.listing_before_insert();

-- Staff-removal flagging: 3+ removals of one staff member's listings in 30 days.
CREATE OR REPLACE FUNCTION public.removal_after_insert() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE v_count int;
BEGIN
  UPDATE public.listings SET status = 'removed' WHERE id = NEW.listing_id;
  IF NEW.staff_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM public.listing_removals
    WHERE staff_id = NEW.staff_id AND created_at > now() - interval '30 days';
    IF v_count >= 3 THEN
      PERFORM public.enqueue_admin_alert('staff_flag',
        jsonb_build_object('staff_id', NEW.staff_id, 'removals_30d', v_count));
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_removal_ins AFTER INSERT ON public.listing_removals
FOR EACH ROW EXECUTE FUNCTION public.removal_after_insert();

-- ============================================================================
-- ROW LEVEL SECURITY
-- All writes that move tokens or expose contacts go through SECURITY DEFINER
-- functions above; RLS below governs direct table access from clients.
-- ============================================================================
ALTER TABLE public.farmers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_removals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_wallets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_ledger       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unlocks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_documents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config             ENABLE ROW LEVEL SECURITY;

-- Public browse: active listings only, and ONLY non-contact columns are exposed
-- via this view (farmer mobile lives in farmers, which has no public policy).
CREATE POLICY listings_public_read ON public.listings
  FOR SELECT TO anon, authenticated USING (status IN ('active','sold'));

CREATE VIEW public.listings_browse AS
  SELECT l.id, v.name_kn AS variety_kn, v.name_en AS variety_en,
         l.quantity_quintals, l.harvest_month,
         t.name_kn AS taluk_kn, t.name_en AS taluk_en,
         d.name_en AS district_en,
         l.status, l.created_at
  FROM public.listings l
  JOIN reference.varieties v ON v.id = l.variety_id
  JOIN public.farmers f ON f.id = l.farmer_id
  LEFT JOIN reference.taluks t ON t.id = f.taluk_id
  LEFT JOIN reference.districts d ON d.id = t.district_id;

-- Buyers: own row only.
CREATE POLICY buyers_self_select ON public.buyers
  FOR SELECT TO authenticated USING (auth_uid = auth.uid());
CREATE POLICY buyers_self_update ON public.buyers
  FOR UPDATE TO authenticated USING (auth_uid = auth.uid())
  WITH CHECK (auth_uid = auth.uid() AND kyc_status = kyc_status);
CREATE POLICY buyers_self_insert ON public.buyers
  FOR INSERT TO authenticated WITH CHECK (auth_uid = auth.uid());

-- Wallet/ledger/payments/unlocks/documents: buyer sees own rows; all writes via functions.
CREATE POLICY wallet_self ON public.buyer_wallets
  FOR SELECT TO authenticated USING (buyer_id = public.current_buyer_id());
CREATE POLICY ledger_self ON public.token_ledger
  FOR SELECT TO authenticated USING (buyer_id = public.current_buyer_id());
CREATE POLICY payments_self ON public.payments
  FOR SELECT TO authenticated USING (buyer_id = public.current_buyer_id());
CREATE POLICY unlocks_self ON public.unlocks
  FOR SELECT TO authenticated USING (buyer_id = public.current_buyer_id());
CREATE POLICY disputes_self ON public.disputes
  FOR SELECT TO authenticated
  USING (unlock_id IN (SELECT id FROM public.unlocks WHERE buyer_id = public.current_buyer_id()));
CREATE POLICY docs_self_select ON public.buyer_documents
  FOR SELECT TO authenticated USING (buyer_id = public.current_buyer_id());
CREATE POLICY docs_self_insert ON public.buyer_documents
  FOR INSERT TO authenticated WITH CHECK (buyer_id = public.current_buyer_id());

-- Farmers table: no client policies at all. Farmer flows (OTP/magic-link) run through
-- Edge Functions using the service role; buyer clients can never SELECT farmer rows.

-- Config: only whitelisted public keys readable by clients.
CREATE POLICY config_public_read ON public.config
  FOR SELECT TO anon, authenticated
  USING (key IN ('token_packs','unlock','listing'));

-- Everything else (webhook_events, otp_log, reconciliation_runs, audit_log,
-- notification_*, listing_removals): no client policies; service role only.

-- Grants hygiene: PostgREST roles get nothing beyond RLS-permitted reads.
REVOKE ALL ON public.token_ledger FROM anon, authenticated;
GRANT SELECT ON public.token_ledger TO authenticated;
GRANT SELECT ON public.listings_browse TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA reference TO anon, authenticated;
GRANT USAGE ON SCHEMA reference TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_contact(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.file_dispute(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.process_razorpay_payment(text,text,text,uuid,int,int,jsonb)
  FROM anon, authenticated;

-- ============================================================================
-- SEED DATA
-- ============================================================================
INSERT INTO reference.districts (name_en, name_kn) VALUES
  ('Raichur','ರಾಯಚೂರು'), ('Koppal','ಕೊಪ್ಪಳ'), ('Yadgir','ಯಾದಗಿರಿ');

INSERT INTO reference.taluks (district_id, name_en, name_kn)
SELECT d.id, t.name_en, t.name_kn FROM reference.districts d
JOIN (VALUES
  ('Raichur','Raichur','ರಾಯಚೂರು'), ('Raichur','Lingasugur','ಲಿಂಗಸುಗೂರು'),
  ('Raichur','Sindhanur','ಸಿಂಧನೂರು'), ('Raichur','Manvi','ಮಾನ್ವಿ'),
  ('Raichur','Devadurga','ದೇವದುರ್ಗ'), ('Raichur','Maski','ಮಸ್ಕಿ'),
  ('Raichur','Sirwar','ಸಿರವಾರ'),
  ('Koppal','Koppal','ಕೊಪ್ಪಳ'), ('Koppal','Gangavathi','ಗಂಗಾವತಿ'),
  ('Koppal','Kushtagi','ಕುಷ್ಟಗಿ'), ('Koppal','Yelburga','ಯಲಬುರ್ಗಾ'),
  ('Koppal','Karatagi','ಕಾರಟಗಿ'), ('Koppal','Kanakagiri','ಕನಕಗಿರಿ'),
  ('Yadgir','Yadgir','ಯಾದಗಿರಿ'), ('Yadgir','Shahapur','ಶಹಾಪುರ'),
  ('Yadgir','Shorapur','ಸುರಪುರ'), ('Yadgir','Wadagera','ವಡಗೇರಾ'),
  ('Yadgir','Gurmitkal','ಗುರುಮಿಟಕಲ್'), ('Yadgir','Hunsagi','ಹುಣಸಗಿ')
) AS t(district, name_en, name_kn) ON t.district = d.name_en;

INSERT INTO reference.varieties (name_en, name_kn) VALUES
  ('Sona Masuri','ಸೋನಾ ಮಸೂರಿ'), ('RNR 15048','ಆರ್‌ಎನ್‌ಆರ್ 15048'),
  ('BPT 5204','ಬಿಪಿಟಿ 5204'), ('IR 64','ಐಆರ್ 64'),
  ('Gangavathi Sona','ಗಂಗಾವತಿ ಸೋನಾ'), ('Kaveri Sona','ಕಾವೇರಿ ಸೋನಾ'),
  ('Other','ಇತರೆ');

INSERT INTO public.config (key, value) VALUES
  -- TODO(Mounesh): confirm pack pricing (paise). 50 tokens = Rs.799 is live; others provisional.
  ('token_packs', '[
     {"id":"p10","tokens":10,"price":19900},
     {"id":"p50","tokens":50,"price":79900},
     {"id":"p100","tokens":100,"price":149900},
     {"id":"p150","tokens":150,"price":219900},
     {"id":"p250","tokens":250,"price":349900},
     {"id":"p500","tokens":500,"price":649900},
     {"id":"p1000","tokens":1000,"price":1199900}
   ]'::jsonb),
  ('unlock', '{"cost":1}'::jsonb),
  ('listing', '{"ttl_days":30}'::jsonb),
  ('caps', '{"disputes_per_month":3}'::jsonb),
  ('gst', '{"rate":18,"inclusive":true,"invoice_prefix":"PL"}'::jsonb),
  ('admin_alert_mobiles', '[]'::jsonb),      -- TODO: add admin numbers, e.g. ["+91XXXXXXXXXX"]
  ('purchase_kill_switch', 'false'::jsonb),
  ('grievance_officer', '{"name":"","email":""}'::jsonb);   -- TODO before launch

-- ============================================================================
-- CRON SCHEDULES (guarded: no-op where pg_cron is absent, e.g. local testing)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('reconcile-wallets', '0 2 * * *',  $c$SELECT public.reconcile_wallets()$c$);
    PERFORM cron.schedule('expire-listings',   '30 1 * * *', $c$SELECT public.expire_listings()$c$);
    PERFORM cron.schedule('retention-cleanup', '0 3 * * 0',  $c$SELECT public.retention_cleanup()$c$);
    -- notification processor: pg_cron + pg_net invoking the Edge Function every minute
    -- is configured in the Supabase dashboard (needs the project URL + service key).
  END IF;
END $$;
