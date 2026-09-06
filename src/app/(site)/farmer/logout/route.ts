import { NextResponse } from 'next/server';
import { FARMER_MOBILE_COOKIE } from '@/app/api/farmer/session/route';

/**
 * /farmer/logout — clears the farmer session cookie and returns to the farmer
 * sign-in screen. The twin of /admin/logout and of /buyer/logout, the same
 * shape as both: POST is what the surfaces' ಲಾಗ್ ಔಟ್ button sends, GET is kept
 * so a typed /farmer/logout also works, and neither checks for a session
 * first because clearing a cookie is idempotent.
 *
 * The cookie options are written out rather than imported: the farmer session
 * route sets them inline and exports no options object, so this mirrors what
 * its own DELETE handler does. path must match the path the cookie was set
 * with or the browser keeps it.
 */

function clearAndRedirect(request: Request) {
  const response = NextResponse.redirect(new URL('/login/farmer', request.url), 303);
  response.cookies.set(FARMER_MOBILE_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}

export async function POST(request: Request) {
  return clearAndRedirect(request);
}

export async function GET(request: Request) {
  return clearAndRedirect(request);
}
