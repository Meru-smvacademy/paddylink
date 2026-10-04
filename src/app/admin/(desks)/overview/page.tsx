import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/adminAuth';
import { getOverview } from '@/lib/adminOverview';
import { getStalePendingOrders } from '@/lib/adminOrders';
import { listBuyers } from '@/lib/adminKyc';
import { getQualityQueue } from '@/lib/adminQuality';
import { PENDING_STALE_MINUTES } from '@/lib/buyerWallet';
import { Bi, DeskHead, age, fmtDate, rupees, varietyLabel } from '../deskUi';
import styles from '../desk.module.css';

/**
 * DESK 4 — Overview. STRICTLY READ-ONLY: four live counts, each one the way
 * into its desk, and one list of what needs a human. No action buttons, no
 * forms, no write route anywhere on this desk.
 *
 * Every number is read through the existing desk loaders on each request —
 * nothing here is cached or pre-aggregated.
 */

export const metadata: Metadata = {
  title: 'Overview — PaddyLink Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/** KYC still waiting on a decision — the states the buyers desk can act on. */
const AWAITING_KYC = new Set(['pending', 'under_review']);

export default async function AdminOverviewPage() {
  // Admin-only oversight desk. Staff are bounced to their own landing.
  await requireRole(['admin']);
  const [{ counts }, staleOrders, buyers, quality] = await Promise.all([
    getOverview(),
    getStalePendingOrders(),
    listBuyers(),
    getQualityQueue({ state: 'pending' }),
  ]);

  const kycWaiting = buyers.filter((b) => AWAITING_KYC.has(b.kyc_status));
  const nothingToDo =
    kycWaiting.length === 0 && staleOrders.length === 0 && quality.rows.length === 0;

  return (
    <>
      <DeskHead kn="ಅವಲೋಕನ" en="Overview" />

      <div className={styles.tiles}>
        {/* There is no farmer desk; a farmer is reached through their
            listings, so the tile opens the listings desk. */}
        <Link href="/admin/listings" className={styles.tile}>
          <span className={styles.tileLabel}>
            <Bi kn="ರೈತರು" en="Farmers" />
          </span>
          <span className={styles.tileNum}>{counts.farmers}</span>
          <span className={styles.tileSub}>Total registered</span>
        </Link>

        <Link href="/admin/listings?status=active" className={styles.tile}>
          <span className={styles.tileLabel}>
            <Bi kn="ಪಟ್ಟಿಗಳು" en="Listings" />
          </span>
          <span className={styles.tileNum}>{counts.listingsByStatus.active ?? 0}</span>
          <span className={styles.tileSub}>
            Active · {counts.listingsByStatus.sold ?? 0} sold · {counts.listingsTotal} in all
          </span>
        </Link>

        <Link href="/admin/buyers" className={styles.tile}>
          <span className={styles.tileLabel}>
            <Bi kn="ಖರೀದಿದಾರರು" en="Buyers" />
          </span>
          <span className={styles.tileNum}>{counts.buyersTotal}</span>
          <span className={styles.tileSub}>{kycWaiting.length} KYC pending</span>
        </Link>

        <Link href="/admin/orders" className={styles.tile}>
          <span className={styles.tileLabel}>
            <Bi kn="ಪಾವತಿಗಳು" en="Payments" />
          </span>
          <span className={styles.tileNum}>{staleOrders.length}</span>
          <span className={styles.tileSub}>
            Pending orders · older than {PENDING_STALE_MINUTES} min
          </span>
        </Link>
      </div>

      <section aria-labelledby="needs-action">
        <h2 id="needs-action" className={styles.sectionTitle}>
          <Bi kn="ಕ್ರಮ ಬೇಕು" en="Needs action" />
        </h2>

        {nothingToDo ? (
          <p className={styles.empty}>
            Nothing needs action. No KYC is waiting, no order is stuck, and every active listing
            is quality-checked.
          </p>
        ) : (
          <ul className={styles.rows}>
            {kycWaiting.map((b) => (
              <li key={`b-${b.id}`}>
                <Link href={`/admin/buyers?sel=${b.id}#row-${b.id}`} className={styles.actionRow}>
                  <span className={styles.actionText}>
                    <span className={styles.actionKind}>
                      <span lang="kn">ಕೆವೈಸಿ ಪರಿಶೀಲನೆ</span> · KYC to review
                    </span>
                    <span className={styles.actionWhat}>{b.business_name ?? b.name}</span>
                    <span className={styles.actionKind}>Registered {fmtDate(b.created_at)}</span>
                  </span>
                  <span className={styles.chev} aria-hidden="true">
                    ›
                  </span>
                </Link>
              </li>
            ))}
            {staleOrders.map((o) => (
              <li key={`o-${o.id}`}>
                <Link href={`/admin/orders?sel=${o.id}#row-${o.id}`} className={styles.actionRow}>
                  <span className={styles.actionText}>
                    <span className={styles.actionKind}>
                      <span lang="kn">ಪಾವತಿ ಬಾಕಿ</span> · Order stuck
                    </span>
                    <span className={styles.actionWhat}>
                      {o.businessName ?? o.buyerName ?? '—'} · {rupees(o.amount)}
                    </span>
                    <span className={styles.actionKind}>Pending {age(o.ageMinutes)}</span>
                  </span>
                  <span className={styles.chev} aria-hidden="true">
                    ›
                  </span>
                </Link>
              </li>
            ))}
            {quality.rows.map((l) => (
              <li key={`q-${l.id}`}>
                <Link href={`/admin/quality?sel=${l.id}#row-${l.id}`} className={styles.actionRow}>
                  <span className={styles.actionText}>
                    <span className={styles.actionKind}>
                      <span lang="kn">ಗುಣಮಟ್ಟ ಪರಿಶೀಲನೆ</span> · Quality check due
                    </span>
                    <span className={styles.actionWhat}>
                      {varietyLabel(l)} · {l.quantity_quintals} q
                    </span>
                    <span className={styles.actionKind}>
                      {[l.farmer?.village, l.district_en].filter(Boolean).join(', ') || '—'}
                    </span>
                  </span>
                  <span className={styles.chev} aria-hidden="true">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
