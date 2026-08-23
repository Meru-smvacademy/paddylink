import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, adminLanding, verifyAdminToken } from '@/lib/adminSession';

/**
 * The outer gate on the admin portal. Every /admin/* request — pages AND the
 * route handlers under /admin/api/* — passes through here. Unauthenticated
 * hits are turned away; authenticated STAFF are kept out of admin-only
 * surfaces. Pages and handlers verify role AGAIN themselves
 * (src/lib/adminAuth.ts): the proxy docs warn that a matcher refactor can
 * silently drop coverage, so the proxy is a gate, not the only lock.
 *
 * TEMP-TWO-TIER — two shared passwords, roles 'admin' and 'staff'.
 */

/** The only /admin paths reachable without a session: the login page, the
 *  POST that checks the password, and logout. */
const OPEN_ADMIN_PATHS = new Set(['/admin/login', '/admin/api/login', '/admin/logout']);

/**
 * Admin-only paths — staff may not reach these. Everything else under /admin
 * (the route list, the quality desk and its API) is open to both roles.
 * The listings ADMIN table is admin-only, but its route-list child is not,
 * so listings is matched with that one carve-out.
 */
function isAdminOnly(pathname: string): boolean {
  if (pathname === '/admin') return true;
  if (pathname.startsWith('/admin/buyers')) return true;
  if (pathname.startsWith('/admin/overview')) return true;
  if (pathname === '/admin/api/kyc') return true;
  if (pathname === '/admin/api/listings') return true;
  if (pathname.startsWith('/admin/listings') && !pathname.startsWith('/admin/listings/routes')) {
    return true;
  }
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value);

  let response: NextResponse;
  if (OPEN_ADMIN_PATHS.has(pathname)) {
    response =
      session && pathname === '/admin/login'
        ? // Already signed in — straight to the role's own landing.
          NextResponse.redirect(new URL(adminLanding(session.role), request.url))
        : NextResponse.next();
  } else if (!session) {
    response = pathname.startsWith('/admin/api/')
      ? // API callers get a plain 401, not an HTML login page.
        NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
      : NextResponse.redirect(new URL('/admin/login', request.url));
  } else if (session.role !== 'admin' && isAdminOnly(pathname)) {
    // Authenticated staff reaching an admin-only surface: 403 for APIs, a
    // bounce to their own desk for pages.
    response = pathname.startsWith('/admin/api/')
      ? NextResponse.json({ error: 'forbidden' }, { status: 403 })
      : NextResponse.redirect(new URL(adminLanding(session.role), request.url));
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
