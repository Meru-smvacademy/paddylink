import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashCode, isDoor, MOBILE_RE, OTP_LENGTH } from '@/lib/otpCode';
import { cookieNameFor, createSessionToken, SESSION_COOKIE_OPTIONS } from '@/lib/otpSession';

/**
 * POST /api/otp/verify — check a code, and mint the session if it was right.
 *
 * THIS ROUTE IS NOW THE ONLY WAY A SESSION COOKIE IS CREATED at either door.
 * Before this change the browser told the server who it was — the OTP screen
 * POSTed a mobile number to /api/farmer/session and the server wrote it down.
 * Anyone could call that with any number. The cookie is now set HERE, from
 * the number this route has just proved, and the browser is not consulted
 * about who it is at any point.
 *
 * WHAT IT DOES NOT DO: create a farmer or a buyer row. Proving a number is
 * not the same as having an account. A farmer becomes a row when he posts his
 * first listing, a buyer when he registers; both flows already do that, and
 * inventing an empty row here would put unverified strangers in the tables
 * the admin desks read.
 *
 * WHERE THE FARMER LANDS. A farmer who already has listings goes to
 * /farmer/listings; a farmer with none goes on to the listing form, which is
 * where the Figma flow sent every farmer unconditionally. The old behaviour
 * dropped a returning farmer into a blank form to post a second listing when
 * what he came for was the one he already has. `hasListings` is computed here
 * rather than guessed in the browser because the browser cannot see the table.
 *
 * THE COOKIE IT SETS IS SIGNED. The value is a token carrying the mobile, the
 * door and an expiry under an HMAC keyed with SESSION_SECRET, so a cookie
 * that did not come from this route does not verify and is treated as no
 * session at all. See src/lib/otpSession.ts.
 *
 * ATTEMPTS AND EXPIRY ARE NOT THIS FILE'S BUSINESS. Every rule — five
 * attempts, single use, ten minutes, one live code per door — is inside
 * otp_verify() in migration 016, under a row lock, because two tabs
 * submitting at once must burn two attempts rather than reading the same
 * counter twice. This route maps the outcome to a status and a cookie.
 *
 * WRONG AND EXPIRED ARE DISTINGUISHED to the farmer but not to a crawler:
 * both are 401 with different codes, and a number that was never sent a code
 * gets the same 401 as a wrong one, so the endpoint cannot be used to ask
 * which mobiles have accounts.
 */

export async function POST(request: Request) {
  let mobile = '';
  let code = '';
  let door: unknown = '';
  try {
    const body = await request.json();
    mobile = typeof body?.mobile === 'string' ? body.mobile.trim() : '';
    code = typeof body?.code === 'string' ? body.code.trim() : '';
    door = body?.door;
  } catch {
    return NextResponse.json({ error: 'expected_json' }, { status: 400 });
  }

  if (!MOBILE_RE.test(mobile) || !isDoor(door)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code)) {
    /* Not counted as an attempt: it never reaches the database. A six-digit
       box cannot produce this, so it is a malformed call, not a wrong guess. */
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase.rpc('otp_verify', {
      p_mobile: mobile,
      p_door: door,
      p_code_hash: hashCode({ mobile, door, code }),
    });
    if (error) throw error;

    const result = data as {
      outcome: 'ok' | 'wrong_code' | 'expired' | 'too_many_attempts' | 'no_challenge';
      attempts_left?: number;
      max_attempts?: number;
    };

    if (result.outcome !== 'ok') {
      const status = result.outcome === 'too_many_attempts' ? 429 : 401;
      return NextResponse.json(
        {
          error: result.outcome,
          attemptsLeft: result.attempts_left,
          maxAttempts: result.max_attempts,
        },
        { status },
      );
    }

    /* Verified. From here the number is proven, and this is the only place in
       the codebase that may say so. */
    let hasListings = false;
    if (door === 'farmer') {
      const { data: farmer } = await supabase
        .from('farmers')
        .select('id')
        .eq('mobile', mobile)
        .maybeSingle();
      if (farmer) {
        const { count } = await supabase
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('farmer_id', farmer.id)
          .in('status', ['active', 'sold']);
        hasListings = (count ?? 0) > 0;
      }
    }

    const response = NextResponse.json({ ok: true, door, hasListings });
    const { value } = createSessionToken(mobile, door);
    response.cookies.set(cookieNameFor(door), value, SESSION_COOKIE_OPTIONS);
    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[otp/verify] failed', message);
    /* Fail closed: an error here is not a pass. */
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
