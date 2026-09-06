import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Razorpay, over the REST API and node:crypto. No SDK.
 *
 * Two calls are needed — create an order, and verify a webhook signature —
 * and both are a few lines. A dependency that ships a bundled HTTP client and
 * its own crypto for that is more surface than the thing it saves.
 *
 * SECRETS COME FROM THE ENVIRONMENT AND NOWHERE ELSE. Nothing in this file
 * holds a key, a fallback or a default, and nothing here logs one. The three
 * variables are named below; the key SECRET and the webhook secret are read
 * only in server code, and only the key ID — which Razorpay publishes to the
 * browser by design, since checkout runs there — is ever sent to a client.
 *
 *   RAZORPAY_KEY_ID          test key id  (rzp_test_...)   server + browser
 *   RAZORPAY_KEY_SECRET      test key secret               SERVER ONLY
 *   RAZORPAY_WEBHOOK_SECRET  webhook signing secret        SERVER ONLY
 *
 * The key id is deliberately NOT prefixed NEXT_PUBLIC_: it reaches the
 * browser from the order route's response, at the moment checkout opens, so
 * it never gets baked into a static bundle and swapping test for live is a
 * change of environment rather than a rebuild.
 */

const API = 'https://api.razorpay.com/v1';

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
}

/** Throws rather than falling back. A missing key must not become a fake one. */
export function razorpayCredentials(): RazorpayCredentials {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error(
      'Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET. Set both in .env.local ' +
        '(see .env.example). Never commit real values.',
    );
  }
  return { keyId, keySecret };
}

export function razorpayWebhookSecret(): string {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      'Missing RAZORPAY_WEBHOOK_SECRET. Set it in .env.local and to the same ' +
        'value in the Razorpay dashboard webhook configuration.',
    );
  }
  return secret;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

/**
 * Creates an order. `receipt` is our own payments row id, so a Razorpay
 * dashboard row can always be traced back to a database row by eye.
 */
export async function createRazorpayOrder(params: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const { keyId, keySecret } = razorpayCredentials();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  const res = await fetch(`${API}/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: 'INR',
      receipt: params.receipt,
      // Razorpay only captures automatically when told to; without this an
      // authorised payment sits uncaptured and no capture webhook arrives.
      payment_capture: 1,
      notes: params.notes ?? {},
    }),
  });

  if (!res.ok) {
    // The body can echo request detail; the key is not in it, but keep the
    // log to status and Razorpay's own error description regardless.
    let description = '';
    try {
      const body = await res.json();
      description = body?.error?.description ?? '';
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`razorpay_order_failed ${res.status} ${description}`.trim());
  }

  return (await res.json()) as RazorpayOrder;
}

/**
 * Webhook signature check. Razorpay signs the RAW request body with the
 * webhook secret, HMAC-SHA256, hex.
 *
 * The comparison is constant-time: a fast `!==` on a hex string leaks, byte by
 * byte, how much of a guess was right, which is all an attacker needs to
 * forge a signature given enough attempts. Length is checked first because
 * timingSafeEqual throws on a length mismatch.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', razorpayWebhookSecret()).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
