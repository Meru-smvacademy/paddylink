import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The buyer's view of the market: public.listings_browse and nothing else.
 *
 * This is the one object the anon key may read, so these queries deliberately
 * use the anon client rather than the service role — the browser runs the
 * exact same query the server does, and if the masking ever broke, it would
 * break here first rather than hiding behind a privileged read.
 *
 * The view carries no identity at all: no farmer id, no name, no mobile, no
 * village. Contact only ever arrives through an unlock.
 *
 * Migration 010 put the status and expiry rules inside the view, so nothing
 * here has to remember them: a removed, draft, flagged or past-harvest
 * listing simply is not in the result.
 */

export interface BrowseListing {
  id: string;
  variety_kn: string;
  variety_en: string;
  quantity_quintals: number;
  harvest_month: string;
  taluk_kn: string | null;
  taluk_en: string | null;
  district_en: string | null;
  status: string;
  created_at: string;
  moisture_pct: number | null;
  quality_checked_at: string | null;
}

export interface BrowseFilters {
  /** reference.districts.name_en — the view carries district_en, not Kannada. */
  districtEn?: string;
  /** reference.varieties.name_en — canonical, so a renamed Kannada label cannot break it. */
  varietyEn?: string;
  /** 1-12. */
  harvestMonth?: number;
  /** Only listings PaddyLink staff have actually checked. */
  qualityCheckedOnly?: boolean;
}

const SELECT =
  'id,variety_kn,variety_en,quantity_quintals,harvest_month,taluk_kn,taluk_en,' +
  'district_en,status,created_at,moisture_pct,quality_checked_at';

export function browseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Set them in .env.local (see .env.example).',
    );
  }
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

/**
 * harvest_month is a date, and the filter is a month NAME — "ನವೆಂಬರ್" should
 * match whichever November a listing falls in. PostgREST cannot filter on an
 * expression, so the candidate first-of-month dates are enumerated instead
 * and matched with `in`. Two years covers everything the platform can
 * produce: the listing form only ever writes the next occurrence of a month,
 * and a listing expires about a month after its harvest.
 */
export function monthCandidates(month: number, today = new Date()): string[] {
  const y = today.getFullYear();
  return [y, y + 1].map((year) => `${year}-${String(month).padStart(2, '0')}-01`);
}

export async function getBrowseListings(
  filters: BrowseFilters = {},
  client?: SupabaseClient,
): Promise<BrowseListing[]> {
  const supabase = client ?? browseClient();
  let query = supabase.from('listings_browse').select(SELECT);

  if (filters.districtEn) query = query.eq('district_en', filters.districtEn);
  if (filters.varietyEn) query = query.eq('variety_en', filters.varietyEn);
  if (filters.harvestMonth) query = query.in('harvest_month', monthCandidates(filters.harvestMonth));
  // The honest filter: a listing is checked only when staff recorded a check.
  if (filters.qualityCheckedOnly) query = query.not('quality_checked_at', 'is', null);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(`Could not load listings: ${error.message}`);
  return (data ?? []) as unknown as BrowseListing[];
}
