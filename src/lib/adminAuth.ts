import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, adminLanding, verifyAdminToken, type AdminRole } from '@/lib/adminSession';

/**
 * In-route admin checks — the second lock behind the proxy gate. Every admin
 * page and admin route handler calls one of these itself, so authorization
 * never rests on the proxy matcher alone.
 *
 * TEMP-TWO-TIER — see src/lib/adminSession.ts.
 */

/** The verified session (role) for this request, or null. */
export async function getAdminSession(): Promise<{ role: AdminRole } | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const session = verifyAdminToken(token);
  return session ? { role: session.role } : null;
}

/** True for any signed-in role. Used where mere authentication is enough. */
export async function isAdminSession(): Promise<boolean> {
  return (await getAdminSession()) !== null;
}

/**
 * For pages: require a session and return its role. No session → the login
 * screen. Any authenticated role passes (use requireRole to narrow).
 */
export async function requireAdminPage(): Promise<AdminRole> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  return session.role;
}

/**
 * For pages: require one of the allowed roles. No session → login; wrong role
 * → bounced to that role's own landing (a staff user sent to the quality
 * desk, never shown an admin-only page). Returns the role on success.
 */
export async function requireRole(allowed: readonly AdminRole[]): Promise<AdminRole> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  if (!allowed.includes(session.role)) redirect(adminLanding(session.role));
  return session.role;
}
