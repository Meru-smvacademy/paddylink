import { NextResponse } from 'next/server';

/**
 * POST /api/farmer/session — remember which farmer is on this device.
 *
 * TEMP-PRE-AUTH, and the whole file goes when real OTP lands.
 *
 * /farmer/listings has to know whose listings to show. With no auth there is
 * no session, so the mobile number entered at the OTP step is put in an
 * httpOnly cookie and read back on the server. httpOnly because the number is
 * personal data: page scripts cannot read it, and it never travels in a URL
 * where it would end up in history, logs or a Referer header.
 *
 * What this is NOT: proof of identity. Nothing here verifies the number
 * belongs to whoever typed it — anyone can call this route with any number
 * and see that farmer's listings. That is the same hole the listing route
 * documents, and it is why no real farmers are on the platform yet. When OTP
 * is live, this is replaced by a real session and the read paths move behind
 * authenticated RLS.
 */

export const FARMER_MOBILE_COOKIE = 'pl_farmer_mobile';

/** Long enough for one sitting, short enough not to linger on a shared phone. */
const MAX_AGE_SECONDS = 12 * 60 * 60;

export async function POST(request: Request) {
  let mobile = '';
  try {
    const body = await request.json();
    mobile = typeof body?.mobile === 'string' ? body.mobile.trim() : '';
  } catch {
    return NextResponse.json({ error: 'expected_json' }, { status: 400 });
  }

  if (!/^\d{10}$/.test(mobile)) {
    return NextResponse.json({ error: 'invalid_mobile' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(FARMER_MOBILE_COOKIE, mobile, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
  return res;
}

/** Sign out: used by nothing yet, but the cookie must be clearable. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(FARMER_MOBILE_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
