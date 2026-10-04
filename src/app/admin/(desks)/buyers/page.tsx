import type { Metadata } from 'next';
import { requireRole } from '@/lib/adminAuth';
import {
  getBuyerDetail,
  listBuyers,
  KYC_STATUSES,
  SIGNED_URL_TTL_SECONDS,
  type KycStatus,
} from '@/lib/adminKyc';
import {
  Bi,
  DeskHead,
  DetailsToggle,
  Flash,
  KYC_WORD,
  Pill,
  Segments,
  fmtDate,
} from '../deskUi';
import styles from '../desk.module.css';

/**
 * DESK 1 — Buyer KYC verification. One list, one large row per buyer, the
 * decision buttons on the row itself. Fully server-rendered: the status
 * filter, the open row and flash messages all travel in the query string,
 * decisions are plain form posts to /admin/api/kyc. No client JS.
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

const FLASH: Record<string, { kind: 'ok' | 'err'; text: string }> = {
  approved: { kind: 'ok', text: 'Buyer approved — kyc_status is now approved (Verified).' },
  rejected: { kind: 'ok', text: 'Buyer rejected. The reason is recorded internally.' },
  need_reason: { kind: 'err', text: 'A rejection needs a reason. Nothing was changed.' },
  reason_too_long: { kind: 'err', text: 'Reason is too long (500 chars max). Nothing was changed.' },
  error: { kind: 'err', text: 'The decision failed to save — check the server log and retry.' },
};

const TONE: Record<KycStatus, 'wait' | 'ok' | 'bad' | 'quiet'> = {
  pending: 'wait',
  under_review: 'wait',
  approved: 'ok',
  rejected: 'bad',
};

const DECIDABLE: readonly KycStatus[] = ['pending', 'under_review'];

export default async function AdminBuyersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Admin-only, re-checked behind the proxy gate — never rely on the matcher
  // alone. Staff are bounced to their own desk.
  await requireRole(['admin']);

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

  const href = (opts: { status?: KycStatus; sel?: string }) => {
    const q = new URLSearchParams();
    if (opts.status) q.set('status', opts.status);
    if (opts.sel) q.set('sel', opts.sel);
    const s = q.toString();
    return `/admin/buyers${s ? `?${s}` : ''}${opts.sel ? `#row-${opts.sel}` : ''}`;
  };

  return (
    <>
      <DeskHead
        kn="ಖರೀದಿದಾರರ ಕೆವೈಸಿ"
        en="Buyer KYC"
        sub={`${buyers.length} buyer${buyers.length === 1 ? '' : 's'}${status ? ` · ${KYC_WORD[status].en}` : ''}`}
      />

      <Segments
        label={{ kn: 'ಸ್ಥಿತಿ', en: 'Status' }}
        active={status ?? 'all'}
        items={[
          { key: 'all', kn: 'ಎಲ್ಲಾ', en: 'All', href: href({}) },
          ...KYC_STATUSES.map((s) => ({ key: s, ...KYC_WORD[s], href: href({ status: s }) })),
        ]}
      />

      <Flash flash={flash} />

      {/* NOTE: approval sends NO SMS/email yet — buyer notification waits for
          MSG91. Flagged, not faked. */}
      <p className={styles.note}>Approving a buyer sends no SMS yet (MSG91 pending).</p>

      {buyers.length === 0 ? (
        <p className={styles.empty}>
          No buyers{status ? ` with status ${KYC_WORD[status].en}` : ''}.
        </p>
      ) : (
        <ul className={styles.rows}>
          {buyers.map((b) => {
            const open = b.id === sel;
            return (
              <li key={b.id} id={`row-${b.id}`} className={open ? styles.rowOpen : styles.row}>
                <div className={styles.rowMain}>
                  <h2 className={styles.rowTitle}>{b.business_name ?? b.name}</h2>
                  <Pill word={KYC_WORD[b.kyc_status]} tone={TONE[b.kyc_status]} />
                  <p className={styles.rowMeta}>
                    {b.name} · <span className={styles.mono}>{b.mobile}</span>
                  </p>
                  <p className={styles.rowMetaMuted}>
                    {b.district_en ?? 'No district'} · Registered {fmtDate(b.created_at)}
                  </p>
                </div>

                <div className={styles.rowActions}>
                  {DECIDABLE.includes(b.kyc_status) ? (
                    <>
                      <form method="post" action="/admin/api/kyc" className={styles.form}>
                        <input type="hidden" name="buyer_id" value={b.id} />
                        <input type="hidden" name="decision" value="approve" />
                        <button type="submit" className={styles.btnPrimary}>
                          <Bi kn="ಅನುಮೋದಿಸಿ" en="Approve — mark Verified" />
                        </button>
                      </form>
                      <form method="post" action="/admin/api/kyc" className={styles.form}>
                        <input type="hidden" name="buyer_id" value={b.id} />
                        <input type="hidden" name="decision" value="reject" />
                        <label className={styles.field}>
                          <span className={styles.fieldLabel}>
                            <span lang="kn">ಕಾರಣ</span> · Reason (required to reject)
                          </span>
                          <input
                            name="reason"
                            type="text"
                            maxLength={500}
                            required
                            className={styles.input}
                            placeholder="e.g. GST name does not match"
                          />
                        </label>
                        <button type="submit" className={styles.btnDanger}>
                          <Bi kn="ತಿರಸ್ಕರಿಸಿ" en="Reject" />
                        </button>
                      </form>
                    </>
                  ) : (
                    <p className={styles.actionNote}>Decided — no action needed.</p>
                  )}
                  <DetailsToggle
                    open={open}
                    openHref={href({ status, sel: b.id })}
                    closeHref={href({ status })}
                  />
                </div>

                {open && (
                  <div className={styles.detail}>
                    {!detail ? (
                      <p className={styles.empty}>Buyer not found.</p>
                    ) : (
                      <>
                        <dl className={styles.fields}>
                          <div>
                            <dt>Contact person</dt>
                            <dd>{detail.buyer.name}</dd>
                          </div>
                          <div>
                            <dt>Mobile</dt>
                            <dd className={styles.mono}>{detail.buyer.mobile}</dd>
                          </div>
                          <div>
                            <dt>Email</dt>
                            <dd>{detail.buyer.email ?? '—'}</dd>
                          </div>
                          <div>
                            <dt>Business type</dt>
                            <dd>{detail.buyer.business_type ?? '—'}</dd>
                          </div>
                          <div>
                            <dt>GSTIN</dt>
                            <dd className={styles.mono}>{detail.buyer.gstin ?? '—'}</dd>
                          </div>
                          <div>
                            <dt>PAN</dt>
                            <dd className={styles.mono}>{detail.buyer.pan ?? '—'}</dd>
                          </div>
                          <div>
                            <dt>APMC licence</dt>
                            <dd className={styles.mono}>{detail.buyer.apmc_license_no ?? '—'}</dd>
                          </div>
                          <div>
                            <dt>District</dt>
                            <dd>{detail.buyer.district_en ?? '—'}</dd>
                          </div>
                          <div>
                            <dt>Address</dt>
                            <dd>{detail.buyer.business_address ?? '—'}</dd>
                          </div>
                          <div>
                            <dt>Registered</dt>
                            <dd>{fmtDate(detail.buyer.created_at)}</dd>
                          </div>
                        </dl>

                        <h3 className={styles.subhead}>
                          <Bi kn="ದಾಖಲೆಗಳು" en="Documents" />
                        </h3>
                        {detail.documents.length === 0 ? (
                          <p className={styles.empty}>No documents uploaded.</p>
                        ) : (
                          <ul className={styles.docs}>
                            {detail.documents.map((doc) => (
                              <li key={doc.id} className={styles.doc}>
                                <strong>{doc.doc_type.toUpperCase()}</strong>
                                {doc.signed_url ? (
                                  /* Server-signed link into the private kyc-docs
                                     bucket; dies after SIGNED_URL_TTL_SECONDS.
                                     Never a public URL. */
                                  <a
                                    href={doc.signed_url}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className={styles.docLink}
                                  >
                                    Open certificate ({Math.round(SIGNED_URL_TTL_SECONDS / 60)}-min
                                    link)
                                  </a>
                                ) : (
                                  <span className={styles.docBroken}>
                                    Signing failed for {doc.storage_path}
                                  </span>
                                )}
                                <span className={styles.rowMetaMuted}>
                                  {doc.status}
                                  {doc.reviewed_at ? ` · reviewed ${fmtDate(doc.reviewed_at)}` : ''}
                                  {doc.reject_reason ? ` · reason: ${doc.reject_reason}` : ''}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
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
