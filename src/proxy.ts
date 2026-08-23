import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/adminSession';

/**
 * The outer gate on the admin portal. Every /admin/* request — pages AND the
 * route handlers under /admin/api/* — passes through here, and anything
 * without a valid signed session cookie is turned away before a route ever
 * renders. The pages and handlers verify the cookie AGAIN themselves
 * (src/lib/adminAuth.ts): the proxy docs warn that a matcher refactor can
 * silently drop coverage, so the proxy is a gate, not the only lock.
 *
 * TEMP-SINGLE-ADMIN — one shared password, actor identity 'admin'.
 * Replaced by per-staff accounts once OTP/auth lands.
 */

/** The only /admin paths reachable without a session: the login page, the
 *  POST that checks the password, and logout (clearing a cookie while
 *  already logged out is harmless and must not bounce through login). */
const OPEN_ADMIN_PATHS = new Set(['/admin/login', '/admin/api/login', '/admin/logout']);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value);

  let response: NextResponse;
  if (OPEN_ADMIN_PATHS.has(pathname)) {
    response =
      authed && pathname === '/admin/login'
        ? // Already signed in — straight to the desk.
          NextResponse.redirect(new URL('/admin/buyers', request.url))
        : NextResponse.next();
  } else if (!authed) {
    response = pathname.startsWith('/admin/api/')
      ? // API callers get a plain 401, not an HTML login page.
        NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
      : NextResponse.redirect(new URL('/admin/login', request.url));
  } else {
    response = NextResponse.next();
  }

  // Nothing under /admin may reach a search index, whatever the route's own
  // metadata says — this covers route handlers and error pages too.
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = {
  matcher: '/admin/:path*',
};
