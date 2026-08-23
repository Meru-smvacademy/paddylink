import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Overview desk data layer — STRICTLY READ-ONLY oversight. Every function
 * here reads and nothing writes; there is no companion API route. Service
 * role, admin-gated, never imported by the public site.
 *
 * Money and unlock tables (buyer_wallets, token_ledger, payments, unlocks)
 * carry their own RLS (migration 004); this desk reads them with the
 * service-role client — the established admin pattern — deliberately, for
 * oversight. All are empty today and shown honestly.
 */

export interface OverviewCounts {
  farmers: number;
  listingsByStatus: Record<string, number>;
  listingsTotal: number;
  buyersByKyc: Record<string, number>;
  buyersTotal: number;
  qualityChecked: number;
  qualityPending: number;
}

export interface AuditEntry {
  id: number;
  actor_role: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  meta: unknown;
  created_at: string;
}

export interface WalletRow {
  buyer_id: string;
  business_name: string | null;
  balance: number;
  updated_at: string;
}

export interface LedgerRow {
  id: number;
  buyer_id: string;
  business_name: string | null;
  delta: number;
  reason: string;
  created_at: string;
}

export interface UnlockRow {
  id: string;
  business_name: string | null;
  listing_id: string;
  status: string;
  created_at: string;
}

export interface PaymentRow {
  id: string;
  business_name: string | null;
  amount: number;
  tokens: number;
  status: string;
  created_at: string;
}

export interface OverviewData {
  counts: OverviewCounts;
  audit: AuditEntry[];
  wallets: WalletRow[];
  ledger: LedgerRow[];
  unlocks: UnlockRow[];
  payments: PaymentRow[];
}

export async function getOverview(): Promise<OverviewData> {
  const db = createAdminClient();

  // ── Counts ────────────────────────────────────────────────────────────
  // Statuses are read from the rows present, then folded onto the full set
  // of allowed values so a zero bucket still shows.
  const LISTING_STATUSES = ['draft', 'active', 'flagged', 'sold', 'expired', 'removed'];
  const KYC_STATUSES = ['pending', 'under_review', 'approved', 'rejected'];

  const [farmersRes, listingRows, buyerRows, qCheckedRes, qActiveRes] = await Promise.all([
    db.from('farmers').select('id', { count: 'exact', head: true }),
    db.from('listings').select('status'),
    db.from('buyers').select('kyc_status'),
    db
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .not('quality_checked_at', 'is', null),
    db.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ]);
  for (const r of [farmersRes, listingRows, buyerRows, qCheckedRes, qActiveRes]) {
    if (r.error) console.error('[adminOverview] count read:', r.error.message);
  }
  const farmers = farmersRes.count ?? 0;
  const qChecked = qCheckedRes.count ?? 0;
  const qActive = qActiveRes.count ?? 0;

  const listingsByStatus: Record<string, number> = Object.fromEntries(
    LISTING_STATUSES.map((s) => [s, 0]),
  );
  for (const r of listingRows.data ?? []) {
    const s = (r as { status: string }).status;
    listingsByStatus[s] = (listingsByStatus[s] ?? 0) + 1;
  }
  const buyersByKyc: Record<string, number> = Object.fromEntries(KYC_STATUSES.map((s) => [s, 0]));
  for (const r of buyerRows.data ?? []) {
    const s = (r as { kyc_status: string }).kyc_status;
    buyersByKyc[s] = (buyersByKyc[s] ?? 0) + 1;
  }

  const counts: OverviewCounts = {
    farmers,
    listingsByStatus,
    listingsTotal: (listingRows.data ?? []).length,
    buyersByKyc,
    buyersTotal: (buyerRows.data ?? []).length,
    qualityChecked: qChecked,
    qualityPending: Math.max(0, qActive - qChecked),
  };

  // ── Recent activity: real audit_log, latest 50 ──────────────────────────
  const auditRes = await db
    .from('audit_log')
    .select('id,actor_role,action,entity,entity_id,meta,created_at')
    .order('id', { ascending: false })
    .limit(50);
  if (auditRes.error) console.error('[adminOverview] audit:', auditRes.error.message);
  const audit = (auditRes.data ?? []) as AuditEntry[];

  // ── Buyer name lookup for the money sections ────────────────────────────
  const { data: buyerNames } = await db.from('buyers').select('id,business_name');
  const nameOf = new Map((buyerNames ?? []).map((b) => [b.id as string, b.business_name as string | null]));

  const [walletRes, ledgerRes, unlockRes, paymentRes] = await Promise.all([
    db.from('buyer_wallets').select('buyer_id,balance,updated_at').order('balance', { ascending: false }).limit(50),
    db.from('token_ledger').select('id,buyer_id,delta,reason,created_at').order('id', { ascending: false }).limit(20),
    db.from('unlocks').select('id,buyer_id,listing_id,status,created_at').order('created_at', { ascending: false }).limit(20),
    db.from('payments').select('id,buyer_id,amount,tokens,status,created_at').order('created_at', { ascending: false }).limit(20),
  ]);
  for (const r of [walletRes, ledgerRes, unlockRes, paymentRes]) {
    if (r.error) console.error('[adminOverview] money read:', r.error.message);
  }

  const wallets: WalletRow[] = (walletRes.data ?? []).map((w) => ({
    buyer_id: w.buyer_id,
    business_name: nameOf.get(w.buyer_id) ?? null,
    balance: w.balance,
    updated_at: w.updated_at,
  }));
  const ledger: LedgerRow[] = (ledgerRes.data ?? []).map((l) => ({
    id: l.id,
    buyer_id: l.buyer_id,
    business_name: nameOf.get(l.buyer_id) ?? null,
    delta: l.delta,
    reason: l.reason,
    created_at: l.created_at,
  }));
  const unlocks: UnlockRow[] = (unlockRes.data ?? []).map((u) => ({
    id: u.id,
    business_name: nameOf.get(u.buyer_id) ?? null,
    listing_id: u.listing_id,
    status: u.status,
    created_at: u.created_at,
  }));
  const payments: PaymentRow[] = (paymentRes.data ?? []).map((p) => ({
    id: p.id,
    business_name: nameOf.get(p.buyer_id) ?? null,
    amount: p.amount,
    tokens: p.tokens,
    status: p.status,
    created_at: p.created_at,
  }));

  return { counts, audit, wallets, ledger, unlocks, payments };
}
