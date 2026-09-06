-- ============================================================================
-- 012_single_token_pack.sql
--
-- Reconciles the price table with the settled price.
--
-- WHAT WAS WRONG
-- 001 seeded config.token_packs with seven packs, and its own comment said so:
-- "TODO(Mounesh): confirm pack pricing (paise). 50 tokens = Rs.799 is live;
-- others provisional." They were never confirmed. The ladder ran from 10
-- tokens at Rs.199 to 1000 at Rs.11,999, which prices a token anywhere between
-- Rs.12 and Rs.20 depending on which row you read — and since one token is one
-- unlock, that is the price of a farmer's contact, quoted seven different ways.
--
-- THE SETTLED PRICE
-- One pack: 50 tokens for Rs.499. At cost 1 per unlock that is Rs.9.98 a
-- contact, one number, no ladder to reason about.
--
-- WHAT THIS DOES NOT TOUCH
-- - cfg('unlock').cost stays 1. It was always 1; the drift was in the app,
--   where the buyer UI hardcoded 5. That is fixed in the same commit by
--   reading this table instead of a constant, so there is no second copy of
--   the number left to drift.
-- - token_ledger, buyer_wallets and payments are untouched. No balance moves
--   here, no historical row is rewritten: a buyer who bought a pack at the old
--   price bought it at the old price, and the ledger says so.
-- - The legal and marketing copy is untouched. It speaks of tokens
--   generically and never quotes a count or a price, so it stays correct.
--
-- SAFE TO RUN AS-IS. One transaction, one UPDATE of one config row. Creates
-- nothing, drops nothing, deletes no table row.
-- ============================================================================

BEGIN;

-- ── The assumption this migration rests on, checked rather than assumed ────
-- Everything below is priced against one token per unlock. If some other
-- project state says otherwise, that has to be resolved by a person before
-- the pack table is rewritten to match it — so fail loudly instead of
-- quietly shipping a pack sized for a cost it was not priced against.
DO $chk$
DECLARE v_cost int := COALESCE((public.cfg('unlock')->>'cost')::int, 1);
BEGIN
  IF v_cost <> 1 THEN
    RAISE EXCEPTION
      'unlock cost is %, expected 1 — 012 prices the pack against one token per unlock', v_cost;
  END IF;
END $chk$;

-- ── One pack ───────────────────────────────────────────────────────────────
-- Same shape the seed used (id / tokens / price), so any future reader that
-- was written against the seven-pack table still parses this one. price is
-- paise, as everywhere else in this schema: 49900 = Rs.499.
--
-- The other six rows are gone. They lived inside this one jsonb value, so
-- removing them is this UPDATE and nothing else — there is no pack table to
-- delete rows from.
UPDATE public.config
   SET value = '[{"id":"p50","tokens":50,"price":49900}]'::jsonb,
       updated_at = now()
 WHERE key = 'token_packs';

COMMENT ON TABLE public.config IS
  'Runtime settings. token_packs is the ONLY place a pack price lives and '
  'unlock.cost the ONLY place the unlock price lives — the app reads both '
  'rather than carrying its own copy. Both keys are readable by authenticated '
  'clients through config_client_read; anon reads nothing here (004).';

COMMIT;

-- ============================================================================
-- After COMMIT, verified rather than assumed:
--
--   1. config.token_packs holds exactly one pack: 50 tokens, 49900 paise.
--   2. cfg('unlock')->>'cost' is still 1, and no wallet, ledger or payment
--      row changed.
--   3. The buyer unlock screen quotes 1 token, read from this table — change
--      the value here and the screen follows without a deploy.
--   4. anon still cannot read public.config at all; the whitelist that
--      exposes token_packs and unlock is authenticated-only, per 004.
-- ============================================================================
