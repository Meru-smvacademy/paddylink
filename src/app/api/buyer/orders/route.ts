import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createRazorpayOrder, razorpayCredentials } from '@/lib/razorpay';
import { buyerMobile } from '@/lib/otpSession';

/**
 * POST /api/buyer/orders — start a token purchase.
 *
 * The order of operations is the whole point of this route:
 *
 *   1. resolve the buyer from the httpOnly cookie
 *   2. read the pack from config — never from the request
 *   3. write a payments row, status 'pending'
 *   4. create the Razorpay order
 *   5. store its id on that row
 *   6. return the id, the amount and the PUBLIC key id
 *
 * Checkout cannot open until 3 has happened, so there is no window in which a
 * buyer is paying for something this system has no record of. If step 4 fails
 * the pending row stays and surfaces on the admin pending list, which is
 * better than a silent nothing.
 *
 * NOTHING HERE CREDITS ANYTHING. This route does not touch token_ledger or
 * buyer_wallets, and could not: crediting lives in process_razorpay_payment(),
 * which only the webhook calls. A browser that replays this endpoint gets
 * more pending orders and not one token.
 *
 * PRICE IS NOT TAKEN FROM THE CLIENT. The amount and the token count are read
 * from config.token_packs on the server. A request body claiming a different
 * amount changes nothing — there is no code path here that reads one.
 *
 * TEMP-PRE-AUTH (narrowed): the buyer IS verified now — a signed session
 * token minted by /api/otp/verify, which OTP is in front of. What is still
 * temporary is that this runs on the service-role client with RLS bypassed,
 * for want of an auth.uid(). The keys in use remain Razorpay TEST keys, and
 * going live is a separate decision from this one.
 */

/**
 * GET /api/buyer/orders — what the waiting state polls.
 *
 * Returns the ledger balance and the oldest unfinished order, and writes
 * nothing. This is how the browser learns a purchase landed: it asks the
 * server, which reads the ledger the webhook wrote. The browser is never told
 * a balance it supplied, and never supplies one.
 */
export async function GET() {
  const mobile = await buyerMobile();
  if (!mobile || !/^\d{10}$/.test(mobile)) {
    return NextResponse.json({ error: 'not_signed_in' }, { status: 401 });
  }

  const supabase = createAdminClient();
  try {
    const { data: buyer } = await supabase
      .from('buyers')
      .select('id')
      .eq('mobile', mobile)
      .maybeSingle();
    if (!buyer) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 });

    const [ledger, pending] = await Promise.all([
      supabase.from('token_ledger').select('delta').eq('buyer_id', buyer.id),
      supabase
        .from('payments')
        .select('id,razorpay_order_id,created_at')
        .eq('buyer_id', buyer.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    /* The balance is the ledger sum, same as the wallet page. */
    const balance = (ledger.data ?? []).reduce((sum, r) => sum + Number(r.delta), 0);

    return NextResponse.json({
      balance,
      pending: pending.data
        ? { id: pending.data.id, orderId: pending.data.razorpay_order_id, createdAt: pending.data.created_at }
        : null,
    });
  } catch (e) {
    console.error('[buyer/orders] status read failed', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export async function POST() {
  const mobile = await buyerMobile();
  if (!mobile || !/^\d{10}$/.test(mobile)) {
    return NextResponse.json({ error: 'not_signed_in' }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    const [{ data: buyer, error: buyerErr }, { data: cfg, error: cfgErr }] = await Promise.all([
      supabase.from('buyers').select('id,name,mobile').eq('mobile', mobile).maybeSingle(),
      supabase.from('config').select('value').eq('key', 'token_packs').maybeSingle(),
    ]);
    if (buyerErr) throw buyerErr;
    if (cfgErr) throw cfgErr;
    if (!buyer) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 });

    /* The pack, from config. Migration 012 left exactly one. */
    const packs = (cfg?.value ?? []) as { id: string; tokens: number; price: number }[];
    const pack = Array.isArray(packs) ? packs[0] : undefined;
    if (!pack || !Number.isInteger(pack.tokens) || !Number.isInteger(pack.price) || pack.price < 100) {
      console.error('[buyer/orders] unusable token_packs config', cfg?.value);
      return NextResponse.json({ error: 'pack_unavailable' }, { status: 503 });
    }

    /* 3. The order row FIRST, pending, before Razorpay is told anything. */
    const { data: row, error: insErr } = await supabase
      .from('payments')
      .insert({
        buyer_id: buyer.id,
        amount: pack.price,
        tokens: pack.tokens,
        status: 'pending',
      })
      .select('id')
      .single();
    if (insErr) throw insErr;

    /* 4 + 5. Razorpay, then its id onto the row we already own. */
    let order;
    try {
      order = await createRazorpayOrder({
        amountPaise: pack.price,
        receipt: row.id,
        notes: { buyer_id: buyer.id, pack: pack.id },
      });
    } catch (e) {
      /* The pending row is deliberately left in place: it is the only record
         that this buyer tried, and the admin list is where a human sees it. */
      console.error('[buyer/orders] razorpay order failed', e instanceof Error ? e.message : e);
      return NextResponse.json({ error: 'gateway_unavailable' }, { status: 502 });
    }

    const { error: updErr } = await supabase
      .from('payments')
      .update({ razorpay_order_id: order.id })
      .eq('id', row.id);
    if (updErr) throw updErr;

    /* 6. Only the key ID goes out — Razorpay publishes it to the browser by
       design, because checkout runs there. The key SECRET and the webhook
       secret never leave the server. */
    const { keyId } = razorpayCredentials();

    return NextResponse.json({
      orderId: order.id,
      paymentRowId: row.id,
      amount: pack.price,
      tokens: pack.tokens,
      currency: order.currency,
      keyId,
      buyerName: buyer.name,
      buyerMobile: buyer.mobile,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[buyer/orders] failed', message);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
