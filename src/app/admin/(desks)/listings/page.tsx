import type { Metadata } from 'next';
import { requireRole } from '@/lib/adminAuth';
import {
  CAN_APPROVE,
  CAN_REJECT,
  getListingDetail,
  listListings,
  LISTING_STATUSES,
  SIGNED_URL_TTL_SECONDS,
  type ListingStatus,
} from '@/lib/adminListings';
import {
  Bi,
  DeskHead,
  DetailsToggle,
  Flash,
  LISTING_WORD,
  Pill,
  Segments,
  fmtDate,
  fmtMonth,
  varietyLabel,
} from '../deskUi';
import styles from '../desk.module.css';

/**
 * DESK 2 — Listings. Same shape as the KYC desk: one list, the decision on
 * the row, the status filter / open row / flash in the query string,
 * decisions as plain form posts to /admin/api/listings. No client JS.
 *
 * Approve puts a listing on the market ('active'); Reject takes it off
 * ('removed', internal reason required). listings.status has no
 * approved/rejected values — see src/lib/adminListings.ts.
 */

export const metadata: Metadata = {
  title: 'Listings — PaddyLink Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const FLASH: Record<string, { kind: 'ok' | 'err'; text: string }> = {
  approved: { kind: 'ok', text: 'Listing approved — status is now active (on the market).' },
  rejected: { kind: 'ok', text: 'Listing rejected — status is now removed. Reason recorded internally.' },
  need_reason: { kind: 'err', text: 'A rejection needs a reason. Nothing was changed.' },
  reason_too_long: { kind: 'err', text: 'Reason is too long (500 chars max). Nothing was changed.' },
  not_allowed: { kind: 'err', text: 'That action is not allowed from the listing’s current status.' },
  error: { kind: 'err', text: 'The decision failed to save — check the server log and retry.' },
};

