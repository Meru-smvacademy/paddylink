import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { harvestMonthToDate, OTHER_VARIETY_EN } from '@/lib/reference';

/**
 * POST /api/farmer/listings — create a farmer's paddy listing.
 *
 * TEMP-PRE-AUTH. Real OTP auth is not live yet (MSG91/DLT pending), so this
 * route runs on the service-role client and RLS is bypassed. That makes THIS
 * HANDLER the security boundary: nothing from the request body is trusted
 * without validation here.
 *
 * The specific hole that closes when OTP lands: the mobile number arrives
 * from the client, unverified. Anyone can post any number and create a
 * listing attributed to it. That is acceptable only because no real farmers
 * are on the platform yet. When OTP is live, the number must come from the
 * session and this route re-points at an authenticated RLS flow.
 *
 * Everything else is validated server-side regardless of what the form did:
 * the form's checks are for the farmer's benefit, these are for the data's.
 */

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png'];
const MAX_QUINTALS = 10000;

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
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'expected_form_data' }, { status: 400 });
  }

  const errors: Errors = {};

  // ── Field validation ─────────────────────────────────────────────────────
  const mobile = str(form, 'mobile');
  if (!/^\d{10}$/.test(mobile)) errors.mobile = 'invalid';

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

  // Consent is not a formality: the database refuses to activate a listing
  // for a farmer with no contact_share_consent_at, and the consent line is
  // what /privacy §3 rests on.
  if (str(form, 'consent') !== 'true') errors.consent = 'required';

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

  // ── Referential validation: never trust an id from the client ────────────
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
  // The taluk must actually sit in the district the form claimed, or the
  // listing's location would be a fiction.
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

  // variety_other rides along with ಇತರೆ / Other and nowhere else — the rule
  // migration 006 could not express as a CHECK.
  const isOther = variety.name_en === OTHER_VARIETY_EN;
  if (isOther && (varietyOther.length < 1 || varietyOther.length > 60)) {
    return NextResponse.json(
      { error: 'validation_failed', errors: { variety_other: 'invalid' } },
      { status: 400 },
    );
  }
  const otherValue = isOther ? varietyOther : null;

  try {
    // ── Farmer: one row per mobile ─────────────────────────────────────────
    const { data: existing, error: findErr } = await supabase
      .from('farmers')
      .select('id,contact_share_consent_at')
      .eq('mobile', mobile)
      .maybeSingle();
    if (findErr) throw findErr;

    const now = new Date().toISOString();
    let farmerId: string;

    if (existing) {
      const { error } = await supabase
        .from('farmers')
        .update({
          full_name: name,
          village,
          taluk_id: talukId,
          // Consent is recorded once; a returning farmer keeps the original
          // timestamp, which is what a consent record is for.
          contact_share_consent_at: existing.contact_share_consent_at ?? now,
          last_otp_verified_at: now,
        })
        .eq('id', existing.id);
      if (error) throw error;
      farmerId = existing.id;
    } else {
      const { data, error } = await supabase
        .from('farmers')
        .insert({
          mobile,
          full_name: name,
          village,
          taluk_id: talukId,
          created_via: 'self',
          contact_share_consent_at: now,
          last_otp_verified_at: now,
        })
        .select('id')
        .single();
      if (error) throw error;
      farmerId = data.id;
    }

    // ── Listing ────────────────────────────────────────────────────────────
    // expires_at is omitted deliberately: the BEFORE INSERT trigger derives it
    // from harvest_month plus config listing.ttl_days, and normalises
    // harvest_month to the first of the month.
    const { data: listing, error: listingErr } = await supabase
      .from('listings')
      .insert({
        farmer_id: farmerId,
        variety_id: varietyId,
        variety_other: otherValue,
        quantity_quintals: quantity,
        harvest_month: harvestMonthToDate(month!),
        status: 'active',
        created_by: 'farmer',
      })
      .select('id,quantity_quintals,harvest_month,status,expires_at,variety_other')
      .single();
    if (listingErr) throw listingErr;

    // ── Photo, if any ──────────────────────────────────────────────────────
    // Private bucket; the path is stored, never a URL. Upload failure does
    // not fail the listing — the paddy is listed either way, and a farmer who
    // has typed everything in should not lose it to a storage hiccup.
    let photoPath: string | null = null;
    if (hasPhoto) {
      const ext = photo.type === 'image/png' ? 'png' : 'jpg';
      const path = `${farmerId}/${listing.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('listing-photos')
        .upload(path, photo, { contentType: photo.type, upsert: true });
      if (!upErr) {
        photoPath = path;
        await supabase.from('listings').update({ photo_path: path }).eq('id', listing.id);
      } else {
        console.error('[farmer/listings] photo upload failed', upErr.message);
      }
    }

    return NextResponse.json({
      listing: {
        id: listing.id,
        quantity_quintals: listing.quantity_quintals,
        harvest_month: listing.harvest_month,
        expires_at: listing.expires_at,
        variety_kn: isOther && otherValue ? otherValue : null,
        photo_stored: photoPath !== null,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // The DB's own consent guard, surfaced rather than swallowed.
    if (message.includes('farmer_consent_missing')) {
      return NextResponse.json(
        { error: 'validation_failed', errors: { consent: 'required' } },
        { status: 400 },
      );
    }
    console.error('[farmer/listings] failed', message);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
