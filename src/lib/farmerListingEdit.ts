import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Reads ONE listing for the farmer edit screen, pre-fill shaped.
 *
 * OWNERSHIP IS THE QUERY. The listing id comes from the URL, which is to say
 * from whoever typed it. It is never looked up on its own: the farmer is
 * resolved from the httpOnly cookie first, and the listing is then selected
 * by id AND farmer_id together. A listing belonging to someone else matches
 * nothing and this returns null, so the caller renders a 404 and the farmer
 * cannot tell a foreign listing from one that does not exist.
 *
 * TEMP-PRE-AUTH: the mobile comes from the cookie set at the OTP step, not a
 * verified session, and the read runs on the service-role client because
 * there is no authenticated role to run it as. The mobile is only ever used
 * as an equality filter, never interpolated.
 *
 * Village, taluk and the farmer's name live on public.farmers, not on the
 * listing — one farmer, one address — so they are read from there. Editing
 * them on this screen therefore changes them for all of that farmer's
 * listings, which is what the schema means by having one address per farmer.
 */

export interface EditableListing {
  id: string;
  /** Shown read-only. It is the farmer's identity, not a field. */
  mobile: string;
  name: string;
  /** From farmers.taluk_id, resolved up to its district for the dropdown. */
  districtId: string;
  talukId: string;
  village: string;
  varietyId: string;
  varietyOther: string;
  quintals: string;
  /** 1-12, so the form's month grid can pre-select. */
  harvestMonth: number;
  /** Signed URL for the stored crop photo, or null. Read-only preview: the
   *  farmer can replace it, and there is no path here that removes it. */
  photoUrl: string | null;
  /** Drives the quality-reset warning. True once staff have checked the crop. */
  qualityChecked: boolean;
  /** 'sold' listings are editable too, and stay sold. */
  status: string;
}

/** Signed URLs are short-lived by design; this only has to outlive a form. */
const PHOTO_URL_TTL_SECONDS = 60 * 60;

export async function getEditableListing(
  mobile: string,
  listingId: string,
): Promise<EditableListing | null> {
  const supabase = createAdminClient();

  const { data: farmer, error: farmerErr } = await supabase
    .from('farmers')
    .select('id,mobile,full_name,village,taluk_id')
    .eq('mobile', mobile)
    .maybeSingle();
  if (farmerErr) throw farmerErr;
  if (!farmer) return null;

  /* THE OWNERSHIP CHECK. Both filters, always, in one query. */
  const { data: listing, error: listErr } = await supabase
    .from('listings')
    .select(
      'id,variety_id,variety_other,quantity_quintals,harvest_month,status,photo_path,quality_checked_at',
    )
    .eq('id', listingId)
    .eq('farmer_id', farmer.id)
    .maybeSingle();
  if (listErr) throw listErr;
  if (!listing) return null;

  /* Only these two reach the edit screen. A draft, expired, removed or
     flagged listing is staff and cron territory and is not offered here —
     the farmer's own page does not show them either. */
  if (listing.status !== 'active' && listing.status !== 'sold') return null;

  /* The form's district dropdown drives the taluk dropdown, so the stored
     taluk has to be resolved back up to its district to pre-select both. */
  let districtId = '';
  if (farmer.taluk_id != null) {
    const { data: taluk } = await supabase
      .from('ref_taluks')
      .select('district_id')
      .eq('id', farmer.taluk_id)
      .maybeSingle();
    if (taluk) districtId = String(taluk.district_id);
  }

  /* Private bucket — never a public URL, exactly as the create route stores
     it. A failure here costs the preview, not the edit. */
  let photoUrl: string | null = null;
  if (listing.photo_path) {
    const { data: signed } = await supabase.storage
      .from('listing-photos')
      .createSignedUrl(listing.photo_path, PHOTO_URL_TTL_SECONDS);
    photoUrl = signed?.signedUrl ?? null;
  }

  return {
    id: listing.id,
    mobile: farmer.mobile,
    name: farmer.full_name ?? '',
    districtId,
    talukId: farmer.taluk_id != null ? String(farmer.taluk_id) : '',
    village: farmer.village ?? '',
    varietyId: String(listing.variety_id),
    varietyOther: listing.variety_other ?? '',
    quintals: String(listing.quantity_quintals),
    harvestMonth: Number(String(listing.harvest_month).slice(5, 7)),
    photoUrl,
    qualityChecked: listing.quality_checked_at != null,
    status: listing.status,
  };
}