const TONE: Record<ListingStatus, 'wait' | 'ok' | 'bad' | 'quiet'> = {
  draft: 'wait',
  flagged: 'bad',
  active: 'ok',
  sold: 'quiet',
  expired: 'quiet',
  removed: 'quiet',
};

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Admin-only: the listings desk carries approve/remove. The route-list
  // child (/admin/listings/routes) is separately open to staff.
  await requireRole(['admin']);

  const params = await searchParams;
  const rawStatus = typeof params.status === 'string' ? params.status : '';
  const status = (LISTING_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as ListingStatus)
    : undefined;
  const sel = typeof params.sel === 'string' ? params.sel : null;
  const flash = typeof params.flash === 'string' ? (FLASH[params.flash] ?? null) : null;

  const [listings, detail] = await Promise.all([
    listListings(status),
    sel ? getListingDetail(sel) : Promise.resolve(null),
  ]);

  const href = (opts: { status?: ListingStatus; sel?: string }) => {
    const q = new URLSearchParams();
    if (opts.status) q.set('status', opts.status);
    if (opts.sel) q.set('sel', opts.sel);
    const s = q.toString();
    return `/admin/listings${s ? `?${s}` : ''}${opts.sel ? `#row-${opts.sel}` : ''}`;
  };

  return (
    <>
      <DeskHead
        kn="ಪಟ್ಟಿಗಳು"
        en="Listings"
        sub={`${listings.length} listing${listings.length === 1 ? '' : 's'}${status ? ` · ${LISTING_WORD[status].en}` : ''}`}
      />

      <Segments
        label={{ kn: 'ಸ್ಥಿತಿ', en: 'Status' }}
        active={status ?? 'all'}
        items={[
          { key: 'all', kn: 'ಎಲ್ಲಾ', en: 'All', href: href({}) },
          ...LISTING_STATUSES.map((s) => ({ key: s, ...LISTING_WORD[s], href: href({ status: s }) })),
        ]}
      />

      <Flash flash={flash} />

      {listings.length === 0 ? (
        <p className={styles.empty}>
          No listings{status ? ` with status ${LISTING_WORD[status].en}` : ''}.
        </p>
      ) : (
        <ul className={styles.rows}>
          {listings.map((l) => {
            const open = l.id === sel;
            const canApprove = CAN_APPROVE.includes(l.status);
            const canReject = CAN_REJECT.includes(l.status);
            return (
              <li key={l.id} id={`row-${l.id}`} className={open ? styles.rowOpen : styles.row}>
                <div className={styles.rowMain}>
                  <h2 className={styles.rowTitle}>
                    {l.variety_kn && (
                      <span className={styles.rowTitleKn} lang="kn">
                        {l.variety_kn}
                      </span>
                    )}
                    {varietyLabel(l)} · {l.quantity_quintals} q
                  </h2>
                  <Pill word={LISTING_WORD[l.status]} tone={TONE[l.status]} />
                  <p className={styles.rowMeta}>
                    {l.farmer?.full_name ?? 'Unnamed farmer'}
                    {l.farmer?.village ? ` · ${l.farmer.village}` : ''}
                  </p>
                  <p className={styles.rowMetaMuted}>
                    {[l.taluk_en, l.district_en].filter(Boolean).join(', ') || 'No taluk'} ·
                    Harvest {fmtMonth(l.harvest_month)}
                  </p>
                  <p className={styles.rowMetaMuted}>
                    Posted {fmtDate(l.created_at)} ·{' '}
                    {l.quality_checked_at
                      ? `✓ checked, ${l.moisture_pct ?? '—'}% moisture`
                      : 'Not quality-checked'}
                  </p>
                </div>

                <div className={styles.rowActions}>
                  {canApprove && (
                    <form method="post" action="/admin/api/listings" className={styles.form}>
                      <input type="hidden" name="listing_id" value={l.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <button type="submit" className={styles.btnPrimary}>
                        <Bi kn="ಅನುಮೋದಿಸಿ" en="Approve — put on market" />
                      </button>
                    </form>
                  )}
                  {canReject && (
                    <form method="post" action="/admin/api/listings" className={styles.form}>
                      <input type="hidden" name="listing_id" value={l.id} />
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
                          placeholder="e.g. duplicate listing"
                        />
                      </label>
                      <button type="submit" className={styles.btnDanger}>
                        <Bi kn="ತಿರಸ್ಕರಿಸಿ" en="Reject — remove from market" />
                      </button>
                    </form>
                  )}
                  {!canApprove && !canReject && (
                    <p className={styles.actionNote}>Settled history — no action from this desk.</p>
                  )}
                  <DetailsToggle
                    open={open}
                    openHref={href({ status, sel: l.id })}
                    closeHref={href({ status })}
                  />
                </div>

                {open && (
                  <div className={styles.detail}>
                    {!detail ? (
                      <p className={styles.empty}>Listing not found.</p>
                    ) : (
                      <>
                        <dl className={styles.fields}>
                          <div>
                            <dt>Farmer</dt>
                            <dd>{detail.listing.farmer?.full_name ?? '—'}</dd>
                          </div>
                          <div>
                            <dt>Mobile</dt>
                            <dd className={styles.mono}>{detail.listing.farmer?.mobile ?? '—'}</dd>
                          </div>
                          <div>
                            <dt>Village</dt>
                            <dd>{detail.listing.farmer?.village ?? '—'}</dd>
                          </div>
                          <div>
                            <dt>Taluk / District</dt>
                            <dd>
                              {[detail.listing.taluk_en, detail.listing.district_en]
                                .filter(Boolean)
                                .join(', ') || '—'}
                            </dd>
                          </div>
                          <div>
                            <dt>Created by</dt>
                            <dd>{detail.listing.created_by}</dd>
                          </div>
                          <div>
                            <dt>Quality check</dt>
                            <dd>
                              {detail.listing.quality_checked_at
                                ? `${detail.listing.moisture_pct ?? '—'}% moisture · ${fmtDate(detail.listing.quality_checked_at)}${detail.listing.quality_checked_by ? ` · ${detail.listing.quality_checked_by}` : ''}`
                                : 'Not checked yet'}
                            </dd>
                          </div>
                          <div>
                            <dt>Expires</dt>
                            <dd>{fmtDate(detail.listing.expires_at)}</dd>
                          </div>
                          <div>
                            <dt>Posted</dt>
                            <dd>{fmtDate(detail.listing.created_at)}</dd>
                          </div>
                        </dl>

                        <h3 className={styles.subhead}>
                          <Bi kn="ಬೆಳೆ ಫೋಟೋ" en="Crop photo" />
                        </h3>
                        {detail.listing.photo_path ? (
                          detail.photo_url ? (
                            /* Server-signed link into the private listing-photos
                               bucket; dies after SIGNED_URL_TTL_SECONDS. */
                            <a
                              href={detail.photo_url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className={styles.docLink}
                            >
                              Open photo ({Math.round(SIGNED_URL_TTL_SECONDS / 60)}-min link)
                            </a>
                          ) : (
                            <span className={styles.docBroken}>
                              Signing failed for {detail.listing.photo_path}
                            </span>
                          )
                        ) : (
                          <p className={styles.empty}>No photo uploaded.</p>
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
