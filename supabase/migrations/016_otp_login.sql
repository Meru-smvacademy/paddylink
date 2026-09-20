-- ============================================================================
-- 016_otp_login.sql — the OTP challenge, its rate limit, and its verification
-- ============================================================================
--
-- WHAT 001 ALREADY HAD, AND WHY IT IS NOT ENOUGH
-- public.otp_log has existed since 001 and is kept, unchanged, doing exactly
-- the job it was written for: one row per REQUEST, with mobile, ip,
-- user_agent and purpose, indexed (mobile, requested_at) for rate limiting.
-- What it has never had is anywhere to put the code itself, an expiry, or an
-- attempt count — so it can say a code was asked for and never whether the
-- one typed back was right. This adds the table that can.
--
-- THE CODE IS NEVER STORED, AND NEVER REACHES THIS DATABASE. The app sends a
-- SHA-256 HMAC of it, keyed with SESSION_SECRET and bound to the mobile and
-- the door. A dump of this table yields 64 hex characters per row and no way
-- back to six digits: the keyspace is a million, which is trivially brute
-- forced from a bare hash, and is exactly why the server's secret is mixed in.
-- Nothing here logs a code, because nothing here ever sees one.
--
-- FAIL CLOSED IS THE RULING (CEO, this change). Every path that cannot prove
-- a code was correct returns a refusal. There is no bypass code, no dev
-- backdoor in SQL, and no branch that admits a caller because the provider
-- was unreachable. The one deliberate exception to "fail closed" is the
-- config read: see the note on cfg('otp') below.
--
-- WHO MAY CALL THESE. Nobody but the service role. Every function is
-- SECURITY DEFINER and REVOKEd from anon and authenticated, in the shape 011
-- and 015 established: the actor is resolved by a Next.js route handler and
-- passed in, because there is still no auth.uid() for a farmer or a buyer.
-- Unlike 015's unlock sibling, these do NOT get deleted when Supabase Auth
-- lands — this IS the thing that will mint those sessions.
--
-- IDEMPOTENCE IS NOT WANTED HERE, unlike 015. A second send must produce a
-- NEW code and kill the old one, or a stolen SMS stays valid for as long as
-- the thief likes.
-- ============================================================================

BEGIN;

