import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminPage } from '@/lib/adminAuth';
import {
  CAN_APPROVE,
  CAN_REJECT,
  getListingDetail,
  listListings,
  LISTING_STATUSES,
  SIGNED_URL_TTL_SECONDS,
  type ListingStatus,
} from '@/lib/adminListings';
import styles from '../buyers/buyers.module.css';
import own from './listings.module.css';

/**
 * DESK 2 — Listings. Same shape as the KYC desk: server-rendered master
 * table + detail panel, tabs/selection/flash in the query string, decisions
 * as plain form posts to /admin/api/listings. No client JS.
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

const STATUS_LABEL: Record<ListingStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  flagged: 'Flagged',
  sold: 'Sold',
  expired: 'Expired',
  removed: 'Removed',
};

const FLASH: Record<string, { kind: 'ok' | 'err'; text: string }> = {
  approved: { kind: 'ok', text: 'Listing approved — status is now active (on the market).' },
  rejected: { kind: 'ok', text: 'Listing rejected — status is now removed. Reason recorded internally.' },
  need_reason: { kind: 'err', text: 'A rejection needs a reason. Nothing was changed.' },
  reason_too_long: { kind: 'err', text: 'Reason is too long (500 chars max). Nothing was changed.' },
  not_allowed: { kind: 'err', text: 'That action is not allowed from the listing’s current status.' },
  error: { kind: 'err', text: 'The decision failed to save — check the server log and retry.' },
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function varietyLabel(l: { variety_en: string | null; variety_other: string | null }): string {
  const base = l.variety_en ?? '—';
  return l.variety_other ? `${base}: ${l.variety_other}` : base;
}

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdminPage();

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

  const tabHref = (s?: ListingStatus) =>
    `/admin/listings${s ? `?status=${s}` : ''}${sel ? `${s ? '&' : '?'}sel=${sel}` : ''}`;
  const rowHref = (id: string) =>
    `/admin/listings?${status ? `status=${status}&` : ''}sel=${id}`;

  return (
    <div className={styles.desk}>
      <div className={styles.listPane}>
        <div className={styles.headRow}>
          <h1 className={styles.title}>Listings</h1>
          <nav className={styles.tabs} aria-label="Filter by status">
            <Link href={tabHref()} className={!status ? styles.tabActive : styles.tab}>
              All
            </Link>
            {LISTING_STATUSES.map((s) => (
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
              <th>Variety</th>
              <th>Qty (q)</th>
              <th>Harvest</th>
              <th>Farmer</th>
              <th>Village</th>
              <th>Taluk / District</th>
              <th>Checked</th>
              <th>Status</th>
              <th>Posted</th>
            </tr>
          </thead>
          <tbody>
            {listings.length === 0 && (
              <tr>
                <td colSpan={9} className={styles.empty}>
                  No listings{status ? ` with status ${STATUS_LABEL[status]}` : ''}.
                </td>
              </tr>
            )}
            {listings.map((l) => (
              <tr key={l.id} className={l.id === sel ? styles.rowSel : undefined}>
                <td>
                  <Link href={rowHref(l.id)} className={styles.rowLink}>
                    {varietyLabel(l)}
                  </Link>
                </td>
                <td className={styles.mono}>{l.quantity_quintals}</td>
                <td>{fmtMonth(l.harvest_month)}</td>
                <td>{l.farmer?.full_name ?? '—'}</td>
                <td>{l.farmer?.village ?? '—'}</td>
                <td>
                  {l.taluk_en ?? '—'}
                  {l.district_en ? ` / ${l.district_en}` : ''}
                </td>
                <td>{l.quality_checked_at ? `✓ ${l.moisture_pct ?? '—'}%` : '—'}</td>
                <td>
                  <span className={own[`ls_${l.status}`]}>{STATUS_LABEL[l.status]}</span>
                </td>
                <td>{fmtDate(l.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sel && (
        <aside className={styles.panel} aria-label="Listing detail">
          {!detail ? (
            <p className={styles.empty}>Listing not found.</p>
          ) : (
            <>
              <div className={styles.panelHead}>
                <h2 className={styles.panelTitle}>{varietyLabel(detail.listing)}</h2>
                <Link
                  href={`/admin/listings${status ? `?status=${status}` : ''}`}
                  className={styles.panelClose}
                  aria-label="Close panel"
                >
                  ✕
                </Link>
              </div>
              <span className={own[`ls_${detail.listing.status}`]}>
                {STATUS_LABEL[detail.listing.status]}
              </span>

              <dl className={styles.fields}>
                <dt>Quantity</dt>
                <dd>{detail.listing.quantity_quintals} quintals</dd>
                <dt>Harvest month</dt>
                <dd>{fmtMonth(detail.listing.harvest_month)}</dd>
                <dt>Farmer</dt>
                <dd>{detail.listing.farmer?.full_name ?? '—'}</dd>
                <dt>Mobile</dt>
                <dd className={styles.mono}>{detail.listing.farmer?.mobile ?? '—'}</dd>
                <dt>Village</dt>
                <dd>{detail.listing.farmer?.village ?? '—'}</dd>
                <dt>Taluk</dt>
                <dd>{detail.listing.taluk_en ?? '—'}</dd>
                <dt>District</dt>
                <dd>{detail.listing.district_en ?? '—'}</dd>
                <dt>Created by</dt>
                <dd>{detail.listing.created_by}</dd>
                <dt>Quality check</dt>
                <dd>
                  {detail.listing.quality_checked_at
                    ? `${detail.listing.moisture_pct ?? '—'}% moisture · ${fmtDate(detail.listing.quality_checked_at)}${detail.listing.quality_checked_by ? ` · ${detail.listing.quality_checked_by}` : ''}`
                    : 'Not checked yet'}
                </dd>
                <dt>Expires</dt>
                <dd>{fmtDate(detail.listing.expires_at)}</dd>
                <dt>Posted</dt>
                <dd>{fmtDate(detail.listing.created_at)}</dd>
              </dl>

              <h3 className={styles.docsTitle}>Crop photo</h3>
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

              {(CAN_APPROVE.includes(detail.listing.status) ||
                CAN_REJECT.includes(detail.listing.status)) && (
                <div className={styles.actions}>
                  {CAN_APPROVE.includes(detail.listing.status) && (
                    <form method="post" action="/admin/api/listings" className={styles.approveForm}>
                      <input type="hidden" name="listing_id" value={detail.listing.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <button type="submit" className={styles.approveBtn}>
                        Approve — put on market
                      </button>
                      {/* MSG91 pending: no farmer/buyer notification is sent. */}
                      <span className={styles.noNotify}>No SMS is sent yet (MSG91 pending).</span>
                    </form>
                  )}
                  {CAN_REJECT.includes(detail.listing.status) && (
                    <form method="post" action="/admin/api/listings" className={styles.rejectForm}>
                      <input type="hidden" name="listing_id" value={detail.listing.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <label htmlFor="listing-reject-reason" className={styles.rejectLabel}>
                        Internal reason (required to reject)
                      </label>
                      <textarea
                        id="listing-reject-reason"
                        name="reason"
                        rows={3}
                        maxLength={500}
                        required
                        className={styles.reasonBox}
                        placeholder="e.g. duplicate of an earlier listing from the same farmer"
                      />
                      <button type="submit" className={styles.rejectBtn}>
                        Reject — remove from market
                      </button>
                    </form>
                  )}
                </div>
              )}
            </>
          )}
        </aside>
      )}
    </div>
  );
}
