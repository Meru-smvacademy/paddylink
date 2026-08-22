import { createClient } from '@supabase/supabase-js';

/**
 * Reference data — districts, taluks and varieties — read from the three
 * public views added by migration 005.
 *
 * These carry no personal data (a map of Karnataka plus a list of paddy
 * varieties), so the anon key is the right key: no service-role privilege is
 * needed to read them. Fetched on the server so the form renders with its
 * dropdowns already populated, with no loading state.
 *
 * The district list is deliberately short. It holds the districts PaddyLink
 * actually operates in, not all of Karnataka, because the farmer form
 * promises "ಕಟಾವಿನ ಸಮಯದಲ್ಲಿ ನಮ್ಮ ತಂಡ ಬರುತ್ತದೆ" — a promise we can only keep
 * where we operate. It grows as operations grow; nothing in the app hardcodes
 * it any more.
 */

export interface RefDistrict {
  id: number;
  name_en: string;
  name_kn: string;
}

export interface RefTaluk {
  id: number;
  district_id: number;
  name_en: string;
  name_kn: string;
}

export interface RefVariety {
  id: number;
  name_en: string;
  name_kn: string;
}

export interface ReferenceData {
  districts: RefDistrict[];
  taluks: RefTaluk[];
  varieties: RefVariety[];
}

/** The catch-all variety. Identified by name_en, never by id: migration 006
 *  seeded ಜ್ಯೋತಿ after it, so it is no longer the highest id. */
export const OTHER_VARIETY_EN = 'Other';

function anonServerClient() {
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

export async function getReferenceData(): Promise<ReferenceData> {
  const supabase = anonServerClient();

  const [districts, taluks, varieties] = await Promise.all([
    supabase.from('ref_districts').select('id,name_en,name_kn').order('id'),
    supabase.from('ref_taluks').select('id,district_id,name_en,name_kn').order('id'),
    supabase.from('ref_varieties').select('id,name_en,name_kn').order('id'),
  ]);

  const firstError = districts.error ?? taluks.error ?? varieties.error;
  if (firstError) {
    throw new Error(`Could not load reference data: ${firstError.message}`);
  }

  return {
    districts: districts.data ?? [],
    taluks: taluks.data ?? [],
    // ಇತರೆ / Other belongs at the bottom of the list, whatever its id.
    varieties: sortOtherLast(varieties.data ?? []),
  };
}

export function sortOtherLast(varieties: RefVariety[]): RefVariety[] {
  return [...varieties].sort((a, b) => {
    if (a.name_en === OTHER_VARIETY_EN) return 1;
    if (b.name_en === OTHER_VARIETY_EN) return -1;
    return a.id - b.id;
  });
}

/**
 * The harvest month the farmer picked, as the date the schema wants: the
 * first of that month, in its next occurrence from today. Per CEO ruling —
 * in August 2026, ನವೆಂಬರ್ resolves to 2026-11-01 and ಮಾರ್ಚ್ to 2027-03-01.
 * The current month resolves to this year, not next.
 *
 * `month` is 1-12. Returns an ISO date string, which is what PostgREST wants
 * for a `date` column.
 */
export function harvestMonthToDate(month: number, today = new Date()): string {
  const thisMonth = today.getMonth() + 1;
  const year = month >= thisMonth ? today.getFullYear() : today.getFullYear() + 1;
  return `${year}-${String(month).padStart(2, '0')}-01`;
}
