import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Msg91Error, sendLoginOtp } from '@/lib/msg91';
import { generateCode, hashCode, isDoor, MOBILE_RE } from '@/lib/otpCode';

/**
 * POST /api/otp/send — issue a login code and put it on a phone.
 *
 * One route for both doors. /login/farmer and /login/buyer render the same
 * component with a `door` prop, and the code they ask for differs only in
 * which cookie it will eventually mint, so a second route would have been
 * the same file twice.
 *
 * THE ORDER OF OPERATIONS, AND WHY IT IS THIS WAY ROUND:
 *
 *   1. validate the number and the door
 *   2. generate the code HERE, in this process, from a CSPRNG
 *   3. otp_request() — rate limit, supersede the old code, store the hash
 *   4. send the SMS
 *   5. if the send failed, otp_abandon() the row step 3 wrote
 *
 * Steps 3 and 4 are in that order because the rate limit has to be enforced
 * BEFORE an SMS can be bought, not after — otherwise the limit is advisory
 * and the bill is not. The cost of that ordering is a window where a code
 * exists that nobody was told, which is what step 5 closes: the row is
 * consumed as send_failed, so a farmer can never be refused with
 * "temporarily unavailable" while a live code sits in the table.
 *
 * FAIL CLOSED (CEO ruling, this change). A provider error, a timeout, an
 * empty MSG91 wallet and missing configuration all end the same way: 503,
 * no code, and a screen that says login is unavailable and gives a number to
 * call. There is no bypass, no fallback channel, and no path that admits
 * anyone without a verified code.
 *
 * EVERY FAILURE IS RECORDED with MSG91's own words, in
 * public.notification_queue — the table 001 built for exactly this, with
 * status, attempts, sent_via and error_message already on it. The admin
 * overview can read it later without a new table or a new migration.
 *
 * THE CODE IS NEVER IN THE RESPONSE. Not in dev, not behind a flag. The dev
 * stub in src/lib/msg91.ts prints it to the SERVER console, which a browser
 * cannot read — so no build of this route can be talked into handing a code
 * to whoever asked for it.
 */

/** The farmer's own second copy of the fail-closed message lives on the
 *  screen; this is the number it prints, kept here so route and component
 *  cannot drift. */
export const SUPPORT_MOBILE = '7483759960';

/** Best effort, and null when it is not a plain address — otp_log.ip is inet
 *  and a malformed value would fail the insert that records the request. */
function clientIp(request: Request): string | null {
  const raw = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (!raw) return null;
  const v4 = /^\d{1,3}(\.\d{1,3}){3}$/;
  const v6 = /^[0-9a-f:]+$/i;
  return v4.test(raw) || v6.test(raw) ? raw : null;
}

export async function POST(request: Request) {
  let mobile = '';
  let door: unknown = '';
  try {
    const body = await request.json();
    mobile = typeof body?.mobile === 'string' ? body.mobile.trim() : '';
    door = body?.door;
  } catch {
    return NextResponse.json({ error: 'expected_json' }, { status: 400 });
  }

  if (!MOBILE_RE.test(mobile)) {
    return NextResponse.json({ error: 'invalid_mobile' }, { status: 400 });
  }
  if (!isDoor(door)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const userAgent = request.headers.get('user-agent')?.slice(0, 500) ?? null;

  /* Generated in this process and held in a local for the length of one
     request. It is written nowhere and returned to no one. */
  const code = generateCode();

  let challengeId: number | null = null;
  try {
    const { data, error } = await supabase.rpc('otp_request', {
      p_mobile: mobile,
      p_door: door,
      p_code_hash: hashCode({ mobile, door, code }),
      p_ip: clientIp(request),
      p_user_agent: userAgent,
    });
    if (error) throw error;

    const result = data as {
      outcome: 'issued' | 'rate_limited';
      challenge_id?: number;
      ttl_seconds?: number;
      retry_after_seconds?: number;
      window_minutes?: number;
      max_sends?: number;
    };

    if (result.outcome === 'rate_limited') {
      /* Not a silent failure and not a generic error: the screen is told how
         long, so it can say so in words rather than leaving a farmer tapping
         a button that will not work. */
      return NextResponse.json(
        {
          error: 'rate_limited',
          retryAfterSeconds: result.retry_after_seconds ?? 900,
          windowMinutes: result.window_minutes ?? 15,
          maxSends: result.max_sends ?? 3,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(result.retry_after_seconds ?? 900) },
        },
      );
    }

    challengeId = result.challenge_id ?? null;

    await sendLoginOtp({ mobile, code });

    /* Dispatched. One row so the operator can see the send beside its
       failures; the payload deliberately carries no code. */
    await supabase.from('notification_queue').insert({
      event_type: 'login_otp',
      recipient_mobile: mobile,
      language: 'kn',
      payload: { door, purpose: 'login' },
      status: 'sent',
      attempts: 1,
      sent_via: 'sms',
      sent_at: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      ttlSeconds: result.ttl_seconds ?? 600,
      sendsUsed: (result as { sends_used?: number }).sends_used ?? 1,
      maxSends: result.max_sends ?? 3,
    });
  } catch (e) {
    const isProvider = e instanceof Msg91Error;
    const providerMessage = isProvider ? e.providerMessage : describe(e);
    const kind = isProvider ? e.kind : 'server_error';

    /* Loud, and with MSG91's own words. This is the line that tells the
       operator the wallet is empty rather than leaving it to be inferred
       from farmers who stopped arriving. */
    console.error(`[otp/send] SEND FAILED kind=${kind} mobile=***${mobile.slice(-4)}`, providerMessage);

    /* Kill the code nobody was told about. Best effort by necessity — if this
       itself fails the row simply expires in ten minutes, which is why the
       route still refuses below rather than depending on it. */
    if (challengeId !== null) {
      const { error: abandonErr } = await supabase.rpc('otp_abandon', {
        p_challenge_id: challengeId,
      });
      if (abandonErr) {
        console.error('[otp/send] could not abandon challenge', abandonErr.message);
      }
    }

    /* The durable record, for the admin overview. Written after the abandon
       so a failure here cannot leave a live code behind. */
    const { error: logErr } = await supabase.from('notification_queue').insert({
      event_type: 'login_otp',
      recipient_mobile: mobile,
      language: 'kn',
      payload: { door, purpose: 'login', failure_kind: kind },
      status: 'failed',
      attempts: 1,
      sent_via: 'sms',
      error_message: providerMessage.slice(0, 1000),
    });
    if (logErr) {
      console.error('[otp/send] could not record the failure', logErr.message);
    }

    /* FAIL CLOSED. Every branch above ends here: no code was delivered, so
       nobody gets in. The screen renders the Kannada/English notice and the
       number to call. */
    return NextResponse.json(
      { error: 'sms_unavailable', supportMobile: SUPPORT_MOBILE },
      { status: 503 },
    );
  }
}

/** Supabase errors are plain objects; String(e) on one yields [object Object]
 *  and hides the cause. Same shape as the register route's helper. */
function describe(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object') {
    const o = e as { message?: string; details?: string; hint?: string; code?: string };
    return [o.code, o.message, o.details, o.hint].filter(Boolean).join(' | ') || JSON.stringify(e);
  }
  return String(e);
}
