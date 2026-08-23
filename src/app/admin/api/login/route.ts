import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_OPTIONS,
  createAdminToken,
} from '@/lib/adminSession';

/**
 * POST /admin/api/login — the one open door into the admin portal.
 *
 * The password is checked SERVER-side against ADMIN_PASSWORD from .env.local
 * and never leaves this handler. On success a signed, httpOnly, secure
 * cookie carries an 8-hour session (see src/lib/adminSession.ts).
 *
 * TEMP-SINGLE-ADMIN — one shared password; per-staff accounts replace this
 * once OTP/auth lands.
 */

/** The placeholder shipped in .env.local — refused outright so the portal
 *  cannot be entered until a real password has been set. */
const PLACEHOLDER = 'REPLACE-WITH-REAL-ADMIN-PASSWORD';

function safeEqual(a: string, b: string): boolean {
  // Hash both sides first: equal-length buffers for timingSafeEqual, and no
  // length information leaks either.
  const ha = createHash('sha256').update(a, 'utf8').digest();
  const hb = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(ha, hb);
}

export async function POST(request: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected === PLACEHOLDER) {
    // Not "wrong password" — the portal is simply not configured yet.
    return NextResponse.redirect(new URL('/admin/login?error=unconfigured', request.url), 303);
  }

  let given = '';
  try {
    const form = await request.formData();
    const v = form.get('password');
    given = typeof v === 'string' ? v : '';
  } catch {
    /* fall through to the failure branch */
  }

  if (!given || !safeEqual(given, expected)) {
    // A small fixed delay keeps a single shared password from being cheap to
    // brute-force. Real rate limiting arrives with per-staff auth.
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.redirect(new URL('/admin/login?error=wrong', request.url), 303);
  }

  const token = createAdminToken();
  const response = NextResponse.redirect(new URL('/admin/buyers', request.url), 303);
  response.cookies.set(ADMIN_COOKIE, token.value, {
    ...ADMIN_COOKIE_OPTIONS,
    expires: new Date(token.expiresAtMs),
  });
  return response;
}