-- ── 1. Knobs ───────────────────────────────────────────────────────────────
-- Seeded, not defaulted-around. The COALESCE fallbacks in the functions below
-- are set to the SAME values as this row, deliberately: a missing or malformed
-- config row must not become a weaker rate limit, and equally must not lock
-- every farmer in the district out of his own listings. The strict value IS
-- the fallback, so there is nothing to gain by deleting the row.
--
-- ttl_minutes is 10 to match the DLT-approved template text, which promises
-- the farmer the code is "Valid for 10 minutes". The two must not drift: if
-- this number changes, the template has to be re-approved at the operator.
INSERT INTO public.config (key, value) VALUES
  ('otp', '{"ttl_minutes":10,"send_window_minutes":15,"max_sends_per_window":3,"max_attempts":5}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ── 2. The challenge ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.otp_challenges (
  id bigserial PRIMARY KEY,
  mobile text NOT NULL,
  door text NOT NULL CHECK (door IN ('farmer','buyer')),
  -- Hex SHA-256 HMAC of the code, keyed with the server secret and bound to
  -- (mobile, door). Never the code. Not reversible to one from this row.
  code_hash text NOT NULL CHECK (code_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  -- Set the moment a code is spent, superseded by a resend, or abandoned
  -- because the SMS never went out. A row with this set is dead for all time.
  consumed_at timestamptz,
  consumed_reason text
    CHECK (consumed_reason IN ('verified','superseded','send_failed','attempts_exhausted')),
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The only read either function makes: the live challenge for this door.
CREATE INDEX IF NOT EXISTS idx_otp_challenge_live
  ON public.otp_challenges (mobile, door, created_at DESC);

COMMENT ON TABLE public.otp_challenges IS
  'One row per login code issued. Holds a keyed hash of the code, never the '
  'code. At most one row per (mobile, door) is live at a time: a resend '
  'consumes the previous one as superseded.';

COMMENT ON COLUMN public.otp_challenges.code_hash IS
  'HMAC-SHA256(SESSION_SECRET, otp:<mobile>:<door>:<code>), hex. Computed in '
  'the app so the code never crosses the wire to Postgres.';

ALTER TABLE public.otp_challenges ENABLE ROW LEVEL SECURITY;

-- No policies, on purpose. RLS on with zero policies means nothing reaches
-- this table except the service role, which bypasses RLS. 004 revoked anon
-- from public and set default privileges to keep revoking it; nothing here
-- hands any of that back, and authenticated is not granted either — a signed
-- in buyer has no business reading login codes, his own included.
REVOKE ALL ON public.otp_challenges FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.otp_challenges_id_seq FROM anon, authenticated;

-- ── 3. Request a code ──────────────────────────────────────────────────────
-- Rate limit, supersede, insert — one transaction, one advisory lock.
--
-- THE LOCK IS NOT DECORATION. Count-then-insert across two statements is a
-- race: three tabs submitting together each count two prior sends and each
-- insert a third. pg_advisory_xact_lock on the mobile serialises every
-- request for that number and releases at commit, so the count a caller sees
-- is the count that was still true when it inserted.
--
-- THE WINDOW IS COUNTED FROM otp_log, not from this table, because otp_log is
-- the record of what was ASKED FOR. A send that failed at the provider still
-- has to count, or a broken provider becomes an unmetered SMS pump.
CREATE OR REPLACE FUNCTION public.otp_request(
  p_mobile     text,
  p_door       text,
  p_code_hash  text,
  p_ip         inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_cfg        jsonb := public.cfg('otp');
  v_ttl        int   := COALESCE((v_cfg->>'ttl_minutes')::int, 10);
  v_window     int   := COALESCE((v_cfg->>'send_window_minutes')::int, 15);
  v_max_sends  int   := COALESCE((v_cfg->>'max_sends_per_window')::int, 3);
  v_since      timestamptz;
  v_sent       int;
  v_oldest     timestamptz;
  v_expires    timestamptz;
  v_id         bigint;
BEGIN
  IF p_door NOT IN ('farmer','buyer') THEN
    RAISE EXCEPTION 'bad_door';
  END IF;
  IF p_mobile !~ '^[0-9]{10}$' THEN
    RAISE EXCEPTION 'bad_mobile';
  END IF;
  IF p_code_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'bad_code_hash';
  END IF;

  -- Serialise every concurrent request for this number.
  PERFORM pg_advisory_xact_lock(hashtext('otp:' || p_mobile));

  v_since := now() - make_interval(mins => v_window);

  SELECT count(*), min(requested_at) INTO v_sent, v_oldest
    FROM public.otp_log
   WHERE mobile = p_mobile
     AND purpose = 'login'
     AND requested_at > v_since;

  IF v_sent >= v_max_sends THEN
    -- Tell the caller WHEN, not just no. A farmer standing in a field needs a
    -- number of minutes, not a closed door.
    RETURN jsonb_build_object(
      'outcome', 'rate_limited',
      'retry_after_seconds',
        GREATEST(1, CEIL(EXTRACT(EPOCH FROM
          (v_oldest + make_interval(mins => v_window)) - now()))::int),
      'window_minutes', v_window,
      'max_sends', v_max_sends
    );
  END IF;

  -- A new code kills the old one. Without this a farmer who taps resend
  -- leaves two live codes, and an SMS that was intercepted still works.
  UPDATE public.otp_challenges
     SET consumed_at = now(), consumed_reason = 'superseded'
   WHERE mobile = p_mobile AND door = p_door AND consumed_at IS NULL;

  v_expires := now() + make_interval(mins => v_ttl);

  INSERT INTO public.otp_challenges (mobile, door, code_hash, expires_at, ip, user_agent)
  VALUES (p_mobile, p_door, p_code_hash, v_expires, p_ip, p_user_agent)
  RETURNING id INTO v_id;

  -- 001's log, doing 001's job. purpose 'login' is already in its CHECK.
  INSERT INTO public.otp_log (mobile, ip, user_agent, purpose)
  VALUES (p_mobile, p_ip, p_user_agent, 'login');

  RETURN jsonb_build_object(
    'outcome', 'issued',
    'challenge_id', v_id,
    'expires_at', v_expires,
    'ttl_seconds', v_ttl * 60,
    'sends_used', v_sent + 1,
    'max_sends', v_max_sends
  );
END $fn$;

-- ── 4. Abandon a code whose SMS never went out ─────────────────────────────
-- The route reserves the challenge BEFORE calling the provider, because the
-- rate limit has to be enforced before an SMS can be bought, not after. When
-- the provider then fails, this kills the row it reserved — so a fail-closed
-- send never leaves a live code behind that nobody was ever told.
CREATE OR REPLACE FUNCTION public.otp_abandon(p_challenge_id bigint)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $fn$
  UPDATE public.otp_challenges
     SET consumed_at = now(), consumed_reason = 'send_failed'
   WHERE id = p_challenge_id AND consumed_at IS NULL;
$fn$;

-- ── 5. Verify a code ───────────────────────────────────────────────────────
-- Business outcomes come back as an outcome string rather than an exception,
-- unlike 015: the screen has to tell the farmer how many tries remain, and a
-- RAISE cannot carry that without the route parsing prose.
--
-- THE ROW IS LOCKED FOR UPDATE. Two tabs submitting the same wrong code must
-- burn two attempts, not read 0 twice and write 1 twice.
CREATE OR REPLACE FUNCTION public.otp_verify(
  p_mobile    text,
  p_door      text,
  p_code_hash text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_cfg      jsonb := public.cfg('otp');
  v_max_att  int   := COALESCE((v_cfg->>'max_attempts')::int, 5);
  v_row      public.otp_challenges%ROWTYPE;
BEGIN
  IF p_door NOT IN ('farmer','buyer') THEN
    RAISE EXCEPTION 'bad_door';
  END IF;

  SELECT * INTO v_row
    FROM public.otp_challenges
   WHERE mobile = p_mobile AND door = p_door AND consumed_at IS NULL
   ORDER BY created_at DESC
   LIMIT 1
   FOR UPDATE;

  -- Nothing live. This never says whether a code was ever asked for on this
  -- number: that would turn the endpoint into a way to ask which mobiles
  -- have accounts.
  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'no_challenge');
  END IF;

  IF v_row.expires_at <= now() THEN
    RETURN jsonb_build_object('outcome', 'expired');
  END IF;

  IF v_row.attempts >= v_max_att THEN
    UPDATE public.otp_challenges
       SET consumed_at = now(), consumed_reason = 'attempts_exhausted'
     WHERE id = v_row.id;
    RETURN jsonb_build_object('outcome', 'too_many_attempts', 'max_attempts', v_max_att);
  END IF;

  -- The attempt is counted BEFORE the comparison and kept either way.
  -- Counting only failures would let an attacker run the keyspace for free.
  UPDATE public.otp_challenges
     SET attempts = attempts + 1
   WHERE id = v_row.id
   RETURNING * INTO v_row;

  IF v_row.code_hash <> p_code_hash THEN
    IF v_row.attempts >= v_max_att THEN
      UPDATE public.otp_challenges
         SET consumed_at = now(), consumed_reason = 'attempts_exhausted'
       WHERE id = v_row.id;
      RETURN jsonb_build_object('outcome', 'too_many_attempts', 'max_attempts', v_max_att);
    END IF;
    RETURN jsonb_build_object(
      'outcome', 'wrong_code',
      'attempts_left', v_max_att - v_row.attempts
    );
  END IF;

  -- Correct. Single use: spent here, and no second verification can reuse it.
  UPDATE public.otp_challenges
     SET consumed_at = now(), consumed_reason = 'verified'
   WHERE id = v_row.id;

  -- The farmer's own record of when he last proved the number. 001 gave
  -- farmers this column with a DEFAULT now() that nothing has ever updated.
  -- No row is created here: a farmer exists once he posts a listing, and
  -- proving a number is not the same as having one.
  UPDATE public.farmers SET last_otp_verified_at = now()
   WHERE mobile = p_mobile AND p_door = 'farmer';

  UPDATE public.buyers SET last_active_at = now()
   WHERE mobile = p_mobile AND p_door = 'buyer';

  INSERT INTO public.audit_log (actor_role, action, entity, meta)
  VALUES (p_door, 'otp_verified', 'otp_challenge',
          jsonb_build_object('challenge_id', v_row.id, 'attempts', v_row.attempts));

  RETURN jsonb_build_object('outcome', 'ok');
END $fn$;

-- ── 6. Reachability ────────────────────────────────────────────────────────
-- Service role only, exactly as 011 and 015 did it. A browser holding the
-- anon key cannot request a code, cannot verify one, and cannot abandon one.
REVOKE ALL ON FUNCTION public.otp_request(text, text, text, inet, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.otp_request(text, text, text, inet, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.otp_abandon(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.otp_abandon(bigint) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.otp_verify(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.otp_verify(text, text, text) FROM anon, authenticated;

COMMENT ON FUNCTION public.otp_request(text, text, text, inet, text) IS
  'Rate-limits (cfg otp.max_sends_per_window per send_window_minutes, counted '
  'from otp_log under an advisory lock), supersedes any live challenge, and '
  'issues a new one. Returns outcome issued | rate_limited.';

COMMENT ON FUNCTION public.otp_verify(text, text, text) IS
  'Verifies a keyed code hash against the one live challenge, counting every '
  'attempt under a row lock. Returns outcome ok | wrong_code | expired | '
  'too_many_attempts | no_challenge. Single use: a correct code is consumed.';

COMMIT;
