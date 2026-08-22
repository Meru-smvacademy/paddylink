import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/buyer/register — create a buyer's KYC registration.
 *
 * TEMP-PRE-AUTH. Real OTP auth is not live yet, so this route runs on the
 * service-role client and RLS is bypassed. THIS HANDLER is therefore the
 * security boundary: nothing from the request body is trusted without
 * validation here, whatever the form already checked.
 *
 * The buyer is created with kyc_status 'pending'. Nothing in this route can
 * approve anyone — approval is a human decision made in the admin portal, and
 * only an approved buyer ever reaches a farmer's contact.
 *
 * The GST certificate goes to the private kyc-docs bucket. It is never made
 * public and never given a public URL; reviewers get a signed URL. The path,
 * not a URL, is what lands in buyer_documents.
 */

const MAX_DOC_BYTES = 5 * 1024 * 1024;
const DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

type Errors = Record<string, string>;

/** Supabase/PostgREST errors are plain objects: {message, code, details, hint}. */
function describeError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object') {
    const o = e as Record<string, unknown>;
    return [o.message, o.code, o.details, o.hint].filter(Boolean).join(' | ') || JSON.stringify(o);
  }
  return String(e);
}

function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'expected_form_data' }, { status: 400 });
  }

  const errors: Errors = {};

  const name = str(form, 'name');
  if (name.length < 1 || name.length > 100) errors.name = 'invalid';

  const businessName = str(form, 'business_name');
  if (businessName.length < 1 || businessName.length > 150) errors.business_name = 'invalid';

  const mobile = str(form, 'mobile');
  if (!/^\d{10}$/.test(mobile)) errors.mobile = 'invalid';

  const gstin = str(form, 'gstin').toUpperCase();
  if (!GST_RE.test(gstin)) errors.gstin = 'invalid';

  const pan = str(form, 'pan').toUpperCase();
  if (!PAN_RE.test(pan)) errors.pan = 'invalid';

  const districtRaw = str(form, 'district_id');
  const districtId = /^\d+$/.test(districtRaw) ? Number(districtRaw) : null;
  if (districtId === null) errors.district_id = 'invalid';

  const address = str(form, 'business_address');
  if (address.length < 1 || address.length > 300) errors.business_address = 'invalid';

  if (str(form, 'consent') !== 'true') errors.consent = 'required';

  const doc = form.get('document');
  if (!(doc instanceof File) || doc.size === 0) {
    errors.document = 'required';
  } else if (!DOC_TYPES.includes(doc.type)) {
    errors.document = 'type';
  } else if (doc.size > MAX_DOC_BYTES) {
    errors.document = 'size';
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: 'validation_failed', errors }, { status: 400 });
  }

  const certificate = doc as File;
  const supabase = createAdminClient();

  // Never trust an id from the client.
  const { data: district } = await supabase
    .from('ref_districts')
    .select('id')
    .eq('id', districtId)
    .maybeSingle();
  if (!district) {
    return NextResponse.json(
      { error: 'validation_failed', errors: { district_id: 'unknown' } },
      { status: 400 },
    );
  }

  // buyers.mobile is UNIQUE. Checked up front so the buyer gets a clear
  // message on the field rather than a failed insert.
  // TEMP-PRE-AUTH: once OTP is live an existing number routes to login before
  // this form is ever reached, and this check becomes a backstop.
  const { data: existing } = await supabase
    .from('buyers')
    .select('id')
    .eq('mobile', mobile)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: 'validation_failed', errors: { mobile: 'already_registered' } },
      { status: 409 },
    );
  }

  let buyerId: string | null = null;
  try {
    const { data: buyer, error: buyerErr } = await supabase
      .from('buyers')
      .insert({
        name,
        business_name: businessName,
        mobile,
        gstin,
        pan,
        district_id: districtId,
        business_address: address,
        // Explicit rather than relying on the column default: a buyer starts
        // unverified, and only a human review changes that.
        kyc_status: 'pending',
      })
      .select('id,kyc_status')
      .single();
    if (buyerErr) throw buyerErr;
    buyerId = buyer.id;

    // ── Certificate ────────────────────────────────────────────────────────
    // Unlike the farmer's optional crop photo, this document IS the
    // registration: without it there is nothing to verify. So a failed upload
    // fails the whole thing, and the half-made buyer row is removed rather
    // than left waiting for a review that can never happen.
    const ext =
      certificate.type === 'application/pdf'
        ? 'pdf'
        : certificate.type === 'image/png'
          ? 'png'
          : 'jpg';
    const path = `${buyer.id}/gst.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('kyc-docs')
      .upload(path, certificate, { contentType: certificate.type, upsert: true });
    if (upErr) throw new Error(`upload_failed: ${upErr.message}`);

    const { error: docErr } = await supabase.from('buyer_documents').insert({
      buyer_id: buyer.id,
      doc_type: 'gst',
      storage_path: path,
      status: 'pending',
    });
    if (docErr) throw docErr;

    return NextResponse.json({
      buyer: { id: buyer.id, kyc_status: buyer.kyc_status },
    });
  } catch (e) {
    // Supabase errors are plain objects, not Error instances — String(e) on
    // one yields "[object Object]" and hides the cause. Pull the fields out.
    const message = describeError(e);
    console.error('[buyer/register] failed', message);

    // Roll back a buyer row whose document never landed, so nothing sits in
    // the review queue that cannot be reviewed.
    if (buyerId) {
      await supabase.from('buyer_documents').delete().eq('buyer_id', buyerId);
      await supabase.from('buyers').delete().eq('id', buyerId);
    }

    if (message.includes('buyers_mobile_key') || message.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'validation_failed', errors: { mobile: 'already_registered' } },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
