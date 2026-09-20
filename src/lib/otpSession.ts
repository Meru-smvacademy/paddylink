import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { sessionSecret, type Door } from '@/lib/otpCode';

/**
 * The farmer and buyer session — a signed, httpOnly cookie carrying a mobile
 * number that /api/otp/verify has PROVED, and that nothing else can mint.
 *
 * WHAT THIS REPLACES. Until now the cookie held the bare number and the
 * server believed whatever was in it. Two routes would write one on request
 * (/api/farmer/session, /api/buyer/session), so possession of the cookie
 * proved nothing: a forged value was indistinguishable from a real one,
 * because there was nothing to distinguish. Now the value carries an HMAC
 * over (mobile, door, expiry) and a cookie that does not verify is not a
 * session — it is discarded exactly as if it were absent.
 *
 * Token shape: "<mobile>.<door>.<expiresAtMs>.<hex hmac-sha256>", the same
 * design as src/lib/adminSession.ts, and for the same reason: no session
 * store, so possession of a validly signed, unexpired token IS the session,
 * and logout is a cleared cookie rather than a row somewhere.
 *
 * THE DOOR IS INSIDE THE SIGNATURE. A farmer token presented at a buyer
 * surface fails, and vice versa, so one verified number cannot be walked
 * sideways into the other side of the market.
 *
 * KEYED WITH SESSION_SECRET, NOT ADMIN_SESSION_SECRET. Deliberately: a leak
 * of one secret must not let anybody mint the other's sessions. Rotating
 * SESSION_SECRET signs every farmer and buyer out and voids every OTP in
 * flight — which is the correct response to a leak, not a side effect.
 *
 * STILL TEMP-PRE-AUTH, AND HONESTLY SO. The number is now proven, but these
 * sessions are not Supabase Auth sessions: there is no auth.uid(), so the
 * reads and writes behind them continue to run on the service-role client
 * with RLS bypassed, and the route handler remains the security boundary.
 * What changed is that the boundary now knows who it is talking to. Moving
 * those paths onto the buyer's and farmer's own RLS policies — which 001, 004
 * and 011 already wrote — needs auth.users rows and is its own piece of work.
 */

export const FARMER_MOBILE_COOKIE = 'pl_farmer_mobile';
export const BUYER_MOBILE_COOKIE = 'pl_buyer_mobile';

/** Long enough for one sitting, short enough not to linger on a shared phone.
 *  The twelve hours both session routes have always used. */
export const SESSION_HOURS = 12;

/** secure is safe on localhost — Chromium and Firefox both treat it as a
 *  trustworthy origin — but the existing routes gated it on NODE_ENV and a
 *  cookie that stops being set in dev is a debugging trap, so that is kept. */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_HOURS * 60 * 60,
} as const;

export function cookieNameFor(door: Door): string {
  return door === 'farmer' ? FARMER_MOBILE_COOKIE : BUYER_MOBILE_COOKIE;
}

function sign(mobile: string, door: Door, expiresAtMs: number): string {
  return createHmac('sha256', sessionSecret())
    .update(`session:${mobile}.${door}.${expiresAtMs}`)
    .digest('hex');
}

/** A fresh token. Called by /api/otp/verify and by nothing else. */
export function createSessionToken(
  mobile: string,
  door: Door,
): { value: string; expiresAtMs: number } {
  const expiresAtMs = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  return {
    value: `${mobile}.${door}.${expiresAtMs}.${sign(mobile, door, expiresAtMs)}`,
    expiresAtMs,
  };
}

/**
 * The verified mobile, or null for anything malformed, expired, unsigned,
 * signed for the other door, or left over from before this change.
 *
 * FAILS CLOSED ON A MISSING SECRET. sessionSecret() throws, and that throw is
 * deliberately not swallowed: a deployment without SESSION_SECRET must refuse
 * every session loudly rather than quietly treating everyone as signed out,
 * which would look like a UX bug and hide a broken deployment.
 */
export function verifySessionToken(token: string | undefined | null, door: Door): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 4) return null;

  const [mobile, tokenDoor, expRaw, mac] = parts;
  if (!/^\d{10}$/.test(mobile)) return null;
  if (tokenDoor !== door) return null;
  if (!/^\d{1,15}$/.test(expRaw) || !/^[0-9a-f]{64}$/.test(mac)) return null;

  const expiresAtMs = Number(expRaw);
  if (!Number.isFinite(expiresAtMs) || Date.now() >= expiresAtMs) return null;

  const expected = sign(mobile, door, expiresAtMs);
  // Both sides are 64 hex chars by the regex above, so the lengths match and
  // timingSafeEqual cannot throw. Constant-time because a fast !== on a hex
  // string leaks, byte by byte, how much of a forgery was right.
  if (!timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(expected, 'hex'))) return null;

  return mobile;
}

/**
 * The one call every page and route should use to ask who is here. Returns
 * the proven mobile or null; there is no variant that returns an unverified
 * value, because a caller that has one will eventually trust it.
 */
export async function sessionMobile(door: Door): Promise<string | null> {
  const raw = (await cookies()).get(cookieNameFor(door))?.value;
  return verifySessionToken(raw, door);
}

export const farmerMobile = () => sessionMobile('farmer');
export const buyerMobile = () => sessionMobile('buyer');
