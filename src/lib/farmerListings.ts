import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getReferenceData } from '@/lib/reference';

/**
 * Reads one farmer's listings for /farmer/listings.
 *
 * TEMP-PRE-AUTH: the mobile comes from the cookie set at the OTP step, not a
 * verified session, and the read runs on the service-role client because
 * there is no authenticated role to run it as. The caller must therefore
 * treat the mobile as untrusted input — it is only ever used as an equality
 * filter here, never interpolated.
 *
 * Reference data is joined in JS rather than by PostgREST: listings.variety_id
 * points at reference.varieties, but the app can only reach the ref_* views in
 * public, and PostgREST cannot infer a relationship across that. The reference
 * tables are tiny (3 districts, 19 taluks, 8 varieties), so this costs nothing.
 */

const MONTHS_KN = [
  'ಜನವರಿ', 'ಫೆಬ್ರವರಿ', 'ಮಾರ್ಚ್', 'ಏಪ್ರಿಲ್', 'ಮೇ', 'ಜೂನ್',
  'ಜುಲೈ', 'ಆಗಸ್ಟ್', 'ಸೆಪ್ಟೆಂಬರ್', 'ಅಕ್ಟೋಬರ್', 'ನವೆಂಬರ್', 'ಡಿಸೆಂಬರ್',
];

export type BadgeType = 'verified' | 'pending' | 'active';

export interface FarmerListingRow {
  id: string;
  varietyKn: string;
  quantityKn: string;
  harvestKn: string;
  locationKn: string;
  badge: BadgeType;
  /** One-decimal moisture reading when staff checked the crop (007), else
   *  null. The same number the buyer sees — one truth, two screens. */
  moisturePct: string | null;
  buyersKn: string | null;
}

/** Statuses a farmer should see on his own listings page. */
const VISIBLE_STATUSES = ['active', 'sold'];

export async function getFarmerListings(mobile: string): Promise<FarmerListingRow[]> {
  const supabase = createAdminClient();

  const { data: farmer, error: farmerErr } = await supabase
    .from('farmers')
    .select('id,taluk_id')
    .eq('mobile', mobile)
    .maybeSingle();
  if (farmerErr) throw farmerErr;
  if (!farmer) return [];

  const [{ data: rows, error: listErr }, reference] = await Promise.all([
    supabase
      .from('listings')
      .select(
        'id,variety_id,variety_other,quantity_quintals,harvest_month,status,unlock_count,moisture_pct,quality_checked_at',
      )
      .eq('farmer_id', farmer.id)
      .in('status', VISIBLE_STATUSES)
      .order('created_at', { ascending: false }),
    getReferenceData(),
  ]);
  if (listErr) throw listErr;

  const varietyById = new Map(reference.varieties.map((v) => [v.id, v]));
  const talukById = new Map(reference.taluks.map((t) => [t.id, t]));
  const districtById = new Map(reference.districts.map((d) => [d.id, d]));

  const taluk = farmer.taluk_id ? talukById.get(farmer.taluk_id) : undefined;
  const district = taluk ? districtById.get(taluk.district_id) : undefined;
  const locationKn = taluk && district ? `${taluk.name_kn}, ${district.name_kn}` : '';

  return (rows ?? []).map((r) => {
    const month = Number(String(r.harvest_month).slice(5, 7));
    return {
      id: r.id,
      // The farmer's own words win when he chose ಇತರೆ / Other — this is his
      // page, not the public view, so there is no masking reason to hide them.
      varietyKn: r.variety_other ?? varietyById.get(r.variety_id)?.name_kn ?? '',
      quantityKn: `${r.quantity_quintals} ಕ್ವಿಂಟಾಲ್`,
      harvestKn: `ಕೊಯ್ಲು: ${MONTHS_KN[month - 1] ?? ''}`,
      locationKn,
      // Verified the moment staff record a moisture check on the quality
      // desk (migration 007); until then the card honestly reads pending.
      badge: (r.quality_checked_at ? 'verified' : 'pending') as BadgeType,
      moisturePct: r.moisture_pct != null ? Number(r.moisture_pct).toFixed(1) : null,
      buyersKn:
        r.unlock_count > 0
          ? `${r.unlock_count} ಖರೀದಿದಾರರು ನಿಮ್ಮ ಸಂಪರ್ಕ ತೆರೆದಿದ್ದಾರೆ`
          : null,
    };
  });
}
