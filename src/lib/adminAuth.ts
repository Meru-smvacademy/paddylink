import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/adminSession';

/**
 * In-route admin checks — the second lock behind the proxy gate. Every admin
 * page and admin route handler calls one of these itself, so auth never
 * rests on the proxy matcher alone.
 *
 * TEMP-SINGLE-ADMIN — see src/lib/adminSession.ts.
 */

export async function isAdminSession(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verifyAdminToken(token);
}

/** For pages: bounce to the login screen when the session is absent/expired. */
export async function requireAdminPage(): Promise<void> {
  if (!(await isAdminSession())) redirect('/admin/login');
}
