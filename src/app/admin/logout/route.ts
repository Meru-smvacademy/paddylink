import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, ADMIN_COOKIE_OPTIONS } from '@/lib/adminSession';

/**
 * /admin/logout — clears the admin session cookie and returns to the login
 * screen. POST is what the chrome's Sign out button sends; GET is kept so a
 * typed /admin/logout also works. Clearing a cookie is idempotent and safe
 * for a logged-out caller, so this path is open in the proxy.
 */

function clearAndRedirect(request: Request) {
  const response = NextResponse.redirect(new URL('/admin/login', request.url), 303);
  response.cookies.set(ADMIN_COOKIE, '', { ...ADMIN_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}

export async function POST(request: Request) {
  return clearAndRedirect(request);
}

export async function GET(request: Request) {
  return clearAndRedirect(request);
}
