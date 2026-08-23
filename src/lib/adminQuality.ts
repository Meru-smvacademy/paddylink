import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { listListings, type AdminListingRow } from '@/lib/adminListings';
import type { AdminRole } from '@/lib/adminSession';

/**
 * Quality desk data layer — the ONLY write path for the three migration-007
 * columns: moisture_pct, quality_checked_at, quality_checked_by. Service
 * role, admin-gated, never imported by the public site.
 *
 * CEO rulings (Desk 3 gate): checks can be EDITED (overwrite, with the
 * previous values in the audit row) but never DELETED from this desk — a
 * check on the wrong listing entirely is a direct-DB correction with an
 * audit note, revisited only if the field team hits it in practice.
 */

/** The sane moisture band — outside it the desk demands an explicit
 *  confirm. The DB's own hard limit (0–100, migration 007) stands anyway. */
export const SANE_MIN = 5.0;
export const SANE_MAX = 40.0;

export interface QualityFilters {
  districtEn?: string;
  /** 'YYYY-MM' */
  harvestMonth?: string;
  state?: 'pending' | 'checked';
}

export interface QualityQueue {
  rows: AdminListingRow[];
  /** Distinct district names among active listings, for the filter select. */
  districts: string[];
  /** Distinct 'YYYY-MM' harvest months among active listings, ascending. */
  months: string[];
  pendingCount: number;
  checkedCount: number;
}

/**
 * The work queue: ACTIVE listings only, pending checks first (newest first),
 * then the done pile (most recently checked first). Filter options are
 * derived from the unfiltered active set so a filter never hides its own
 * alternatives.
 */
export async function getQualityQueue(filters: QualityFilters): Promise<QualityQueue> {
  const active = await listListings('active');

  const districts = [...new Set(active.map((l) => l.district_en).filter((d): d is string => !!d))]
    .sort((a, b) => a.localeCompare(b));
  const months = [...new Set(active.map((l) => l.harvest_month.slice(0, 7)))].sort();

  let rows = active;
  if (filters.districtEn) rows = rows.filter((l) => l.district_en === filters.districtEn);
  if (filters.harvestMonth)
    rows = rows.filter((l) => l.harvest_month.slice(0, 7) === filters.harvestMonth);
  if (filters.state === 'pending') rows = rows.filter((l) => !l.quality_checked_at);
  if (filters.state === 'checked') rows = rows.filter((l) => !!l.quality_checked_at);

  rows = [...rows].sort((a, b) => {
    const aChecked = a.quality_checked_at ? 1 : 0;
    const bChecked = b.quality_checked_at ? 1 : 0;
    if (aChecked !== bChecked) return aChecked - bChecked; // pending first
    if (aChecked === 0) return b.created_at.localeCompare(a.created_at);
    return (b.quality_checked_at ?? '').localeCompare(a.quality_checked_at ?? '');
  });

  return {
    rows,
    districts,
    months,
    pendingCount: active.filter((l) => !l.quality_checked_at).length,
    checkedCount: active.filter((l) => !!l.quality_checked_at).length,
  };
}

interface CheckContext {
  ip: string | null;
  userAgent: string | null;
}

/**
 * Record (or overwrite) a quality check. Writes exactly the three columns;
 * the schema's own CHECK (moisture requires checked_at) is satisfied by
 * construction. Allowed on active listings only — this desk never touches
 * settled history. The audit row carries the new values and, on an
 * overwrite, the previous ones.
 */
export async function recordQualityCheck(
  listingId: string,
  moisturePct: number,
  checkedBy: string,
  checkedAtIso: string,
  actorRole: AdminRole,
  ctx: CheckContext,
): Promise<{ ok: true; overwrote: boolean } | { ok: false; error: string }> {
  const db = createAdminClient();

  const { data: current, error: cErr } = await db
    .from('listings')
    .select('id,status,moisture_pct,quality_checked_at,quality_checked_by')
    .eq('id', listingId)
    .maybeSingle();
  if (cErr) return { ok: false, error: `listing read: ${cErr.message}` };
  if (!current) return { ok: false, error: 'listing_not_found' };
  if (current.status !== 'active') return { ok: false, error: 'not_active' };

  const previous = current.quality_checked_at
    ? {
        moisture_pct: current.moisture_pct,
        quality_checked_at: current.quality_checked_at,
        quality_checked_by: current.quality_checked_by,
      }
    : null;

  const { error: uErr } = await db
    .from('listings')
    .update({
      moisture_pct: moisturePct,
      quality_checked_at: checkedAtIso,
      quality_checked_by: checkedBy,
    })
    .eq('id', listingId);
  if (uErr) return { ok: false, error: `listing update: ${uErr.message}` };

  const { error: aErr } = await db.from('audit_log').insert({
    actor_id: null, // TEMP-TWO-TIER: no auth.users row yet; role is the actor
    // The real role that recorded this — 'staff' when a field user did it, not
    // a hardcoded 'admin'. checked_by carries the human name on top of this.
    actor_role: actorRole,
    action: 'quality_check_record',
    entity: 'listings',
    entity_id: listingId,
    meta: {
      moisture_pct: moisturePct,
      quality_checked_at: checkedAtIso,
      quality_checked_by: checkedBy,
      // On an edit, the trail shows exactly what was replaced.
      previous,
    },
    ip_address: ctx.ip,
    user_agent: ctx.userAgent,
  });
  if (aErr) return { ok: false, error: `audit_log insert: ${aErr.message}` };

  return { ok: true, overwrote: previous !== null };
}
