import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyWebhookSignature } from '@/lib/razorpay';

/**
 * POST /api/razorpay/webhook — the ONLY thing in this codebase that credits
 * tokens for a purchase.
 *
 * THE SIGNATURE IS THE DOOR. The raw body is HMAC'd with the webhook secret
 * and compared, constant-time, against x-razorpay-signature. Anything that
 * does not match is rejected with 401 before a single database call — an
 * unverified caller does not get to create a webhook_events row, let alone
 * move a balance. This endpoint is public by necessity; the signature is what
 * makes that safe.
 *
 * THE BODY IS READ AS TEXT, NOT JSON, and hashed before it is parsed. Parsing
 * and re-serialising would change bytes — key order, whitespace, unicode
 * escapes — and the signature would never match. It is also the only honest
 * way to verify: what is checked has to be exactly what was sent.
 *
 * IDEMPOTENCY IS NOT THIS FILE'S JOB, and deliberately so. Razorpay retries
 * until it gets a 2xx, so duplicates are ordinary traffic, not an error case.
 * process_razorpay_payment() holds all three guards — the unique event id,
 * the conditional claim on razorpay_payment_id, and the unique constraint
 * behind it — in one transaction. Doing any of that here, across separate
 * round trips, would open the window the function closes.
 *
 * WHAT IT RETURNS AND WHY. 2xx for anything successfully handled INCLUDING a
 * duplicate, because a duplicate is handled: telling Razorpay otherwise just
 * buys more retries of something already done. 401 for a bad signature. 500
 * only when the credit genuinely failed, which is exactly when a retry helps.
 *
 * NO SMS HERE. The token-credit notification belongs beside the ledger write
 * inside the function, in the same transaction — see the TODO(SMS) in
 * migration 014. Sending from this route could announce a credit that then
 * rolled back.
 */

/* Razorpay must reach this without a session, and Next must not cache it. */
export const dynamic = 'force-dynamic';

interface RazorpayPaymentEntity {
  id?: string;
  order_id?: string;
  amount?: number;
  notes?: Record<string, string>;
}

export async function POST(request: Request) {
  /* Raw bytes, exactly as sent. Hash first, parse second. */
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ error: 'unreadable_body' }, { status: 400 });
  }

  const signature = request.headers.get('x-razorpay-signature');

  let verified = false;
  try {
    verified = verifyWebhookSignature(raw, signature);
  } catch (e) {
    /* A missing RAZORPAY_WEBHOOK_SECRET lands here. Fail closed and loudly:
       an unconfigured verifier must never be read as "nothing to verify". */
    console.error('[razorpay/webhook] cannot verify', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  }

  if (!verified) {
    console.warn('[razorpay/webhook] REJECTED: signature did not verify');
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  let payload: {
    event?: string;
    payload?: { payment?: { entity?: RazorpayPaymentEntity } };
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  /* Only the captured event credits. authorized/failed/refunded arrive too
     and are acknowledged so Razorpay stops retrying, but change nothing. */
  if (payload.event !== 'payment.captured') {
    return NextResponse.json({ ok: true, ignored: payload.event ?? 'unknown' });
  }

  const entity = payload.payload?.payment?.entity ?? {};
  const paymentId = entity.id;
  const orderId = entity.order_id;
  const amount = entity.amount;

  if (!paymentId || !orderId || typeof amount !== 'number') {
    console.error('[razorpay/webhook] captured event missing payment/order/amount');
    return NextResponse.json({ error: 'incomplete_payload' }, { status: 400 });
  }

  /* Razorpay's own delivery id. It is the first idempotency key, so a missing
     header falls back to the payment id — which is unique per payment and
     serves the same purpose. */
  const eventId = request.headers.get('x-razorpay-event-id') ?? `payment:${paymentId}`;

  const supabase = createAdminClient();

  try {
    /* The buyer is looked up from OUR order row, not from the webhook body.
       The signature proves Razorpay sent this; it does not make the contents
       an authority on whose wallet to credit. The function re-reads the
       buyer from the row for the same reason. */
    const { data: order, error: orderErr } = await supabase
      .from('payments')
      .select('id,buyer_id,tokens')
      .eq('razorpay_order_id', orderId)
      .maybeSingle();
    if (orderErr) throw orderErr;

    if (!order) {
      /* A payment for an order we never wrote. Recorded rather than dropped:
         money moved, and a missing row must not swallow it. There is no buyer
         to credit, so this is a 200 (retrying will not conjure the row) and a
         loud log for a human. */
      console.error(
        `[razorpay/webhook] captured payment ${paymentId} for unknown order ${orderId}`,
      );
      return NextResponse.json({ ok: true, unmatched: true });
    }

    const { data: result, error: rpcErr } = await supabase.rpc('process_razorpay_payment', {
      p_event_id: eventId,
      p_payment_id: paymentId,
      p_order_id: orderId,
      p_buyer_id: order.buyer_id,
      p_amount: amount,
      p_tokens: order.tokens,
      p_raw: payload,
    });
    if (rpcErr) throw rpcErr;

    /* 'credited' | 'replay' | 'duplicate' — all three are handled outcomes. */
    console.info(`[razorpay/webhook] ${paymentId} -> ${result}`);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[razorpay/webhook] processing failed', message);
    /* 500 so Razorpay retries — this is the one case where it should. */
    return NextResponse.json({ error: 'processing_failed' }, { status: 500 });
  }
}
