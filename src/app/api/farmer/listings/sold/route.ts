import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { farmerMobile } from '@/lib/otpSession';

/**
 * POST /api/farmer/listings/sold — the farmer's ಮಾರಾಟವಾಗಿದೆ toggle.
 *
 * Body: { listing_id: uuid, sold: boolean }. `sold: false` puts a sold
 * listing back on the market; there is no limit on how often either way.
 *
 * TEMP-PRE-AUTH (narrowed). The farmer is proven — a signed session token
 * from /api/otp/verify — but there is no auth.uid(), so this still runs on
 * the service-role client with RLS bypassed, which keeps THIS HANDLER the
 * security boundary, exactly as /api/farmer/listings documents.
 *
 * WHOSE LISTING IT IS, and why the client is never asked
 * The request body carries a listing id and nothing else that matters. The
 * farmer is taken from the httpOnly cookie the OTP step set — never from the
 * body — and the listing is then looked up BY id AND farmer_id together. A
 * listing id belonging to someone else simply does not match, so the handler
 * returns 404 and no write is attempted. public.mark_listing_sold() re-checks
 * ownership itself and raises not_your_listing, so the rule survives even if
 * a future caller reaches the function some other way.
 *
 * The hole that closes when OTP lands is the same one the session route
 * documents: nothing proves the cookie's number belongs to whoever is
 * holding it. Ownership is checked against that number, so the check is only
 * ever as strong as the cookie. Acceptable only because no real farmers are
 * on the platform yet.
 *
 * NO DELETE PATH. This route only ever moves status between 'active' and
 * 'sold'. It cannot remove a listing, and nothing here writes to
 * listing_removals.
 */

/** The two statuses this toggle moves between, and nothing else. */
type Action = 'sold' | 'active';

export async function POST(request: Request) {
  /* The farmer, from the cookie. A body that claims a mobile number is
     ignored entirely — there is no code path here that reads one. */
  const mobile = await farmerMobile();
  if (!mobile || !/^\d{10}$/.test(mobile)) {
    return NextResponse.json({ error: 'not_signed_in' }, { status: 401 });
  }

  let listingId = '';
  let action: Action;
  try {
    const body = await request.json();
    listingId = typeof body?.listing_id === 'string' ? body.listing_id.trim() : '';
    if (typeof body?.sold !== 'boolean') {
      return NextResponse.json({ error: 'invalid_sold' }, { status: 400 });
    }
    action = body.sold ? 'sold' : 'active';
  } catch {
    return NextResponse.json({ error: 'expected_json' }, { status: 400 });
  }

  /* Shape-check before it reaches the database: a malformed uuid should be a
     400 here, not a Postgres cast error surfacing as a 500. */
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID.test(listingId)) {
    return NextResponse.json({ error: 'invalid_listing_id' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    const { data: farmer, error: farmerErr } = await supabase
      .from('farmers')
      .select('id')
      .eq('mobile', mobile)
      .maybeSingle();
    if (farmerErr) throw farmerErr;
    if (!farmer) {
      return NextResponse.json({ error: 'not_signed_in' }, { status: 401 });
    }

    /* OWNERSHIP CHECK — the listing must match on id AND farmer_id together.
       A foreign listing id matches nothing, so this returns before any write
       and the caller cannot tell a foreign listing from a nonexistent one. */
    const { data: listing, error: findErr } = await supabase
      .from('listings')
      .select('id,status')
      .eq('id', listingId)
      .eq('farmer_id', farmer.id)
      .maybeSingle();
    if (findErr) throw findErr;
    if (!listing) {
      return NextResponse.json({ error: 'listing_not_found' }, { status: 404 });
    }

    /* The write, and the 12-hour re-credit sweep with it, in one transaction
       inside the database. Doing the sweep here in JS would leave a window
       where the listing is sold and the tokens are not yet back. */
    const { data, error } = await supabase.rpc(
      action === 'sold' ? 'mark_listing_sold' : 'reactivate_listing',
      { p_listing_id: listingId, p_farmer_id: farmer.id },
    );
    if (error) throw error;

    /* TODO(SMS): notify the buyers whose tokens just came back. NOT wired in
       this diff — the unlock / re-credit template is still pending DLT
       approval. The queue call belongs inside mark_listing_sold(), beside the
       ledger write, so a notification cannot be sent for a credit that rolled
       back; the commented-out enqueue_notification() is already there in
       migration 011. Nothing needs to be added at this line except the
       decision to turn it on. */

    /* The count is returned for the server log and for tests. It is NOT sent
       to the farmer screen: token wording never appears on a farmer surface. */
    const result = data as { status?: string; recredited?: number } | null;
    if (action === 'sold' && result?.recredited) {
      console.info(
        `[farmer/listings/sold] listing ${listingId} sold; ${result.recredited} unlock(s) re-credited`,
      );
    }

    return NextResponse.json({ status: result?.status ?? action });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);

    /* The function's own ownership guard. Reaching this means the id passed
       the route's check and failed the database's, which should be
       impossible — worth a 403 and a loud log rather than a generic 500. */
    if (message.includes('not_your_listing')) {
      console.error('[farmer/listings/sold] ownership check disagreed', listingId);
      return NextResponse.json({ error: 'not_your_listing' }, { status: 403 });
    }
    /* Raced with staff or the expiry cron: the listing moved out from under
       the toggle between the read and the write. */
    if (message.includes('listing_not_active') || message.includes('listing_not_sold')) {
      return NextResponse.json({ error: 'listing_state_changed' }, { status: 409 });
    }
    if (message.includes('listing_not_found')) {
      return NextResponse.json({ error: 'listing_not_found' }, { status: 404 });
    }

    console.error('[farmer/listings/sold] failed', message);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
