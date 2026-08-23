import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Listings desk data layer. Service-role reads/writes, reachable only behind
 * the admin gate (proxy + in-route checks). Never import from the public
 * site.
 *
 * VOCABULARY — listings.status CHECK (001) is
 *   draft | active | sold | expired | removed | flagged
 * There is no 'approved'/'rejected' state for listings. The desk's Approve
 * puts a listing on the market ('active'); Reject takes it off ('removed').
 * The internal reject reason lives in audit_log.meta — listing_removals is
 * the farmer-initiated removal log with an enum reason and stays theirs.
 */

export const LISTING_STATUSES = [
  'draft',
  'active',
  'flagged',
  'sold',
  'expired',
  'removed',
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

/** Which desk action is allowed from which status. Sold and expired are
 *  settled history — the desk never rewrites them. */
export const CAN_APPROVE: readonly ListingStatus[] = ['draft', 'flagged', 'removed'];
export const CAN_REJECT: readonly ListingStatus[] = ['draft', 'active', 'flagged'];

export interface AdminListingRow {
  id: string;
  status: ListingStatus;
  variety_id: number;
  variety_other: string | null;
  quantity_quintals: number;
  harvest_month: string;
  created_by: string;
  photo_path: string | null;
  moisture_pct: number | null;
  quality_checked_at: string | null;
  quality_checked_by: string | null;
  expires_at: string;
  created_at: string;
  farmer: {
    id: string;
    full_name: string | null;
    mobile: string;
    village: string | null;
    taluk_id: number | null;
  } | null;
  // joined in JS from the ref views
  variety_en: string | null;
  variety_kn: string | null;
  taluk_en: string | null;
  district_en: string | null;
}

const LISTING_SELECT =
  'id,status,variety_id,variety_other,quantity_quintals,harvest_month,created_by,' +
  'photo_path,moisture_pct,quality_checked_at,quality_checked_by,expires_at,created_at,' +
  'farmer:farmers(id,full_name,mobile,village,taluk_id)';

export const SIGNED_URL_TTL_SECONDS = 300;

interface RefMaps {
  varieties: Map<number, { name_en: string; name_kn: string }>;
  taluks: Map<number, { name_en: string; district_id: number }>;
  districts: Map<number, string>;
}

async function refMaps(): Promise<RefMaps> {
  const db = createAdminClient();
  const [v, t, d] = await Promise.all([
    db.from('ref_varieties').select('id,name_en,name_kn'),
    db.from('ref_taluks').select('id,district_id,name_en'),
    db.from('ref_districts').select('id,name_en'),
  ]);
  for (const r of [v, t, d]) {
    if (r.error) throw new Error(`ref views: ${r.error.message}`);
  }
  return {
    varieties: new Map((v.data ?? []).map((x) => [x.id, { name_en: x.name_en, name_kn: x.name_kn }])),
    taluks: new Map((t.data ?? []).map((x) => [x.id, { name_en: x.name_en, district_id: x.district_id }])),
    districts: new Map((d.data ?? []).map((x) => [x.id, x.name_en])),
  };
}

type RawListing = Omit<AdminListingRow, 'variety_en' | 'variety_kn' | 'taluk_en' | 'district_en'>;

function joinRefs(raw: RawListing, refs: RefMaps): AdminListingRow {
  const variety = refs.varieties.get(raw.variety_id) ?? null;
  const taluk = raw.farmer?.taluk_id != null ? (refs.taluks.get(raw.farmer.taluk_id) ?? null) : null;
  return {
    ...raw,
    variety_en: variety?.name_en ?? null,
    variety_kn: variety?.name_kn ?? null,
    taluk_en: taluk?.name_en ?? null,
    district_en: taluk ? (refs.districts.get(taluk.district_id) ?? null) : null,
  };
}

/**
 * All listings for the desk table. With no status filter, listings needing
 * attention (draft, flagged) surface first, newest first within each band.
 */
export async function listListings(status?: ListingStatus): Promise<AdminListingRow[]> {
  const db = createAdminClient();
  let query = db.from('listings').select(LISTING_SELECT).order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const [{ data, error }, refs] = await Promise.all([query, refMaps()]);
  if (error) throw new Error(`listings list: ${error.message}`);

  const rows = ((data ?? []) as unknown as RawListing[]).map((l) => joinRefs(l, refs));
  if (!status) {
    const band: Record<string, number> = {
      draft: 0,
      flagged: 0,
      active: 1,
      sold: 2,
      expired: 2,
      removed: 2,
    };
    rows.sort(
      (a, b) =>
        (band[a.status] ?? 3) - (band[b.status] ?? 3) || b.created_at.localeCompare(a.created_at),
    );
  }
  return rows;
}

/** One listing, with a short-lived signed URL for its crop photo if any. */
export async function getListingDetail(
  id: string,
): Promise<{ listing: AdminListingRow; photo_url: string | null } | null> {
  const db = createAdminClient();
  const [{ data, error }, refs] = await Promise.all([
    db.from('listings').select(LISTING_SELECT).eq('id', id).maybeSingle(),
    refMaps(),
  ]);
  if (error) throw new Error(`listing detail: ${error.message}`);
  if (!data) return null;
  const listing = joinRefs(data as unknown as RawListing, refs);

  let photoUrl: string | null = null;
  if (listing.photo_path) {
    // Signed server-side from the private listing-photos bucket; same rules
    // as the KYC certificates: never public, dies after the TTL.
    const { data: signed, error: sErr } = await db.storage
      .from('listing-photos')
      .createSignedUrl(listing.photo_path, SIGNED_URL_TTL_SECONDS);
    if (sErr) console.error('[adminListings] sign failed for', listing.photo_path, sErr.message);
    photoUrl = signed?.signedUrl ?? null;
  }
  return { listing, photo_url: photoUrl };
}

interface DecisionContext {
  ip: string | null;
  userAgent: string | null;
}

/**
 * Approve (→ active) or reject (→ removed) a listing, honouring the
 * from-status rules above, then record the decision in audit_log
 * (actor_role 'admin' — TEMP-SINGLE-ADMIN). Same non-transactional caveat
 * as the KYC desk: a failure part-way is reported loudly.
 */
export async function decideListing(
  listingId: string,
  decision: 'approve' | 'reject',
  reason: string | null,
  ctx: DecisionContext,
): Promise<{ ok: true; status: ListingStatus } | { ok: false; error: string }> {
  const db = createAdminClient();

  const { data: current, error: cErr } = await db
    .from('listings')
    .select('id,status')
    .eq('id', listingId)
    .maybeSingle();
  if (cErr) return { ok: false, error: `listing read: ${cErr.message}` };
  if (!current) return { ok: false, error: 'listing_not_found' };

  const from = current.status as ListingStatus;
  const allowed = decision === 'approve' ? CAN_APPROVE : CAN_REJECT;
  if (!allowed.includes(from)) return { ok: false, error: `not_allowed_from_${from}` };

  const nextStatus: ListingStatus = decision === 'approve' ? 'active' : 'removed';
  const { error: uErr } = await db
    .from('listings')
    .update({ status: nextStatus })
    .eq('id', listingId);
  if (uErr) return { ok: false, error: `listing update: ${uErr.message}` };

  const { error: aErr } = await db.from('audit_log').insert({
    actor_id: null, // TEMP-SINGLE-ADMIN
    actor_role: 'admin',
    action: decision === 'approve' ? 'listing_approve' : 'listing_reject',
    entity: 'listings',
    entity_id: listingId,
    meta: decision === 'reject' ? { reason, from_status: from } : { from_status: from },
    ip_address: ctx.ip,
    user_agent: ctx.userAgent,
  });
  if (aErr) return { ok: false, error: `audit_log insert: ${aErr.message}` };

  return { ok: true, status: nextStatus };
}

/* ── Field-team route list ─────────────────────────────────────────────── */

export interface RouteListing {
  id: string;
  farmer_name: string | null;
  farmer_mobile: string;
  village: string | null;
  variety_kn: string | null;
  variety_en: string | null;
  variety_other: string | null;
  quantity_quintals: number;
  moisture_pct: number | null;
  quality_checked_at: string | null;
}

export interface RouteVillage {
  village: string;
  listings: RouteListing[];
}

export interface RouteTaluk {
  taluk_en: string;
  quintals: number;
  unchecked: number;
  villages: RouteVillage[];
}

export interface RouteDistrict {
  district_en: string;
  quintals: number;
  unchecked: number;
  taluks: RouteTaluk[];
}

export interface RoutePlan {
  months: string[]; // distinct harvest months with active listings, ascending
  month: string | null; // the month this plan covers
  districts: RouteDistrict[];
  total: number;
  unchecked: number;
}

/**
 * The field team's visit plan: ACTIVE listings for one harvest month,
 * grouped district → taluk → village. Farmer mobile is included — this is a
 * staff-only surface and the team phones ahead. Unchecked listings are the
 * reason a visit exists, so each group carries its unchecked count.
 */
export async function getRoutePlan(monthParam?: string): Promise<RoutePlan> {
  const all = (await listListings('active')).filter((l) => l.status === 'active');

  const months = [...new Set(all.map((l) => l.harvest_month.slice(0, 7)))].sort();
  let month: string | null = null;
  if (monthParam && months.includes(monthParam)) {
    month = monthParam;
  } else if (months.length > 0) {
    // Default to the nearest month not already behind us, else the latest.
    const nowMonth = new Date().toISOString().slice(0, 7);
    month = months.find((m) => m >= nowMonth) ?? months[months.length - 1];
  }

  const inMonth = month ? all.filter((l) => l.harvest_month.slice(0, 7) === month) : [];

  const byDistrict = new Map<string, Map<string, Map<string, RouteListing[]>>>();
  for (const l of inMonth) {
    const district = l.district_en ?? 'Unknown district';
    const taluk = l.taluk_en ?? 'Unknown taluk';
    const village = l.farmer?.village?.trim() || 'Unknown village';
    const dMap = byDistrict.get(district) ?? new Map();
    byDistrict.set(district, dMap);
    const tMap = dMap.get(taluk) ?? new Map();
    dMap.set(taluk, tMap);
    const list = tMap.get(village) ?? [];
    tMap.set(village, list);
    list.push({
      id: l.id,
      farmer_name: l.farmer?.full_name ?? null,
      farmer_mobile: l.farmer?.mobile ?? '',
      village: l.farmer?.village ?? null,
      variety_kn: l.variety_kn,
      variety_en: l.variety_en,
      variety_other: l.variety_other,
      quantity_quintals: l.quantity_quintals,
      moisture_pct: l.moisture_pct,
      quality_checked_at: l.quality_checked_at,
    });
  }

  const sorted = (keys: Iterable<string>) => [...keys].sort((a, b) => a.localeCompare(b));
  const districts: RouteDistrict[] = sorted(byDistrict.keys()).map((dName) => {
    const dMap = byDistrict.get(dName)!;
    const taluks: RouteTaluk[] = sorted(dMap.keys()).map((tName) => {
      const tMap = dMap.get(tName)!;
      const villages: RouteVillage[] = sorted(tMap.keys()).map((vName) => ({
        village: vName,
        listings: tMap.get(vName)!,
      }));
      const flat = villages.flatMap((v) => v.listings);
      return {
        taluk_en: tName,
        quintals: flat.reduce((s, l) => s + Number(l.quantity_quintals), 0),
        unchecked: flat.filter((l) => !l.quality_checked_at).length,
        villages,
      };
    });
    const flat = taluks.flatMap((t) => t.villages.flatMap((v) => v.listings));
    return {
      district_en: dName,
      quintals: taluks.reduce((s, t) => s + t.quintals, 0),
      unchecked: flat.filter((l) => !l.quality_checked_at).length,
      taluks,
    };
  });

  return {
    months,
    month,
    districts,
    total: inMonth.length,
    unchecked: inMonth.filter((l) => !l.quality_checked_at).length,
  };
}
