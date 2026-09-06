import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { PENDING_STALE_MINUTES } from '@/lib/buyerWallet';

/**
 * Stuck token orders, for the admin pending list. READ-ONLY: this file has no
 * write, and there is no companion API route.
 *
 * An order row is written pending before Razorpay checkout opens (014). In the
 * ordinary case the webhook flips it to paid within seconds. One still pending
 * ten minutes later means the webhook never arrived or never succeeded — which
 * is exactly the case where a buyer may have been charged and holds nothing,
 * so it has to be visible to a human rather than sitting in a table nobody
 * reads.
 *
 * Deliberately NOT actionable in this diff: no manual credit button. Crediting
 * has one path, process_razorpay_payment(), and a second one added in a hurry
 * beside a list like this is how a buyer ends up credited twice.
 */

export interface PendingOrderRow {
  id: string;
  buyerName: string | null;
  buyerMobile: string | null;
  businessName: string | null;
  amount: number;
  tokens: number;
  razorpayOrderId: string | null;
  createdAt: string;
  ageMinutes: number;
}

export async function getStalePendingOrders(): Promise<PendingOrderRow[]> {
  const db = createAdminClient();

  const cutoff = new Date(Date.now() - PENDING_STALE_MINUTES * 60_000).toISOString();

  const { data: rows, error } = await db
    .from('payments')
    .select('id,buyer_id,amount,tokens,razorpay_order_id,created_at')
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const buyerIds = [...new Set(rows.map((r) => r.buyer_id))];
  const { data: buyers } = await db
    .from('buyers')
    .select('id,name,mobile,business_name')
    .in('id', buyerIds);
  const byId = new Map((buyers ?? []).map((b) => [b.id, b]));

  const now = Date.now();
  return rows.map((r) => {
    const b = byId.get(r.buyer_id);
    return {
      id: r.id,
      buyerName: b?.name ?? null,
      buyerMobile: b?.mobile ?? null,
      businessName: b?.business_name ?? null,
      amount: Number(r.amount),
      tokens: Number(r.tokens),
      razorpayOrderId: r.razorpay_order_id,
      createdAt: r.created_at,
      ageMinutes: Math.floor((now - new Date(r.created_at).getTime()) / 60_000),
    };
  });
}
