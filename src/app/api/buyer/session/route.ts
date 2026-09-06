import { NextResponse } from 'next/server';

/**
 * POST /api/buyer/session — remember which buyer is on this device.
 *
 * TEMP-PRE-AUTH, and the whole file goes when real OTP lands. It is the exact
 * twin of /api/farmer/session, for the same reason and with the same caveat.
 *
 * The wallet has to know whose balance to show, and there is no session to
 * ask, so the mobile number goes in an httpOnly cookie and is read back on
 * the server. httpOnly because the number is personal data: page scripts
 * cannot read it, and it never travels in a URL where it would land in
 * history, logs or a Referer header.
 *
 * What this is NOT: proof of identity. Nothing here verifies the number
 * belongs to whoever is holding it — the same hole the farmer session route
 * documents, and the reason no real money should move through the live keys
 * until OTP is in front of it.
 *
 * WHO CALLS IT TODAY: /api/buyer/register, on a successful registration, so a
 * buyer who has just signed up has a session without a second step.
 *
 * WHO SHOULD CALL IT NEXT: the buyer branch of the OTP flow, which currently
 * pushes to /buyer/listings without recording anything. That file is out of
 * scope for this change, so the one line is NOT added here — see the note in
 * the commit message. Until it is, a buyer returning on a fresh device has no
 * session and the wallet says so rather than guessing.
 */

export const BUYER_MOBILE_COOKIE = 'pl_buyer_mobile';

/** Long enough for one sitting, short enough not to linger on a shared phone. */
const MAX_AGE_SECONDS = 12 * 60 * 60;

export const BUYER_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: MAX_AGE_SECONDS,
} as const;

export async function POST(request: Request) {
  let mobile = '';
  try {
    const body = await request.json();
    mobile = typeof body?.mobile === 'string' ? body.mobile.trim() : '';
  } catch {
    return NextResponse.json({ error: 'expected_json' }, { status: 400 });
  }

  if (!/^\d{10}$/.test(mobile)) {
    return NextResponse.json({ error: 'invalid_mobile' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(BUYER_MOBILE_COOKIE, mobile, BUYER_COOKIE_OPTIONS);
  return res;
}

/** Sign out: used by nothing yet, but the cookie must be clearable. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(BUYER_MOBILE_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
