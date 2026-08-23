import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_OPTIONS,
  adminLanding,
  createAdminToken,
  type AdminRole,
} from '@/lib/adminSession';

/**
 * POST /admin/api/login — the one open door into the admin portal.
 *
 * The password is checked SERVER-side and never leaves this handler. The
 * password decides the role: ADMIN_PASSWORD → 'admin' (every desk),
 * STAFF_PASSWORD → 'staff' (route list + quality only). There is no role
 * selector on the form. On success a signed, httpOnly, secure cookie carries
 * an 8-hour session (see src/lib/adminSession.ts).
 *
 * TEMP-TWO-TIER — two shared passwords; per-staff accounts replace this once
 * OTP/auth lands.
 */

/** The placeholders shipped in .env.local — refused outright so a role
 *  cannot be entered until a real password has been set for it. */
const ADMIN_PLACEHOLDER = 'REPLACE-WITH-REAL-ADMIN-PASSWORD';
const STAFF_PLACEHOLDER = 'REPLACE-WITH-REAL-STAFF-PASSWORD';

function safeEqual(a: string, b: string): boolean {
  // Hash both sides first: equal-length buffers for timingSafeEqual, and no
  // length information leaks either.
  const ha = createHash('sha256').update(a, 'utf8').digest();
  const hb = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(ha, hb);
}

export async function POST(request: Request) {
  const adminPw = process.env.ADMIN_PASSWORD;
  const staffPw = process.env.STAFF_PASSWORD;
  const adminOk = !!adminPw && adminPw !== ADMIN_PLACEHOLDER;
  const staffOk = !!staffPw && staffPw !== STAFF_PLACEHOLDER;
  if (!adminOk && !staffOk) {
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

  // The password decides the role. Admin is checked first so that, in the
  // (misconfigured) case of both passwords being equal, the stronger role
  // wins.
  let role: AdminRole | null = null;
  if (given && adminOk && safeEqual(given, adminPw!)) role = 'admin';
  else if (given && staffOk && safeEqual(given, staffPw!)) role = 'staff';

  if (!role) {
    // A small fixed delay keeps a shared password from being cheap to
    // brute-force. Real rate limiting arrives with per-staff auth.
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.redirect(new URL('/admin/login?error=wrong', request.url), 303);
  }

  const token = createAdminToken(role);
  const response = NextResponse.redirect(new URL(adminLanding(role), request.url), 303);
  response.cookies.set(ADMIN_COOKIE, token.value, {
    ...ADMIN_COOKIE_OPTIONS,
    expires: new Date(token.expiresAtMs),
  });
  return response;
}
