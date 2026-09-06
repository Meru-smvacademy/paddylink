import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUnlockCost } from '@/lib/unlockPricing';
import { BUYER_MOBILE_COOKIE } from '@/app/api/buyer/session/route';

/**
 * POST /api/buyer/unlock — spend a token, release a farmer's contact.
 *
 * The order of operations, and why:
 *
 *   1. resolve the buyer from the httpOnly cookie
 *   2. read the price from config, and refuse to go on without one
 *   3. call unlock_contact_for_buyer(), which does everything else in ONE
 *      transaction: the unlock row, the ledger debit, the wallet move, the
 *      audit row
 *
 * NOTHING HERE MOVES A BALANCE. This route has no arithmetic on a token
 * count and no write to token_ledger or buyer_wallets. Every one of those
 * lives inside the function, in a single transaction with a row lock on the
 * wallet, so a balance can never move without its ledger row and a listing
 * can never be unlocked without being paid for. The balance this route
 * returns was read back from the row the function updated.
 *
 * THE PRICE IS NOT TAKEN FROM THE CLIENT. There is no code path here that
 * reads an amount from the request; the body carries a listing id and
 * nothing else. The cost is read on the server from config, and the function
 * reads it AGAIN from the same config row and charges what it read — so even
 * this route cannot talk the database into a different price.
 *
 * FAIL CLOSED ON THE PRICE, twice. getUnlockCost() returns null on a missing
 * row, a malformed value, a non-positive cost or a query error, and this
 * route then refuses with 503 rather than guessing. The function repeats the
 * check for itself and raises unlock_cost_unavailable, so a caller that
 * skipped this route still cannot cause a charge at a made-up price. The
 * value read here is used to quote and to log, never to charge.
 *
 * IDEMPOTENT. A second POST for a listing this buyer already unlocked debits
 * nothing and returns the same contact, with already: true. That is the
 * function's guarantee, backed by UNIQUE (buyer_id, listing_id) on unlocks.
 *
 * TEMP-PRE-AUTH: the buyer comes from a cookie, not a verified session —
 * the same hole /api/buyer/orders documents. Nothing here verifies the
 * number belongs to whoever is holding it. Real money and real farmer
 * contacts must not run through this until OTP is in front of it.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What the function raises, mapped to what the browser is told. Anything
 *  unlisted is a 500 and is logged: an unrecognised database error must not
 *  be reported to a buyer as a tidy business outcome. */
const ERROR_STATUS: Record<string, number> = {
  insufficient_balance: 409,
  listing_not_active: 409,
  kyc_not_approved: 403,
  unlock_cost_unavailable: 503,
};

export async function POST(request: Request) {
  const mobile = (await cookies()).get(BUYER_MOBILE_COOKIE)?.value;
  if (!mobile || !/^\d{10}$/.test(mobile)) {
    return NextResponse.json({ error: 'not_signed_in' }, { status: 401 });
  }

  let listingId = '';
  try {
    const body = await request.json();
    listingId = typeof body?.listing_id === 'string' ? body.listing_id : '';
  } catch {
    return NextResponse.json({ error: 'expected_json' }, { status: 400 });
  }
  if (!UUID_RE.test(listingId)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    const [{ data: buyer, error: buyerErr }, cost] = await Promise.all([
      supabase.from('buyers').select('id').eq('mobile', mobile).maybeSingle(),
      getUnlockCost(),
    ]);
    if (buyerErr) throw buyerErr;
    if (!buyer) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 });

    /* Fail closed. A screen that cannot quote a price must not spend a token
       at one, and getUnlockCost() has already logged why it returned null. */
    if (cost === null) {
      return NextResponse.json({ error: 'unlock_cost_unavailable' }, { status: 503 });
    }

    const { data, error } = await supabase.rpc('unlock_contact_for_buyer', {
      p_listing_id: listingId,
      p_buyer_id: buyer.id,
    });

    if (error) {
      /* Postgres puts a RAISE EXCEPTION's text in message; the known ones are
         business outcomes, everything else is a fault. */
      const code = Object.keys(ERROR_STATUS).find((k) => error.message.includes(k));
      if (code) {
        return NextResponse.json({ error: code }, { status: ERROR_STATUS[code] });
      }
      console.error('[buyer/unlock] rpc failed', error.message);
      return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }

    const result = data as {
      unlock_id: string;
      already: boolean;
      tokens_spent: number;
      balance: number;
      farmer_name: string | null;
      farmer_mobile: string | null;
    };

    return NextResponse.json({
      unlockId: result.unlock_id,
      already: result.already,
      tokensSpent: result.tokens_spent,
      /* The ledger's number, read back from the row the function updated.
         The browser never adds or subtracts its own. */
      balance: result.balance,
      farmerName: result.farmer_name,
      farmerMobile: result.farmer_mobile,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[buyer/unlock] failed', message);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
