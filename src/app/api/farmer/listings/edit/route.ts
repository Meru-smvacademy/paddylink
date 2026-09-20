import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { harvestMonthToDate, OTHER_VARIETY_EN } from '@/lib/reference';
import { farmerMobile } from '@/lib/otpSession';

/**
 * POST /api/farmer/listings/edit — correct an existing listing.
 *
 * TEMP-PRE-AUTH (narrowed). The farmer is proven — a signed session token
 * from /api/otp/verify — but there is no auth.uid(), so this still runs on
 * the service-role client with RLS bypassed. That keeps THIS HANDLER the
 * security boundary, exactly as the create route documents: nothing from the
 * request body is trusted without validation here.
 *
 * OWNERSHIP, and why the client is never asked whose listing this is
 * The body carries a listing id and nothing else that decides access. The
 * farmer comes from the httpOnly cookie the OTP step set — never from the
 * body — and the listing is then read BY id AND farmer_id together. Another
 * farmer's listing matches nothing, so this returns 404 before any write and
 * the caller cannot tell a foreign listing from a nonexistent one.
 *
 * THE MOBILE NUMBER IS NOT A FIELD. It is the farmer's identity: it is not
 * read from the body, not validated, not written. Even a request that sends
 * one changes nothing — there is no code path here that assigns to it.
 *
 * QUALITY COLUMNS: this route can only ever CLEAR them, never set them. The
 * admin quality desk stays the single write path for a real reading. See the
 * reset block below for the rule and why it exists.
 *
 * STATUS IS NOT TOUCHED. A sold listing edited here stays sold; the sold
 * toggle at /api/farmer/listings/sold remains the only thing that moves it.
 *
 * NO DELETE PATH. This route only ever UPDATEs. It cannot remove a listing,
 * it never writes to listing_removals, and it has no path that clears a
 * stored photo — replacing one is the only thing it can do to it.
 */

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png'];
const MAX_QUINTALS = 10000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Errors = Record<string, string>;

function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

function int(form: FormData, key: string): number | null {
  const v = str(form, key);
  if (!/^\d+$/.test(v)) return null;
  const n = Number(v);
  return Number.isSafeInteger(n) ? n : null;
}

