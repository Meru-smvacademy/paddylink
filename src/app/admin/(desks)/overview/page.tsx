import type { Metadata } from 'next';
import { requireRole } from '@/lib/adminAuth';
import { getOverview } from '@/lib/adminOverview';
import styles from './overview.module.css';

/**
 * DESK 4 — Overview. STRICTLY READ-ONLY oversight: live counts, recent
 * audit trail, and the money/unlock sections shown honestly (all empty
 * today). No action buttons, no forms, no write route anywhere on this
 * desk.
 */

export const metadata: Metadata = {
  title: 'Overview — PaddyLink Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const LISTING_LABEL: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  flagged: 'Flagged',
  sold: 'Sold',
  expired: 'Expired',
  removed: 'Removed',
};
const KYC_LABEL: Record<string, string> = {
  pending: 'Pending',
  under_review: 'Under review',
  approved: 'Verified',
  rejected: 'Rejected',
};

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** A compact one-line summary of an audit row's meta jsonb. */
function metaSummary(meta: unknown): string {
  if (!meta || typeof meta !== 'object') return '';
  const o = meta as Record<string, unknown>;
  const parts: string[] = [];
  if (o.reason) parts.push(`reason: ${String(o.reason)}`);
  if (o.from_status) parts.push(`from ${String(o.from_status)}`);
  if (o.moisture_pct != null) parts.push(`${Number(o.moisture_pct).toFixed(1)}%`);
  if (o.quality_checked_by) parts.push(`by ${String(o.quality_checked_by)}`);
  if (o.previous) parts.push('(edit)');
  return parts.join(' · ');
}

/** paise → ₹ string. */
function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function AdminOverviewPage() {
  // Admin-only oversight desk. Staff are bounced to their own landing.
  await requireRole(['admin']);
  const { counts, audit, wallets, ledger, unlocks, payments } = await getOverview();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Overview</h1>

      {/* ── Counts bar ─────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.countGrid}>
          <div className={styles.statBig}>
            <span className={styles.statNum}>{counts.farmers}</span>
            <span className={styles.statLabel}>Farmers</span>
          </div>
          <div className={styles.statBig}>
            <span className={styles.statNum}>{counts.listingsTotal}</span>
            <span className={styles.statLabel}>Listings</span>
          </div>
          <div className={styles.statBig}>
            <span className={styles.statNum}>{counts.buyersTotal}</span>
            <span className={styles.statLabel}>Buyers</span>
          </div>
          <div className={styles.statBig}>
            <span className={styles.statNum}>
              {counts.qualityChecked}
              <span className={styles.statOf}>/{counts.qualityChecked + counts.qualityPending}</span>
            </span>
            <span className={styles.statLabel}>Active checked</span>
          </div>
        </div>

        <div className={styles.breakdowns}>
          <div className={styles.breakdown}>
            <h2 className={styles.breakdownTitle}>Listings by status</h2>
            <ul className={styles.chips}>
              {Object.entries(counts.listingsByStatus).map(([s, n]) => (
                <li key={s} className={styles.chip}>
                  <span className={styles.chipLabel}>{LISTING_LABEL[s] ?? s}</span>
                  <span className={styles.chipNum}>{n}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.breakdown}>
            <h2 className={styles.breakdownTitle}>Buyers by KYC status</h2>
            <ul className={styles.chips}>
              {Object.entries(counts.buyersByKyc).map(([s, n]) => (
                <li key={s} className={styles.chip}>
                  <span className={styles.chipLabel}>{KYC_LABEL[s] ?? s}</span>
                  <span className={styles.chipNum}>{n}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.breakdown}>
            <h2 className={styles.breakdownTitle}>Quality (active listings)</h2>
            <ul className={styles.chips}>
              <li className={styles.chip}>
                <span className={styles.chipLabel}>Checked</span>
                <span className={styles.chipNum}>{counts.qualityChecked}</span>
              </li>
              <li className={styles.chip}>
                <span className={styles.chipLabel}>Pending</span>
                <span className={styles.chipNum}>{counts.qualityPending}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Recent activity ────────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Recent activity</h2>
        {audit.length === 0 ? (
          <p className={styles.empty}>No activity recorded yet.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id}>
                  <td className={styles.mono}>{fmtDateTime(a.created_at)}</td>
                  <td>{a.actor_role ?? '—'}</td>
                  <td>{a.action}</td>
                  <td>{a.entity}</td>
                  <td className={styles.detail}>{metaSummary(a.meta) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className={styles.note}>Latest {audit.length} of the audit trail, newest first.</p>
      </section>

      {/* ── Wallets & tokens ───────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Wallets &amp; tokens</h2>
        <div className={styles.twoCol}>
          <div>
            <h3 className={styles.subTitle}>Buyer wallets</h3>
            {wallets.length === 0 ? (
              <p className={styles.empty}>
                No wallets yet. Wallets open when buyers first purchase tokens.
              </p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Buyer</th>
                    <th>Balance</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {wallets.map((w) => (
                    <tr key={w.buyer_id}>
                      <td>{w.business_name ?? w.buyer_id.slice(0, 8)}</td>
                      <td className={styles.mono}>{w.balance}</td>
                      <td className={styles.mono}>{fmtDateTime(w.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div>
            <h3 className={styles.subTitle}>Recent token ledger</h3>
            {ledger.length === 0 ? (
              <p className={styles.empty}>
                No token movements yet. The ledger fills as tokens are purchased and spent.
              </p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Buyer</th>
                    <th>Delta</th>
                    <th>Reason</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((l) => (
                    <tr key={l.id}>
                      <td>{l.business_name ?? l.buyer_id.slice(0, 8)}</td>
                      <td className={styles.mono}>{l.delta > 0 ? `+${l.delta}` : l.delta}</td>
                      <td>{l.reason}</td>
                      <td className={styles.mono}>{fmtDateTime(l.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      {/* ── Unlocks ────────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Unlocks</h2>
        {unlocks.length === 0 ? (
          <p className={styles.empty}>No unlocks yet. Unlocks begin after OTP launch.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Buyer</th>
                <th>Listing</th>
                <th>Status</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {unlocks.map((u) => (
                <tr key={u.id}>
                  <td>{u.business_name ?? '—'}</td>
                  <td className={styles.mono}>{u.listing_id.slice(0, 8)}</td>
                  <td>{u.status}</td>
                  <td className={styles.mono}>{fmtDateTime(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Payments ───────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Payments</h2>
        {payments.length === 0 ? (
          <p className={styles.empty}>
            No payments yet. Payments appear here once Razorpay is activated.
          </p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Buyer</th>
                <th>Amount</th>
                <th>Tokens</th>
                <th>Status</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.business_name ?? '—'}</td>
                  <td className={styles.mono}>{rupees(p.amount)}</td>
                  <td className={styles.mono}>{p.tokens}</td>
                  <td>{p.status}</td>
                  <td className={styles.mono}>{fmtDateTime(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
