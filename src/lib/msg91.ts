import 'server-only';

/**
 * MSG91, over the REST API. No SDK — the same judgement as src/lib/razorpay.ts:
 * one call is needed and it is a few lines, so a dependency that ships its own
 * HTTP client for it is more surface than it saves.
 *
 * SECRETS COME FROM THE ENVIRONMENT AND NOWHERE ELSE. Nothing in this file
 * holds a key, a fallback or a default, and nothing here logs one.
 *
 *   MSG91_AUTH_KEY          panel -> Settings -> API Keys   SERVER ONLY
 *   MSG91_SENDER_ID         the DLT header, PDYLNK          SERVER ONLY
 *   MSG91_TEMPLATE_ID_OTP   DLT id for PADDYLINK_LOGIN_OTP  SERVER ONLY
 *
 * None is prefixed NEXT_PUBLIC_. An SMS is never sent from a browser, so none
 * of these has any business being in a bundle.
 *
 * THE APPROVED TEMPLATE, at Jio, one variable — the six-digit code:
 *
 *   Your PaddyLink verification code is {#number#}. Valid for 10 minutes.
 *   Do not share it with anyone. - KALBANTT TECH (OPC) PRIVATE LIMITED
 *
 * "Valid for 10 minutes" is a promise printed on a farmer's phone, so the
 * expiry is not a number this file may choose. It lives in cfg('otp')
 * .ttl_minutes, seeded to 10 by migration 016, and the comment there says the
 * template must be re-approved if it ever moves.
 *
 * WHY THE v5 OTP ENDPOINT AND NOT THE FLOW ENDPOINT. /api/v5/otp accepts an
 * `otp` parameter, which means WE generate the code — with a CSPRNG, and with
 * a keyed hash of it stored where it can be verified. Letting MSG91 generate
 * and hold the code would put the one secret that gates every farmer account
 * in a system we cannot audit, and would make the "single use, 5 attempts,
 * 10 minutes" rules theirs to enforce rather than ours.
 *
 * MSG91 ANSWERS 200 WHEN IT FAILS. A rejected template, an exhausted wallet
 * and an invalid key all come back as HTTP 200 with {"type":"error"} in the
 * body. Reading res.ok and calling it sent is the exact bug that would leave a
 * farmer waiting for an SMS that was never bought, so the body is parsed and
 * `type` decides — never the status code alone.
 */

/** Where the failure was, in the only terms the caller has to act on. */
export type Msg91FailureKind =
  /** Environment is incomplete. A deployment fault, not a provider outage. */
  | 'not_configured'
  /** The account is out of SMS credit. Nothing will send until it is topped up. */
  | 'credits_exhausted'
  /** DLT/template/sender rejected. Retrying the same send will fail the same way. */
  | 'template_rejected'
  /** Reached them, they said no, and we do not know it is permanent. */
  | 'provider_error'
  /** Never got an answer inside the budget, or the network refused. */
  | 'unreachable';

export class Msg91Error extends Error {
  readonly kind: Msg91FailureKind;
  /** MSG91's own words, for the operator. Safe to log; carries no key. */
  readonly providerMessage: string;

  constructor(kind: Msg91FailureKind, providerMessage: string) {
    super(`msg91_${kind}: ${providerMessage}`);
    this.name = 'Msg91Error';
    this.kind = kind;
    this.providerMessage = providerMessage;
  }
}

interface Msg91Credentials {
  authKey: string;
  senderId: string;
  templateIdOtp: string;
}

/**
 * Throws rather than falling back — a missing key must not become a fake one.
 * The thrown error is a not_configured Msg91Error, so the route reports the
 * same fail-closed refusal it reports for an outage: from the farmer's side
 * an unconfigured server and a dead provider are the same event, and neither
 * may let him in.
 */
