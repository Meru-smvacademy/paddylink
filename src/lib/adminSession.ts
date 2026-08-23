import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Admin session — a signed, httpOnly cookie, verified everywhere an /admin
 * surface is served: in the proxy (the outer gate) and again inside each
 * admin page and route handler (so a matcher refactor can never silently
 * drop coverage — see the Data Security note in the proxy docs).
 *
 * TEMP-SINGLE-ADMIN — CEO-approved. There is one shared admin password and
 * the actor identity is the literal string 'admin'. When OTP/auth lands this
 * whole file is replaced by per-staff accounts with real identities; every
 * admin-portal caller is marked TEMP-SINGLE-ADMIN so they are findable then.
 *
 * Token shape: "<expiresAtMs>.<hex hmac-sha256 of 'admin.<expiresAtMs>'>".
 * No session store: possession of a validly signed, unexpired token IS the
 * session. Logout clears the cookie; tokens cannot be revoked individually,
 * which is acceptable for a single shared operator account with an 8h cap.
 */

export const ADMIN_COOKIE = 'pl_admin';
export const ADMIN_SESSION_HOURS = 8;

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

function sign(expiresAtMs: number): string {
  return createHmac('sha256', secret()).update(`admin.${expiresAtMs}`).digest('hex');
}

/** A fresh token expiring ADMIN_SESSION_HOURS from now. */
export function createAdminToken(): { value: string; expiresAtMs: number } {
  const expiresAtMs = Date.now() + ADMIN_SESSION_HOURS * 60 * 60 * 1000;
  return { value: `${expiresAtMs}.${sign(expiresAtMs)}`, expiresAtMs };
}

/** True only for a well-formed, correctly signed, unexpired token. */
export function verifyAdminToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot <= 0) return false;
  const expRaw = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  if (!/^\d{1,15}$/.test(expRaw) || !/^[0-9a-f]{64}$/.test(mac)) return false;
  const expiresAtMs = Number(expRaw);
  if (!Number.isFinite(expiresAtMs) || Date.now() >= expiresAtMs) return false;
  const expected = sign(expiresAtMs);
  // Both sides are 64 hex chars by the regexes above, so lengths match.
  return timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(expected, 'hex'));
}
