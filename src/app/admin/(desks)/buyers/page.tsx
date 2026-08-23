import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminPage } from '@/lib/adminAuth';
import {
  getBuyerDetail,
  listBuyers,
  KYC_STATUSES,
  SIGNED_URL_TTL_SECONDS,
  type KycStatus,
} from '@/lib/adminKyc';
import styles from './buyers.module.css';

/**
 * DESK 1 — Buyer KYC verification. Master table + detail panel, fully
 * server-rendered; tabs, selection and flash messages all travel in the
 * query string, decisions are plain form posts to /admin/api/kyc. No client
 * JS at all: dense and fast.
 *
 * The schema's approved state is 'approved'; the desk labels it "Verified"
 * (the product word). See src/lib/adminKyc.ts.
 */

export const metadata: Metadata = {
  title: 'Buyer KYC — PaddyLink Admin',
  robots: { index: false, follow: false },
};

/* A review queue is live data — never cache it. */
export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<KycStatus, string> = {
  pending: 'Pending',
  under_review: 'Under review',
  approved: 'Verified',
  rejected: 'Rejected',
};

const FLASH: Record<string, { kind: 'ok' | 'err'; text: string }> = {
  approved: { kind: 'ok', text: 'Buyer approved — kyc_status is now approved (Verified).' },
  rejected: { kind: 'ok', text: 'Buyer rejected. The reason is recorded internally.' },
  need_reason: { kind: 'err', text: 'A rejection needs a reason. Nothing was changed.' },
  reason_too_long: { kind: 'err', text: 'Reason is too long (500 chars max). Nothing was changed.' },
  error: { kind: 'err', text: 'The decision failed to save — check the server log and retry.' },
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default async function AdminBuyersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Second lock behind the proxy gate — never rely on the matcher alone.
  await requireAdminPage();

  const params = await searchParams;
  const rawStatus = typeof params.status === 'string' ? params.status : '';
  const status = (KYC_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as KycStatus)
    : undefined;
  const sel = typeof params.sel === 'string' ? params.sel : null;
  const flash = typeof params.flash === 'string' ? (FLASH[params.flash] ?? null) : null;

  const [buyers, detail] = await Promise.all([
    listBuyers(status),
    sel ? getBuyerDetail(sel) : Promise.resolve(null),
  ]);

  const tabHref = (s?: KycStatus) =>
    `/admin/buyers${s ? `?status=${s}` : ''}${sel ? `${s ? '&' : '?'}sel=${sel}` : ''}`;
  const rowHref = (id: string) =>
    `/admin/buyers?${status ? `status=${status}&` : ''}sel=${id}`;

  return (
    <div className={styles.desk}>
      <div className={styles.listPane}>
        <div className={styles.headRow}>
          <h1 className={styles.title}>Buyer KYC</h1>
          <nav className={styles.tabs} aria-label="Filter by status">
            <Link href={tabHref()} className={!status ? styles.tabActive : styles.tab}>
              All
            </Link>
            {KYC_STATUSES.map((s) => (
              <Link
                key={s}
                href={tabHref(s)}
                className={status === s ? styles.tabActive : styles.tab}
              >
                {STATUS_LABEL[s]}
              </Link>
            ))}
          </nav>
        </div>

        {flash && (
          <p className={flash.kind === 'ok' ? styles.flashOk : styles.flashErr} role="status">
            {flash.text}
          </p>
        )}

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Business</th>
              <th>Contact</th>
              <th>Mobile</th>
              <th>GST</th>
              <th>PAN</th>
              <th>District</th>
              <th>Status</th>
              <th>Registered</th>
            </tr>
          </thead>
          <tbody>
            {buyers.length === 0 && (
              <tr>
                <td colSpan={8} className={styles.empty}>
                  No buyers{status ? ` with status ${STATUS_LABEL[status]}` : ''}.
                </td>
              </tr>
            )}
            {buyers.map((b) => (
              <tr key={b.id} className={b.id === sel ? styles.rowSel : undefined}>
                <td>
                  <Link href={rowHref(b.id)} className={styles.rowLink}>
                    {b.business_name ?? '—'}
                  </Link>
                </td>
                <td>{b.name}</td>
                <td className={styles.mono}>{b.mobile}</td>
                <td className={styles.mono}>{b.gstin ?? '—'}</td>
                <td className={styles.mono}>{b.pan ?? '—'}</td>
                <td>{b.district_en ?? '—'}</td>
                <td>
                  <span className={styles[`st_${b.kyc_status}`]}>
                    {STATUS_LABEL[b.kyc_status]}
                  </span>
                </td>
                <td>{fmtDate(b.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sel && (
        <aside className={styles.panel} aria-label="Buyer detail">
          {!detail ? (
            <p className={styles.empty}>Buyer not found.</p>
          ) : (
            <>
              <div className={styles.panelHead}>
                <h2 className={styles.panelTitle}>{detail.buyer.business_name ?? detail.buyer.name}</h2>
                <Link
                  href={`/admin/buyers${status ? `?status=${status}` : ''}`}
                  className={styles.panelClose}
                  aria-label="Close panel"
                >
                  ✕
                </Link>
              </div>
              <span className={styles[`st_${detail.buyer.kyc_status}`]}>
                {STATUS_LABEL[detail.buyer.kyc_status]}
              </span>

              <dl className={styles.fields}>
                <dt>Contact person</dt>
                <dd>{detail.buyer.name}</dd>
                <dt>Mobile</dt>
                <dd className={styles.mono}>{detail.buyer.mobile}</dd>
                <dt>Email</dt>
                <dd>{detail.buyer.email ?? '—'}</dd>
                <dt>Business type</dt>
                <dd>{detail.buyer.business_type ?? '—'}</dd>
                <dt>GSTIN</dt>
                <dd className={styles.mono}>{detail.buyer.gstin ?? '—'}</dd>
                <dt>PAN</dt>
                <dd className={styles.mono}>{detail.buyer.pan ?? '—'}</dd>
                <dt>APMC licence</dt>
                <dd className={styles.mono}>{detail.buyer.apmc_license_no ?? '—'}</dd>
                <dt>District</dt>
                <dd>{detail.buyer.district_en ?? '—'}</dd>
                <dt>Address</dt>
                <dd>{detail.buyer.business_address ?? '—'}</dd>
                <dt>Registered</dt>
                <dd>{fmtDate(detail.buyer.created_at)}</dd>
              </dl>

              <h3 className={styles.docsTitle}>Documents</h3>
              {detail.documents.length === 0 && (
                <p className={styles.empty}>No documents uploaded.</p>
              )}
              <ul className={styles.docs}>
                {detail.documents.map((doc) => (
                  <li key={doc.id} className={styles.doc}>
                    <span className={styles.docType}>{doc.doc_type.toUpperCase()}</span>
                    {doc.signed_url ? (
                      /* Server-signed link into the private kyc-docs bucket;
                         dies after SIGNED_URL_TTL_SECONDS. Never a public URL. */
                      <a
                        href={doc.signed_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className={styles.docLink}
                      >
                        Open certificate ({Math.round(SIGNED_URL_TTL_SECONDS / 60)}-min link)
                      </a>
                    ) : (
                      <span className={styles.docBroken}>
                        Signing failed for {doc.storage_path}
                      </span>
                    )}
                    <span className={styles.docMeta}>
                      {doc.status}
                      {doc.reviewed_at ? ` · reviewed ${fmtDate(doc.reviewed_at)}` : ''}
                      {doc.reject_reason ? ` · reason: ${doc.reject_reason}` : ''}
                    </span>
                  </li>
                ))}
              </ul>

              {(detail.buyer.kyc_status === 'pending' ||
                detail.buyer.kyc_status === 'under_review') && (
                <div className={styles.actions}>
                  {/* NOTE: approval sends NO SMS/email yet — buyer notification
                      waits for MSG91. Flagged, not faked. */}
                  <form method="post" action="/admin/api/kyc" className={styles.approveForm}>
                    <input type="hidden" name="buyer_id" value={detail.buyer.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <button type="submit" className={styles.approveBtn}>
                      Approve — mark Verified
                    </button>
                    <span className={styles.noNotify}>No SMS is sent yet (MSG91 pending).</span>
                  </form>

                  <form method="post" action="/admin/api/kyc" className={styles.rejectForm}>
                    <input type="hidden" name="buyer_id" value={detail.buyer.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <label htmlFor="reject-reason" className={styles.rejectLabel}>
                      Internal reason (required to reject)
                    </label>
                    <textarea
                      id="reject-reason"
                      name="reason"
                      rows={3}
                      maxLength={500}
                      required
                      className={styles.reasonBox}
                      placeholder="e.g. GST certificate name does not match business name"
                    />
                    <button type="submit" className={styles.rejectBtn}>
                      Reject
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </aside>
      )}
    </div>
  );
}
