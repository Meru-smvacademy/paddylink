import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * The buyer's wallet: balance, the pack on sale, and what he has spent on.
 *
 * BALANCE COMES FROM THE LEDGER, not from a constant and not from a number
 * kept somewhere convenient. public.token_ledger is append-only by trigger
 * (001), so the sum of its deltas is the one figure that cannot be edited
 * into being wrong — buyer_wallets.balance is the running cache of the same
 * number, and reconcile_wallets() exists precisely to shout when the two
 * disagree. What the buyer is shown is the sum.
 *
 * THE PACK COMES FROM config.token_packs, the same row migration 012 settled.
 * No price is written down in the app; change the config row and the wallet
 * follows without a deploy, exactly as the unlock cost does.
 *
 * TEMP-PRE-AUTH: the buyer is resolved from the httpOnly cookie, not a
 * verified session, and these reads run on the service-role client because
 * there is no authenticated role to run them as. The mobile is only ever used
 * as an equality filter, never interpolated. When OTP lands these move behind
 * the buyer's own RLS policies, which 001 already wrote (wallet_self,
 * ledger_self, unlocks_self, and recredits_self from 011).
 */

export interface TokenPack {
  id: string;
  tokens: number;
  /** Paise, as everywhere else in this schema. */
  price: number;
}

export interface UnlockHistoryRow {
  id: string;
  listingId: string;
  varietyKn: string;
  quantityQuintals: number;
  talukKn: string | null;
  unlockedAt: string;
  /** 'valid' | 'disputed' | 'refunded'. */
  status: string;
  /** The farmer marked this paddy sold; the card carries a sold tag. */
  listingSold: boolean;
  /** Set when a token came back for this unlock, with the reason recorded. */
  recredit: { tokens: number; reason: string; at: string } | null;
}

export interface PendingOrder {
  id: string;
  razorpayOrderId: string | null;
  tokens: number;
  amount: number;
  createdAt: string;
}

export interface BuyerWallet {
  buyerId: string;
  name: string;
  mobile: string;
  /** Sum of token_ledger.delta. The ledger is the balance. */
  balance: number;
  pack: TokenPack | null;
  unlocks: UnlockHistoryRow[];
  /** Most recent order still awaiting its webhook, if any. */
  pending: PendingOrder | null;
}

/** An order older than this with no webhook is a problem, not a wait. */
export const PENDING_STALE_MINUTES = 10;

export async function getBuyerWallet(mobile: string): Promise<BuyerWallet | null> {
  const supabase = createAdminClient();

  const { data: buyer, error: buyerErr } = await supabase
    .from('buyers')
    .select('id,name,mobile')
    .eq('mobile', mobile)
    .maybeSingle();
  if (buyerErr) throw buyerErr;
  if (!buyer) return null;

  const [ledger, packCfg, unlocks, recredits, pending] = await Promise.all([
    supabase.from('token_ledger').select('delta').eq('buyer_id', buyer.id),
    supabase.from('config').select('value').eq('key', 'token_packs').maybeSingle(),
    supabase
      .from('unlocks')
      .select('id,listing_id,status,created_at')
      .eq('buyer_id', buyer.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('unlock_recredits')
      .select('unlock_id,tokens,reason,created_at')
      .eq('buyer_id', buyer.id),
    supabase
      .from('payments')
      .select('id,razorpay_order_id,tokens,amount,created_at')
      .eq('buyer_id', buyer.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (ledger.error) throw ledger.error;

  /* The balance IS the ledger. Nothing else is consulted. */
  const balance = (ledger.data ?? []).reduce((sum, r) => sum + Number(r.delta), 0);

  /* One pack since 012. Read as a list anyway, and the first row is taken —
     the shape survives if a second pack is ever added back. */
  const packs = (packCfg.data?.value ?? []) as TokenPack[];
  const pack = Array.isArray(packs) && packs.length > 0 ? packs[0] : null;

  /* Listings the unlocks point at, for names the buyer will recognise. The
     unlocked listing may since have been marked sold, which the history has
     to say — he paid for that contact and the card must not quietly change
     meaning. */
  const listingIds = (unlocks.data ?? []).map((u) => u.listing_id);
  const listingById = new Map<
    string,
    { variety: string; qty: number; taluk: string | null; sold: boolean }
  >();

  if (listingIds.length > 0) {
    const { data: rows } = await supabase
      .from('listings')
      .select('id,variety_id,variety_other,quantity_quintals,status,farmer_id')
      .in('id', listingIds);

    const varietyIds = [...new Set((rows ?? []).map((r) => r.variety_id))];
    const farmerIds = [...new Set((rows ?? []).map((r) => r.farmer_id))];
    const [{ data: varieties }, { data: farmers }] = await Promise.all([
      supabase.from('ref_varieties').select('id,name_kn').in('id', varietyIds),
      supabase.from('farmers').select('id,taluk_id').in('id', farmerIds),
    ]);
    const talukIds = [...new Set((farmers ?? []).map((f) => f.taluk_id).filter(Boolean))];
    const { data: taluks } = talukIds.length
      ? await supabase.from('ref_taluks').select('id,name_kn').in('id', talukIds)
      : { data: [] as { id: number; name_kn: string }[] };

    const varietyKn = new Map((varieties ?? []).map((v) => [v.id, v.name_kn]));
    const talukKn = new Map((taluks ?? []).map((t) => [t.id, t.name_kn]));
    const farmerTaluk = new Map((farmers ?? []).map((f) => [f.id, f.taluk_id]));

    for (const r of rows ?? []) {
      listingById.set(r.id, {
        // The farmer's own words win when he chose ಇತರೆ, as on his own page.
        variety: r.variety_other ?? varietyKn.get(r.variety_id) ?? '',
        qty: Number(r.quantity_quintals),
        taluk: talukKn.get(farmerTaluk.get(r.farmer_id) as number) ?? null,
        sold: r.status === 'sold',
      });
    }
  }

  const recreditByUnlock = new Map(
    (recredits.data ?? []).map((r) => [
      r.unlock_id,
      { tokens: Number(r.tokens), reason: r.reason as string, at: r.created_at as string },
    ]),
  );

  const history: UnlockHistoryRow[] = (unlocks.data ?? []).map((u) => {
    const l = listingById.get(u.listing_id);
    return {
      id: u.id,
      listingId: u.listing_id,
      varietyKn: l?.variety ?? '',
      quantityQuintals: l?.qty ?? 0,
      talukKn: l?.taluk ?? null,
      unlockedAt: u.created_at,
      status: u.status,
      listingSold: l?.sold ?? false,
      recredit: recreditByUnlock.get(u.id) ?? null,
    };
  });

  return {
    buyerId: buyer.id,
    name: buyer.name,
    mobile: buyer.mobile,
    balance,
    pack,
    unlocks: history,
    pending: pending.data
      ? {
          id: pending.data.id,
          razorpayOrderId: pending.data.razorpay_order_id,
          tokens: Number(pending.data.tokens),
          amount: Number(pending.data.amount),
          createdAt: pending.data.created_at,
        }
      : null,
  };
}
