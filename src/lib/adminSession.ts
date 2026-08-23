import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Admin session — a signed, httpOnly cookie carrying a ROLE, verified
 * everywhere an /admin surface is served: in the proxy (the outer gate) and
 * again inside each admin page and route handler (so a matcher refactor can
 * never silently drop coverage — see the Data Security note in the proxy
 * docs).
 *
 * TEMP-TWO-TIER — CEO-approved. Two shared passwords map to two roles:
 * ADMIN_PASSWORD → 'admin' (every desk), STAFF_PASSWORD → 'staff' (route
 * list + quality only). Actor identity is still the role string, not a
 * person; the quality desk's required checker-name field is the real
 * accountability line under a shared password. When OTP/auth lands this whole
 * file is replaced by per-staff accounts with real identities; every caller
 * is marked TEMP-TWO-TIER (and TEMP-SINGLE-ADMIN before it) so they are
 * findable then.
 *
 * Token shape: "<role>.<expiresAtMs>.<hex hmac-sha256 of '<role>.<exp>'>".
 * No session store: possession of a validly signed, unexpired token IS the
 * session. Logout clears the cookie.
 */

export const ADMIN_COOKIE = 'pl_admin';
export const ADMIN_SESSION_HOURS = 8;

export type AdminRole = 'admin' | 'staff';
const ROLES: readonly AdminRole[] = ['admin', 'staff'];

/** Where each role lands after login and when bounced from a page it may not
 *  see. Admin owns the KYC desk; staff owns the quality desk. */
export function adminLanding(role: AdminRole): string {
  return role === 'admin' ? '/admin/buyers' : '/admin/quality';
}

/** Set here once so login/logout/proxy agree; secure is safe on localhost —
 *  Chromium and Firefox both treat it as a trustworthy origin in dev. */
export const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
} as const;

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      'Missing or too-short ADMIN_SESSION_SECRET. Set a long random value in ' +
        '.env.local (see .env.example).',
    );
  }
  return s;
}

function sign(role: AdminRole, expiresAtMs: number): string {
  return createHmac('sha256', secret()).update(`${role}.${expiresAtMs}`).digest('hex');
}

/** A fresh token for a role, expiring ADMIN_SESSION_HOURS from now. */
export function createAdminToken(role: AdminRole): { value: string; expiresAtMs: number } {
  const expiresAtMs = Date.now() + ADMIN_SESSION_HOURS * 60 * 60 * 1000;
  return { value: `${role}.${expiresAtMs}.${sign(role, expiresAtMs)}`, expiresAtMs };
}

/** The verified session, or null for anything malformed, expired or unsigned. */
export function verifyAdminToken(
  token: string | undefined | null,
): { role: AdminRole; expiresAtMs: number } | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [role, expRaw, mac] = parts;
  if (!ROLES.includes(role as AdminRole)) return null;
  if (!/^\d{1,15}$/.test(expRaw) || !/^[0-9a-f]{64}$/.test(mac)) return null;
  const expiresAtMs = Number(expRaw);
  if (!Number.isFinite(expiresAtMs) || Date.now() >= expiresAtMs) return null;
  const expected = sign(role as AdminRole, expiresAtMs);
  // Both sides are 64 hex chars by the regex above, so lengths match.
  if (!timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(expected, 'hex'))) return null;
  return { role: role as AdminRole, expiresAtMs };
}
