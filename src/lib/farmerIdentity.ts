import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * The farmer's own details, pre-fill shaped, for the new-listing screen.
 *
 * WHY THIS EXISTS. A farmer who already has listings arrives at the create
 * form having typed his name, village and taluk once already — they are on
 * his farmers row, because the create route writes them there every time
 * (src/app/api/farmer/listings/route.ts). Asking a second time for what we
 * already hold is the kind of thing that stops a farmer halfway.
 *
 * IDENTITY, NOT CROP. Only the four fields that belong to the man rather
 * than to the paddy. Variety, quantity, harvest month and photo are what
 * makes one listing different from the next and are deliberately absent —
 * a pre-filled crop is how a farmer ends up posting last season twice.
 *
 * The mobile is NOT read from here by anything that matters. It comes from
 * the signed session on the server and is shown read-only; /api/farmer/
 * listings ignores the posted value entirely.
 */

export interface FarmerIdentity {
  /** Display only, and read-only on the form. */
  mobile: string;
  name: string;
  /** From farmers.taluk_id, resolved up to its district for the dropdown. */
  districtId: string;
  talukId: string;
  village: string;
}

/**
 * Null when this number has no farmers row yet — a farmer becomes a row on
 * his first listing, so a session can legitimately exist without one. The
 * caller renders the form blank in that case rather than refusing: there is
 * nothing to pre-fill, which is not the same as nothing to do.
 */
export async function getFarmerIdentity(mobile: string): Promise<FarmerIdentity | null> {
  const supabase = createAdminClient();

  const { data: farmer, error } = await supabase
    .from('farmers')
    .select('mobile,full_name,village,taluk_id')
    .eq('mobile', mobile)
    .maybeSingle();
  if (error) throw error;
  if (!farmer) return null;

  /* The form's district dropdown drives the taluk dropdown, so the stored
     taluk has to be resolved back up to its district to pre-select both —
     the same step getEditableListing takes, for the same reason. */
  let districtId = '';
  if (farmer.taluk_id != null) {
    const { data: taluk } = await supabase
      .from('ref_taluks')
      .select('district_id')
      .eq('id', farmer.taluk_id)
      .maybeSingle();
    if (taluk) districtId = String(taluk.district_id);
  }

  return {
    mobile: farmer.mobile,
    name: farmer.full_name ?? '',
    districtId,
    talukId: farmer.taluk_id != null ? String(farmer.taluk_id) : '',
    village: farmer.village ?? '',
  };
}