export async function POST(request: Request) {
  /* The farmer, from the cookie. A body that claims a mobile is ignored
     entirely — nothing below reads one. */
  const mobile = await farmerMobile();
  if (!mobile || !/^\d{10}$/.test(mobile)) {
    return NextResponse.json({ error: 'not_signed_in' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'expected_form_data' }, { status: 400 });
  }

  const listingId = str(form, 'listing_id');
  if (!UUID.test(listingId)) {
    return NextResponse.json({ error: 'invalid_listing_id' }, { status: 400 });
  }

  const errors: Errors = {};

  // ── Field validation — the same rules the create route enforces ──────────
  const name = str(form, 'name');
  if (name.length < 1 || name.length > 100) errors.name = 'invalid';

  const village = str(form, 'village');
  if (village.length < 1 || village.length > 100) errors.village = 'invalid';

  const districtId = int(form, 'district_id');
  if (districtId === null) errors.district_id = 'invalid';

  const talukId = int(form, 'taluk_id');
  if (talukId === null) errors.taluk_id = 'invalid';

  const varietyId = int(form, 'variety_id');
  if (varietyId === null) errors.variety_id = 'invalid';

  const varietyOther = str(form, 'variety_other');

  const quantityRaw = str(form, 'quantity_quintals');
  const quantity = Number(quantityRaw);
  if (!quantityRaw || !Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QUINTALS) {
    errors.quantity_quintals = 'invalid';
  }

  const month = int(form, 'harvest_month');
  if (month === null || month < 1 || month > 12) errors.harvest_month = 'invalid';

  /* No consent field. Consent was recorded when the listing was created and
     contact_share_consent_at is a record of that moment — re-asking on a
     correction would either overwrite the original timestamp or ask for
     something already given. This route does not touch it. */

  const photo = form.get('photo');
  const hasPhoto = photo instanceof File && photo.size > 0;
  if (hasPhoto) {
    if (!PHOTO_TYPES.includes(photo.type)) errors.photo = 'type';
    else if (photo.size > MAX_PHOTO_BYTES) errors.photo = 'size';
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: 'validation_failed', errors }, { status: 400 });
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

    /* OWNERSHIP CHECK — id AND farmer_id together, before anything is read
       for comparison and long before anything is written. */
    const { data: listing, error: findErr } = await supabase
      .from('listings')
      .select('id,status,variety_id,variety_other,quantity_quintals,quality_checked_at')
      .eq('id', listingId)
      .eq('farmer_id', farmer.id)
      .maybeSingle();
    if (findErr) throw findErr;
    if (!listing) {
      return NextResponse.json({ error: 'listing_not_found' }, { status: 404 });
    }
    /* Same two statuses the edit screen offers. Anything else is staff or
       cron territory and is not the farmer's to correct. */
    if (listing.status !== 'active' && listing.status !== 'sold') {
      return NextResponse.json({ error: 'listing_not_editable' }, { status: 409 });
    }

    // ── Referential validation: never trust an id from the client ──────────
    const [{ data: taluk }, { data: variety }] = await Promise.all([
      supabase.from('ref_taluks').select('id,district_id').eq('id', talukId).maybeSingle(),
      supabase.from('ref_varieties').select('id,name_en').eq('id', varietyId).maybeSingle(),
    ]);

    if (!taluk) {
      return NextResponse.json(
        { error: 'validation_failed', errors: { taluk_id: 'unknown' } },
        { status: 400 },
      );
    }
    if (taluk.district_id !== districtId) {
      return NextResponse.json(
        { error: 'validation_failed', errors: { taluk_id: 'district_mismatch' } },
        { status: 400 },
      );
    }
    if (!variety) {
      return NextResponse.json(
        { error: 'validation_failed', errors: { variety_id: 'unknown' } },
        { status: 400 },
      );
    }

    // variety_other rides along with ಇತರೆ / Other and nowhere else — the
    // same rule the create route enforces.
    const isOther = variety.name_en === OTHER_VARIETY_EN;
    if (isOther && (varietyOther.length < 1 || varietyOther.length > 60)) {
      return NextResponse.json(
        { error: 'validation_failed', errors: { variety_other: 'invalid' } },
        { status: 400 },
      );
    }
    const otherValue = isOther ? varietyOther : null;

    // ── QUALITY RESET ──────────────────────────────────────────────────────
    // A moisture reading belongs to the crop that was actually checked. If
    // the farmer changes which paddy this is, or how much of it there is,
    // the recorded check no longer describes the listing, and leaving the
    // badge up would show a buyer a verification that was never performed on
    // what he is now looking at.
    //
    // So the columns are cleared and the badge honestly returns to
    // ಪರಿಶೀಲನೆ ಬಾಕಿ. They are only ever set back by the admin quality desk,
    // after a real visit — this route can write NULL into them and nothing
    // else. No value is read from the request body for any of the three.
    //
    // Narrow on purpose: a farmer correcting his village, his name or the
    // harvest month has not changed the crop, so a valid check survives.
    const varietyChanged =
      listing.variety_id !== varietyId || (listing.variety_other ?? null) !== otherValue;
    const quantityChanged = Number(listing.quantity_quintals) !== quantity;
    const resetQuality =
      listing.quality_checked_at != null && (varietyChanged || quantityChanged);

    // ── The farmer's own details ──────────────────────────────────────────
    // Name, village and taluk live on farmers, not on the listing: one
    // farmer, one address. Correcting them here corrects them everywhere,
    // which is what that shape means.
    const { error: farmerUpdErr } = await supabase
      .from('farmers')
      .update({ full_name: name, village, taluk_id: talukId })
      .eq('id', farmer.id);
    if (farmerUpdErr) throw farmerUpdErr;

    // ── The listing ───────────────────────────────────────────────────────
    // status is absent from this object deliberately: a sold listing stays
    // sold through an edit. expires_at is absent too — migration 013's
    // BEFORE UPDATE trigger recomputes it from harvest_month, by the same
    // formula the insert trigger uses, so a corrected harvest month cannot
    // leave a listing expiring before its own harvest.
    const patch: Record<string, unknown> = {
      variety_id: varietyId,
      variety_other: otherValue,
      quantity_quintals: quantity,
      harvest_month: harvestMonthToDate(month!),
    };
    if (resetQuality) {
      patch.moisture_pct = null;
      patch.quality_checked_at = null;
      patch.quality_checked_by = null;
    }

    const { data: updated, error: updErr } = await supabase
      .from('listings')
      .update(patch)
      .eq('id', listingId)
      .eq('farmer_id', farmer.id) // ownership again, at the write itself
      .select('id,status,quality_checked_at')
      .single();
    if (updErr) throw updErr;

    // ── Photo, if a new one was chosen ────────────────────────────────────
    // Replaces the stored file at the same path. There is no path here that
    // clears photo_path: a farmer can swap the photo, never remove it.
    // Upload failure does not fail the edit — the correction he typed is
    // worth more than the picture.
    if (hasPhoto) {
      const ext = photo.type === 'image/png' ? 'png' : 'jpg';
      const path = `${farmer.id}/${listingId}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('listing-photos')
        .upload(path, photo, { contentType: photo.type, upsert: true });
      if (!upErr) {
        await supabase.from('listings').update({ photo_path: path }).eq('id', listingId);
      } else {
        console.error('[farmer/listings/edit] photo upload failed', upErr.message);
      }
    }

    return NextResponse.json({
      listing: {
        id: updated.id,
        status: updated.status,
        quality_reset: resetQuality,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[farmer/listings/edit] failed', message);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
