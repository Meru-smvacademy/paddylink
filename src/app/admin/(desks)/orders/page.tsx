import type { Metadata } from 'next';
import { requireRole } from '@/lib/adminAuth';
import { getStalePendingOrders } from '@/lib/adminOrders';
import { PENDING_STALE_MINUTES } from '@/lib/buyerWallet';
import { DeskHead, DetailsToggle, age, rupees } from '../deskUi';
import styles from '../desk.module.css';

/**
 * Pending token orders — STRICTLY READ-ONLY.
 *
 * An order sits here when its row is still pending more than
 * PENDING_STALE_MINUTES after it was written, which means Razorpay never
 * confirmed it or the webhook never landed. That is the one failure mode where
 * a buyer can be out of pocket with nothing to show, so it gets a human.
 *
 * NO MANUAL CREDIT BUTTON, on purpose — so unlike the other desks a row here
 * carries no action. Tokens have exactly one crediting path — the webhook
 * into process_razorpay_payment() — and a second one bolted to this page is
 * how the same payment gets credited twice. Reconciling a stuck order is a
 * Razorpay-dashboard job first.
 *
 * Every row is pending, so there is no status filter to offer.
 */

export const metadata: Metadata = {
  title: 'Pending orders — PaddyLink Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function PendingOrdersDesk({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireRole(['admin']);
  const params = await searchParams;
  const sel = typeof params.sel === 'string' ? params.sel : null;
  const orders = await getStalePendingOrders();

  const href = (id?: string) => (id ? `/admin/orders?sel=${id}#row-${id}` : '/admin/orders');

  return (
    <>
      <DeskHead
        kn="ಬಾಕಿ ಪಾವತಿಗಳು"
        en="Pending token orders"
        sub={`${orders.length} stuck · pending more than ${PENDING_STALE_MINUTES} minutes`}
      />

      <p className={styles.note}>
        Read-only. Check each payment in the Razorpay dashboard before doing anything. There is no
        credit button here, deliberately — the webhook is the only path that credits tokens.
      </p>

      {orders.length === 0 ? (
        <p className={styles.empty}>
          No orders stuck. An order appears here once it has been pending for more than{' '}
          {PENDING_STALE_MINUTES} minutes — that means Razorpay never confirmed it, or the webhook
          never landed.
        </p>
      ) : (
        <ul className={styles.rows}>
          {orders.map((o) => {
            const open = o.id === sel;
            return (
              <li key={o.id} id={`row-${o.id}`} className={open ? styles.rowOpen : styles.row}>
                <div className={styles.rowMain}>
                  <h2 className={styles.rowTitle}>{o.businessName ?? o.buyerName ?? '—'}</h2>
                  <p className={styles.rowMeta}>
                    {rupees(o.amount)} · {o.tokens} tokens
                  </p>
                  <p className={styles.rowMetaMuted}>Pending {age(o.ageMinutes)}</p>
                </div>

                <div className={styles.rowActions}>
                  <p className={styles.actionNote}>
                    No action here — reconcile in the Razorpay dashboard.
                  </p>
                  <DetailsToggle open={open} openHref={href(o.id)} closeHref={href()} />
                </div>

                {open && (
                  <div className={styles.detail}>
                    <dl className={styles.fields}>
                      <div>
                        <dt>Buyer</dt>
                        <dd>{o.buyerName ?? '—'}</dd>
                      </div>
                      <div>
                        <dt>Mobile</dt>
                        <dd className={styles.mono}>{o.buyerMobile ?? '—'}</dd>
                      </div>
                      <div>
                        <dt>Razorpay order id</dt>
                        <dd className={styles.mono}>
                          {o.razorpayOrderId ?? '— (order never created)'}
                        </dd>
                      </div>
                      <div>
                        <dt>Created</dt>
                        <dd>{new Date(o.createdAt).toLocaleString('en-IN')}</dd>
                      </div>
                    </dl>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
