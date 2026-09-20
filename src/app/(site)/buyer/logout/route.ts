import { NextResponse } from 'next/server';
import { BUYER_MOBILE_COOKIE, SESSION_COOKIE_OPTIONS } from '@/lib/otpSession';

/**
 * /buyer/logout — clears the buyer session cookie and returns to the buyer
 * sign-in screen. The twin of /admin/logout, deliberately the same shape:
 * POST is what the surfaces' Sign out button sends; GET is kept so a typed
 * /buyer/logout also works. Clearing a cookie is idempotent and safe for a
 * caller who has no session, so neither verb checks for one first.
 *
 * /api/buyer/session already had a DELETE that clears the same cookie, but a
 * plain <form> cannot send DELETE, and the whole point of the admin pattern
 * is that signing out needs no client JS. That handler stays where it is.
 */

function clearAndRedirect(request: Request) {
  const response = NextResponse.redirect(new URL('/login/buyer', request.url), 303);
  response.cookies.set(BUYER_MOBILE_COOKIE, '', { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}

export async function POST(request: Request) {
  return clearAndRedirect(request);
}

export async function GET(request: Request) {
  return clearAndRedirect(request);
}
