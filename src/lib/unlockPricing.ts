import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * What one unlock costs, read from public.config and nowhere else.
 *
 * WHY THIS EXISTS
 * The price of a farmer's contact was written down twice: config.unlock.cost
 * said 1 and the buyer UI hardcoded 5. Both were shipped, so the screen quoted
 * a price the database would not have charged. There is now one copy of the
 * number and this is the only way to it — no constant, no default, no
 * fallback.
 *
 * THE READ IS THE WHITELISTED ONE
 * 001 and 004 both put `unlock` on config_client_read:
 *
 *   CREATE POLICY config_client_read ON public.config
 *     FOR SELECT TO authenticated USING (key IN ('token_packs','unlock','listing'));
 *
 * That policy has been sitting unused since it was written. The SELECT below
 * is exactly the read it authorises — one row, by key — so when OTP auth
 * lands, this moves to the session client and the policy starts doing the
 * gating, with the query itself unchanged.
 *
 * TEMP-PRE-AUTH: until then it runs on the service-role client, because the
 * policy grants to `authenticated` and there is no authenticated buyer yet.
 * It deliberately does NOT run on the anon client: 004 revoked anon from
 * public.config entirely, precisely so that token_packs — which carries rupee
 * prices — cannot be read by anyone holding the key that ships in the browser
 * bundle. So this stays on the server, and only the single integer it returns
 * is ever sent to a client. No price data crosses that line.
 *
 * FAILS CLOSED. Every failure path returns null: a missing row, a malformed
 * value, a non-positive cost, a query error. Returning a guessed number is
 * the one thing this must never do — a buyer shown the wrong price either
 * spends more than he agreed to or is quoted a discount that does not exist.
 * The caller renders an error and blocks unlocking; it does not substitute a
 * default.
 */
export async function getUnlockCost(): Promise<number | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'unlock')
      .maybeSingle();

    if (error) {
      console.error('[unlockPricing] config read failed', error.message);
      return null;
    }
    if (!data) {
      console.error('[unlockPricing] no config row for key "unlock"');
      return null;
    }

    // jsonb comes back parsed. Anything other than a positive whole number of
    // tokens is a misconfiguration, not a price.
    const cost = (data.value as { cost?: unknown } | null)?.cost;
    if (typeof cost !== 'number' || !Number.isInteger(cost) || cost < 1) {
      console.error('[unlockPricing] unusable unlock cost in config:', cost);
      return null;
    }
    return cost;
  } catch (e) {
    console.error('[unlockPricing] config read threw', e instanceof Error ? e.message : e);
    return null;
  }
}
