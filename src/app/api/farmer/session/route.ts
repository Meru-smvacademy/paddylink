import { NextResponse } from 'next/server';
import { FARMER_MOBILE_COOKIE, SESSION_COOKIE_OPTIONS } from '@/lib/otpSession';

/**
 * DELETE /api/farmer/session — clear the farmer session.
 *
 * THE POST HANDLER IS GONE, and that deletion is the point of this change.
 * It used to take a mobile number from the request body and write it into the
 * session cookie, which meant the browser named its own user: anyone could
 * call this route with any number and be treated as that farmer. The cookie
 * is now minted only by /api/otp/verify, only from a number that route has
 * just proved, and only as a signed token (src/lib/otpSession.ts). There is
 * no longer any way to ask the server to believe you are someone.
 *
 * What is left is the ability to stop being someone, which needs no proof and
 * is safe to call with no session at all. /farmer/logout is what the ಲಾಗ್ ಔಟ್
 * button uses, because a plain form cannot send DELETE; this stays for
 * callers that can.
 */

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(FARMER_MOBILE_COOKIE, '', { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return res;
}
