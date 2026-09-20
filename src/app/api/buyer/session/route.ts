import { NextResponse } from 'next/server';
import { BUYER_MOBILE_COOKIE, SESSION_COOKIE_OPTIONS } from '@/lib/otpSession';

/**
 * DELETE /api/buyer/session — clear the buyer session. The exact twin of
 * /api/farmer/session, for the same reason.
 *
 * THE POST HANDLER IS GONE. It used to take a mobile number from the request
 * body and write it into the session cookie, so possession of a wallet was a
 * matter of asking for one. The cookie is now minted only by
 * /api/otp/verify, from a proved number, as a signed token — see
 * src/lib/otpSession.ts.
 *
 * /api/buyer/register used to call this route's job inline, setting a session
 * for whoever had just filled in the form. It no longer does: registering is
 * not proving a number, and a buyer signs in through the OTP door like
 * everyone else.
 */

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(BUYER_MOBILE_COOKIE, '', { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return res;
}
