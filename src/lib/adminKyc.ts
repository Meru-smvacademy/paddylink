import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * KYC desk data layer. Everything here runs on the service-role client and is
 * reachable only from admin pages/routes that have already passed the admin
 * session checks (proxy gate + in-route re-check). Nothing in this file may
 * be imported by the public site.
 *
 * VOCABULARY — the schema's approved state is 'approved' (buyers.kyc_status
 * CHECK in 001: pending | under_review | approved | rejected). The product
 * word is "Verified"; that mapping lives in the UI label, not in the data.
 */

export const KYC_STATUSES = ['pending', 'under_review', 'approved', 'rejected'] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

export interface AdminBuyerRow {
  id: string;
  name: string; // contact person
  business_name: string | null;
  mobile: string;
  email: string | null;
  business_type: string | null;
  gstin: string | null;
  apmc_license_no: string | null;
  pan: string | null;
  business_address: string | null;
  district_id: number | null;
  kyc_status: KycStatus;
  created_at: string;
  district_en: string | null; // joined in JS from ref_districts
}

export interface AdminBuyerDocument {
  id: string;
  doc_type: string;
  storage_path: string;
  status: string;
  reviewed_at: string | null;
  reject_reason: string | null;
  created_at: string;
  /** Short-lived signed URL into the private kyc-docs bucket, or null when
   *  signing failed (the path is still shown so the failure is visible). */
  signed_url: string | null;
}

const BUYER_SELECT =
  'id,name,business_name,mobile,email,business_type,gstin,apmc_license_no,' +
  'pan,business_address,district_id,kyc_status,created_at';

/** Seconds a certificate link stays alive. Long enough to open and read a
 *  PDF, short enough that a leaked link dies within the review sitting. */
export const SIGNED_URL_TTL_SECONDS = 300;

async function districtNames(): Promise<Map<number, string>> {
  const db = createAdminClient();
  const { data, error } = await db.from('ref_districts').select('id,name_en');
  if (error) throw new Error(`ref_districts: ${error.message}`);
  return new Map((data ?? []).map((d) => [d.id as number, d.name_en as string]));
}

/**
 * All buyers for the desk table. With no status filter the queue reads
 * pending first, then under_review, then the settled ones — newest first
 * within each band — so open work is always at the top.
 */
export async function listBuyers(status?: KycStatus): Promise<AdminBuyerRow[]> {
  const db = createAdminClient();
  let query = db.from('buyers').select(BUYER_SELECT).order('created_at', { ascending: false });
  if (status) query = query.eq('kyc_status', status);
  const [{ data, error }, districts] = await Promise.all([query, districtNames()]);
  if (error) throw new Error(`buyers list: ${error.message}`);

  // The select string is assembled at runtime, so supabase-js cannot infer
  // the row shape; BUYER_SELECT and this type are kept in step by hand.
  const raw = (data ?? []) as unknown as Omit<AdminBuyerRow, 'district_en'>[];
  const rows = raw.map((b) => ({
    ...b,
    district_en: b.district_id != null ? (districts.get(b.district_id) ?? null) : null,
  }));

  if (!status) {
    const band: Record<string, number> = { pending: 0, under_review: 1, approved: 2, rejected: 2 };
    rows.sort(
      (a, c) =>
        (band[a.kyc_status] ?? 3) - (band[c.kyc_status] ?? 3) ||
        c.created_at.localeCompare(a.created_at),
    );
  }
  return rows;
}