function credentials(): Msg91Credentials {
  const authKey = process.env.MSG91_AUTH_KEY;
  const senderId = process.env.MSG91_SENDER_ID;
  const templateIdOtp = process.env.MSG91_TEMPLATE_ID_OTP;

  const missing = [
    !authKey && 'MSG91_AUTH_KEY',
    !senderId && 'MSG91_SENDER_ID',
    !templateIdOtp && 'MSG91_TEMPLATE_ID_OTP',
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Msg91Error(
      'not_configured',
      `missing ${missing.join(', ')} — set in .env.local (see .env.example)`,
    );
  }
  return {
    authKey: authKey as string,
    senderId: senderId as string,
    templateIdOtp: templateIdOtp as string,
  };
}

const OTP_ENDPOINT = 'https://control.msg91.com/api/v5/otp';

/** A farmer will not wait, and a hung socket must not hold his request open. */
const TIMEOUT_MS = 8000;

/**
 * MSG91's error prose, sorted into the kinds above. Their API returns no
 * stable machine code for these, so the text is what there is; the match is
 * deliberately loose and everything unrecognised stays 'provider_error',
 * which is the safe bucket — it tells the operator to look rather than
 * claiming to know.
 */
function classify(message: string): Msg91FailureKind {
  const m = message.toLowerCase();
  if (m.includes('balance') || m.includes('credit') || m.includes('insufficient')) {
    return 'credits_exhausted';
  }
  if (m.includes('template') || m.includes('dlt') || m.includes('sender') || m.includes('header')) {
    return 'template_rejected';
  }
  return 'provider_error';
}

/**
 * Sends one login code. Resolves on a confirmed dispatch; throws Msg91Error
 * on anything else. There is no third outcome and no "probably sent" — the
 * caller uses this to decide whether a farmer may be shown a code box, so an
 * ambiguous answer has to be a failure.
 *
 * THE CODE IS NOT LOGGED, here or anywhere below. It is in the request and in
 * nothing else: not in a thrown message, not in a console line, not in the
 * notification_queue row the caller writes.
 *
 * DEV STUB. With OTP_DEV_SKIP_SMS=true and NODE_ENV !== 'production', no
 * request is made and the code is printed to the SERVER console — the only
 * way to exercise the happy path on a machine that cannot receive SMS. The
 * NODE_ENV guard is not a courtesy: in a production build the flag is ignored
 * and the real send happens, so this cannot be switched on by an environment
 * mistake. It is also not a bypass — the code still has to be typed, still
 * has to match the stored hash, still expires, and still burns attempts.
 */
export async function sendLoginOtp(params: { mobile: string; code: string }): Promise<void> {
  const { mobile, code } = params;

  if (process.env.OTP_DEV_SKIP_SMS === 'true' && process.env.NODE_ENV !== 'production') {
    console.warn(
      `[msg91] OTP_DEV_SKIP_SMS — no SMS sent. Login code for +91 ${mobile} is ${code}`,
    );
    return;
  }

  const { authKey, senderId, templateIdOtp } = credentials();

  const url = new URL(OTP_ENDPOINT);
  url.searchParams.set('template_id', templateIdOtp);
  url.searchParams.set('mobile', `91${mobile}`);
  url.searchParams.set('otp', code);
  url.searchParams.set('sender', senderId);
  url.searchParams.set('otp_length', String(code.length));
  url.searchParams.set('otp_expiry', '10');

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { authkey: authKey, 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (e) {
    // AbortError on timeout, TypeError on DNS/connection refusal. The farmer
    // cannot tell them apart and neither can act on the difference.
    const reason = e instanceof Error ? e.name : String(e);
    throw new Msg91Error('unreachable', `${reason} after ${TIMEOUT_MS}ms`);
  }

  const raw = await res.text();
  let body: { type?: string; message?: unknown } = {};
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    // HTML error page, gateway notice, anything. Not a dispatch.
    throw new Msg91Error('provider_error', `HTTP ${res.status}, non-JSON body`);
  }

  // message can be a string, or an object keyed by mobile. Flatten for logs.
  const message =
    typeof body.message === 'string' ? body.message : JSON.stringify(body.message ?? '');

  if (!res.ok) {
    throw new Msg91Error(classify(message), `HTTP ${res.status} ${message}`.trim());
  }

  // The important line in this file. 200 is not success; type is.
  if (body.type !== 'success') {
    throw new Msg91Error(classify(message), message || `unexpected type ${String(body.type)}`);
  }
}
