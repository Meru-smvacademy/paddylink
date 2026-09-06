import type { Metadata } from 'next';
import { requireRole } from '@/lib/adminAuth';
import { getStalePendingOrders } from '@/lib/adminOrders';
import { PENDING_STALE_MINUTES } from '@/lib/buyerWallet';
import styles from '../overview/overview.module.css';

/**
 * Pending token orders — STRICTLY READ-ONLY, and the only admin surface this
 * change adds.
 *
 * An order sits here when its row is still pending more than
 * PENDING_STALE_MINUTES after it was written, which means Razorpay never
 * confirmed it or the webhook never landed. That is the one failure mode where
 * a buyer can be out of pocket with nothing to show, so it gets a human.
 *
 * NO MANUAL CREDIT BUTTON, on purpose. Tokens have exactly one crediting path
 * — the webhook into process_razorpay_payment() — and a second one bolted to
 * this page is how the same payment gets credited twice. Reconciling a stuck
 * order is a Razorpay-dashboard job first.
 *
 * The stylesheet is the Overview desk's, unchanged: this is the same kind of
 * read-only table and gets the same treatment rather than a new one.
 */

export const metadata: Metadata = {
  title: 'Pending orders — PaddyLink Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function age(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `${h}h ${minutes % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export default async function PendingOrdersDesk() {
  await requireRole(['admin']);
  const orders = await getStalePendingOrders();

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Pending token orders</h2>

      {orders.length === 0 ? (
        <p className={styles.empty}>
          No orders stuck. An order appears here once it has been pending for more than{' '}
          {PENDING_STALE_MINUTES} minutes — that means Razorpay never confirmed it, or the
          webhook never landed.
        </p>
      ) : (
        <>
          <p className={styles.empty}>
            Pending for more than {PENDING_STALE_MINUTES} minutes. Read-only: check the payment
            in the Razorpay dashboard before doing anything. There is no credit button here,
            deliberately — the webhook is the only path that credits tokens.
          </p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Buyer</th>
                <th>Mobile</th>
                <th>Amount</th>
                <th>Tokens</th>
                <th>Razorpay order id</th>
                <th>Age</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.businessName ?? o.buyerName ?? '—'}</td>
                  <td>{o.buyerMobile ?? '—'}</td>
                  <td>{rupees(o.amount)}</td>
                  <td>{o.tokens}</td>
                  <td>{o.razorpayOrderId ?? '— (order never created)'}</td>
                  <td>{age(o.ageMinutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