/** One buyer plus documents, each with a fresh short-lived signed URL. */
export async function getBuyerDetail(
  id: string,
): Promise<{ buyer: AdminBuyerRow; documents: AdminBuyerDocument[] } | null> {
  const db = createAdminClient();
  const [{ data: buyerRaw, error: bErr }, districts] = await Promise.all([
    db.from('buyers').select(BUYER_SELECT).eq('id', id).maybeSingle(),
    districtNames(),
  ]);
  if (bErr) throw new Error(`buyer detail: ${bErr.message}`);
  if (!buyerRaw) return null;
  const buyer = buyerRaw as unknown as Omit<AdminBuyerRow, 'district_en'>;

  const { data: docs, error: dErr } = await db
    .from('buyer_documents')
    .select('id,doc_type,storage_path,status,reviewed_at,reject_reason,created_at')
    .eq('buyer_id', id)
    .order('created_at', { ascending: true });
  if (dErr) throw new Error(`buyer documents: ${dErr.message}`);

  const documents: AdminBuyerDocument[] = await Promise.all(
    (docs ?? []).map(async (doc) => {
      // Signed server-side, never a public URL, never the service key in the
      // client. The URL dies after SIGNED_URL_TTL_SECONDS.
      const { data: signed, error: sErr } = await db.storage
        .from('kyc-docs')
        .createSignedUrl(doc.storage_path, SIGNED_URL_TTL_SECONDS);
      if (sErr) console.error('[adminKyc] sign failed for', doc.storage_path, sErr.message);
      return { ...doc, signed_url: signed?.signedUrl ?? null };
    }),
  );

  return {
    buyer: {
      ...buyer,
      district_en:
        buyer.district_id != null ? (districts.get(buyer.district_id) ?? null) : null,
    },
    documents,
  };
}

interface DecisionContext {
  ip: string | null;
  userAgent: string | null;
}

/**
 * Approve or reject a buyer's KYC. Writes, in order:
 *   1. buyers.kyc_status → 'approved' | 'rejected'
 *   2. buyer_documents   → mirrored status, reviewed_at stamp, reject_reason
 *      (reviewed_by stays NULL: it references auth.users and no admin user
 *      exists yet — TEMP-SINGLE-ADMIN; identity is carried by audit_log)
 *   3. audit_log         → actor_role 'admin', action, entity, meta
 * No transaction spans 1–3 (no RPC yet), so a failure part-way is reported
 * loudly and the table re-read shows exactly what did land.
 *
 * NOTE — no notification is sent on approval. That is deliberate: buyer
 * SMS/email waits for MSG91. Do not fake it here.
 */
export async function decideBuyerKyc(
  buyerId: string,
  decision: 'approve' | 'reject',
  reason: string | null,
  ctx: DecisionContext,
): Promise<{ ok: true; kyc_status: KycStatus } | { ok: false; error: string }> {
  const db = createAdminClient();
  const nextStatus: KycStatus = decision === 'approve' ? 'approved' : 'rejected';
  const now = new Date().toISOString();

  const { data: updated, error: uErr } = await db
    .from('buyers')
    .update({ kyc_status: nextStatus })
    .eq('id', buyerId)
    .select('id,kyc_status')
    .maybeSingle();
  if (uErr) return { ok: false, error: `buyers update: ${uErr.message}` };
  if (!updated) return { ok: false, error: 'buyer_not_found' };

  const { error: dErr } = await db
    .from('buyer_documents')
    .update({
      status: nextStatus,
      reviewed_at: now,
      reject_reason: decision === 'reject' ? reason : null,
    })
    .eq('buyer_id', buyerId);
  if (dErr) return { ok: false, error: `buyer_documents update: ${dErr.message}` };

  const { error: aErr } = await db.from('audit_log').insert({
    actor_id: null, // TEMP-SINGLE-ADMIN: no auth.users row for the admin yet
    actor_role: 'admin',
    action: decision === 'approve' ? 'buyer_kyc_approve' : 'buyer_kyc_reject',
    entity: 'buyers',
    entity_id: buyerId,
    meta: decision === 'reject' ? { reason } : {},
    ip_address: ctx.ip,
    user_agent: ctx.userAgent,
  });
  if (aErr) return { ok: false, error: `audit_log insert: ${aErr.message}` };

  return { ok: true, kyc_status: updated.kyc_status as KycStatus };
}
