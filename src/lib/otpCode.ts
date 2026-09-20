import 'server-only';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

/**
 * The login code itself: how one is made, and how it is turned into the only
 * form that is allowed to leave this process.
 *
 * SIX DIGITS FROM A CSPRNG. node:crypto's randomInt, not Math.random — a
 * predictable login code is not a login code. The range is the full million,
 * leading zeros included, because trimming them to make the SMS look tidier
 * would quietly throw away a tenth of the keyspace.
 *
 * THE CODE NEVER LEAVES IN PLAIN FORM except in the SMS itself. It is not
 * stored, not logged, not returned to the browser, and not sent to Postgres.
 * What Postgres gets is hashCode() below.
 *
 * WHY HMAC AND NOT A BARE SHA-256. A million possible codes is nothing: a
 * bare hash of six digits falls to a laptop in under a second, so a database
 * dump would hand over every live code. Keying with a secret the database
 * never holds means the dump is worthless on its own — an attacker needs the
 * application's environment as well, which is a different machine and a
 * different compromise.
 *
 * THE HASH IS BOUND TO (mobile, door). The same six digits sent to two
 * numbers hash differently, so a code observed on one phone cannot be
 * replayed against another account, and a farmer code cannot be presented at
 * the buyer door.
 */

/**
 * The signing key, shared with the session token in src/lib/otpSession.ts.
 * Throws rather than defaulting: an unkeyed HMAC is a plain hash wearing a
 * costume, and a fallback secret is the same secret on every deployment.
 *
 * Deliberately NOT ADMIN_SESSION_SECRET. The admin cookie and a farmer login
 * must not be forgeable from one another's key: one leaked secret should cost
 * one surface, not both.
 */
export function sessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      'Missing or too-short SESSION_SECRET. Set a long random value in ' +
        '.env.local (see .env.example) — e.g. openssl rand -hex 32.',
    );
  }
  return s;
}

export const OTP_LENGTH = 6;

/** A fresh code. Uniform over 000000-999999; leading zeros are kept. */
export function generateCode(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
}

export type Door = 'farmer' | 'buyer';

/**
 * The form migration 016 stores and compares: hex HMAC-SHA256, keyed with the
 * server secret, over the code bound to the number and the door it was issued
 * for. 64 lowercase hex characters, which is what the table's CHECK enforces.
 */
export function hashCode(params: { mobile: string; door: Door; code: string }): string {
  return createHmac('sha256', sessionSecret())
    .update(`otp:${params.mobile}:${params.door}:${params.code}`)
    .digest('hex');
}

/**
 * Constant-time hex comparison, for callers that compare hashes in JS rather
 * than in SQL. Postgres does the real comparison inside otp_verify(), where
 * the row lock and the attempt counter are; this exists so that any future
 * comparison here cannot quietly become a leaking `===`.
 */
export function hashesEqual(a: string, b: string): boolean {
  if (!/^[0-9a-f]{64}$/.test(a) || !/^[0-9a-f]{64}$/.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

/** Indian mobile numbers, as every other route in this codebase spells it. */
export const MOBILE_RE = /^\d{10}$/;

export function isDoor(v: unknown): v is Door {
  return v === 'farmer' || v === 'buyer';
}
