import type { Metadata } from 'next';
import { requireAdminPage } from '@/lib/adminAuth';
import type { AdminListingRow } from '@/lib/adminListings';
import { getQualityQueue, SANE_MIN, SANE_MAX, type QualityFilters } from '@/lib/adminQuality';
import type { AdminRole } from '@/lib/adminSession';
import {
  Bi,
  DeskHead,
  DetailsToggle,
  Flash,
  Pill,
  Segments,
  fmtDate,
  fmtMonth,
  fmtMonthKey,
  varietyLabel,
} from '../deskUi';
import styles from '../desk.module.css';

/**
 * DESK 3 — Quality. The field team's moisture readings enter here: the only
 * write path for moisture_pct / quality_checked_at / quality_checked_by
 * (migration 007). Active listings only; pending checks are the work queue
 * on top, the done pile sits below. Zero client JS: filters are links, the
 * open row is ?sel=, checks are form posts to /admin/api/quality.
 *
 * A pending row carries its record form on the row. A checked row shows the
 * reading; correcting it is a secondary action inside Details. Checks can be
 * edited (overwrite; audit keeps the previous values), never deleted here —
 * CEO ruling in the Desk 3 gate.
 */

export const metadata: Metadata = {
  title: 'Quality — PaddyLink Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const FLASH: Record<string, { kind: 'ok' | 'err'; text: string }> = {
  recorded: { kind: 'ok', text: 'Check recorded. The listing now reads quality-checked everywhere.' },
  updated: { kind: 'ok', text: 'Check updated — the previous values are kept in the audit trail.' },
  confirm_range: {
    kind: 'err',
    text: `That moisture is outside the sane range (${SANE_MIN.toFixed(1)}–${SANE_MAX.toFixed(1)}%). Tick the confirm box to record it anyway.`,
  },
  bad_moisture: { kind: 'err', text: 'Moisture must be a number like 14.8 (one decimal, below 100).' },
  need_checker: { kind: 'err', text: 'The checker name is required — who held the meter?' },
  bad_date: { kind: 'err', text: 'The check date is not a valid date.' },
  future_date: { kind: 'err', text: 'A check cannot be dated in the future. Nothing was changed.' },
  not_active: { kind: 'err', text: 'That listing is no longer active; checks are recorded on active listings only.' },
  error: { kind: 'err', text: 'The check failed to save — check the server log and retry.' },
};

/** Date the form's date input defaults to — today in IST, the field clock. */
function todayIst(): string {
  return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

interface Kept {
  moisture: string;
  name: string;
  date: string;
  needsConfirm: boolean;
}

function CheckForm({ listing, role, kept }: { listing: AdminListingRow; role: AdminRole; kept: Kept | null }) {
  const id = listing.id;
  const editing = !!listing.quality_checked_at;
  return (
    <form method="post" action="/admin/api/quality" className={styles.form}>
      <input type="hidden" name="listing_id" value={id} />
      <div className={styles.qFields}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            <span lang="kn">ತೇವಾಂಶ</span> · Moisture %
          </span>
          <input
            name="moisture"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            max="99.9"
            required
            defaultValue={
              kept?.moisture ||
              (listing.moisture_pct != null ? Number(listing.moisture_pct).toFixed(1) : '')
            }
            placeholder="e.g. 14.8"
            className={styles.input}
          />
        </label>
        {/* TEMP-TWO-TIER: under a shared password this required field is the
            accountability line — who actually held the meter. Defaults to the
            session role so a staff entry is never mislabelled 'admin'; always
            editable. Replaced by real per-staff identities after OTP. */}
        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            <span lang="kn">ಪರಿಶೀಲಿಸಿದವರು</span> · Checked by
          </span>
          <input
            name="checked_by"
            type="text"
            maxLength={80}
            required
            defaultValue={kept?.name || listing.quality_checked_by || role}
            className={styles.input}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            <span lang="kn">ದಿನಾಂಕ</span> · Check date
          </span>
          <input
            name="checked_on"
            type="date"
            required
            max={todayIst()}
            defaultValue={
              kept?.date ||
              (listing.quality_checked_at
                ? new Date(listing.quality_checked_at).toISOString().slice(0, 10)
                : todayIst())
            }
            className={styles.input}
          />
        </label>
      </div>

      {kept?.needsConfirm && (
        <label className={styles.confirmRow}>
          <input type="checkbox" name="confirm_range" value="1" required />
          <span>
            Record this out-of-range value anyway ({SANE_MIN.toFixed(1)}–{SANE_MAX.toFixed(1)}% is
            the sane band)
          </span>
        </label>
      )}

      <button type="submit" className={styles.btnPrimary}>
        {editing ? (
          <Bi kn="ತಿದ್ದುಪಡಿ ಉಳಿಸಿ" en="Save correction" />
        ) : (
          <Bi kn="ಪರಿಶೀಲನೆ ದಾಖಲಿಸಿ" en="Record check" />
        )}
      </button>
      {editing && (
        <p className={styles.actionNote}>
          Overwrites the current check; the audit trail keeps the old values. Checks are never
          deleted from this desk.
        </p>
      )}
    </form>
  );
}

export default async function AdminQualityPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Open to both roles (admin + staff). The role only sets the checker-name
  // default.
  const role = await requireAdminPage();

  const params = await searchParams;
  const str = (k: string) => (typeof params[k] === 'string' ? (params[k] as string) : '');

  const filters: QualityFilters = {
    districtEn: str('district') || undefined,
    harvestMonth: /^\d{4}-\d{2}$/.test(str('month')) ? str('month') : undefined,
    state: str('state') === 'pending' || str('state') === 'checked'
      ? (str('state') as 'pending' | 'checked')
      : undefined,
  };
  const sel = str('sel') || null;
  const flash = str('flash') ? (FLASH[str('flash')] ?? null) : null;

  const queue = await getQualityQueue(filters);
  const selectedInView = sel ? queue.rows.some((l) => l.id === sel) : false;

  // Values bounced back from a rejected attempt, so nothing is re-typed.
  // They belong to the open row only.
  const kept: Kept | null =
    str('m') || str('n') || str('d') || str('flash') === 'confirm_range'
      ? {
          moisture: str('m'),
          name: str('n'),
          date: str('d'),
          needsConfirm: str('flash') === 'confirm_range',
        }
      : null;

  const href = (over: Record<string, string | undefined> = {}) => {
    const q = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      state: filters.state,
      district: filters.districtEn,
      month: filters.harvestMonth,
      ...over,
    };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    const s = q.toString();
    return `/admin/quality${s ? `?${s}` : ''}${merged.sel ? `#row-${merged.sel}` : ''}`;
  };

  return (
    <>
      <DeskHead
        kn="ಗುಣಮಟ್ಟ"
        en="Quality"
        sub={`${queue.pendingCount} pending · ${queue.checkedCount} checked`}
      />

      <Segments
        label={{ kn: 'ಸ್ಥಿತಿ', en: 'Status' }}
        active={filters.state ?? 'all'}
        items={[
          { key: 'all', kn: 'ಎಲ್ಲಾ', en: 'All', href: href({ state: undefined }) },
          { key: 'pending', kn: 'ಬಾಕಿ', en: 'Pending', href: href({ state: 'pending' }) },
          { key: 'checked', kn: 'ಪರಿಶೀಲಿತ', en: 'Checked', href: href({ state: 'checked' }) },
        ]}
      />
      {queue.districts.length > 1 && (
        <Segments
          label={{ kn: 'ಜಿಲ್ಲೆ', en: 'District' }}
          active={filters.districtEn ?? 'all'}
          items={[
            { key: 'all', kn: 'ಎಲ್ಲಾ', en: 'All districts', href: href({ district: undefined }) },
            ...queue.districts.map((d) => ({ key: d, kn: '', en: d, href: href({ district: d }) })),
          ]}
        />
      )}
      {queue.months.length > 1 && (
        <Segments
          label={{ kn: 'ಕಟಾವು ತಿಂಗಳು', en: 'Harvest month' }}
          active={filters.harvestMonth ?? 'all'}
          items={[
            { key: 'all', kn: 'ಎಲ್ಲಾ', en: 'All months', href: href({ month: undefined }) },
            ...queue.months.map((m) => ({ key: m, kn: fmtMonthKey(m, 'long', 'kn-IN'), en: fmtMonthKey(m), href: href({ month: m }) })),
          ]}
        />
      )}

      <Flash flash={flash} />
      {sel && !selectedInView && (
        <p className={styles.note}>
          That listing is not in this view — it may not be active, or a filter hides it.
        </p>
      )}

      {queue.rows.length === 0 ? (
        <p className={styles.empty}>No active listings match these filters.</p>
      ) : (
        <ul className={styles.rows}>
          {queue.rows.map((l) => {
            const open = l.id === sel;
            const checked = !!l.quality_checked_at;
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
                  {checked ? (
                    <Pill
                      word={{
                        kn: 'ಪರಿಶೀಲಿತ',
                        en: `Checked ${Number(l.moisture_pct).toFixed(1)}%`,
                      }}
                      tone="ok"
                    />
                  ) : (
                    <Pill word={{ kn: 'ಬಾಕಿ', en: 'Pending check' }} tone="wait" />
                  )}
                  <p className={styles.rowMeta}>
                    {l.farmer?.full_name ?? 'Unnamed farmer'}
                    {l.farmer?.mobile && (
                      <>
                        {' · '}
                        <a href={`tel:${l.farmer.mobile}`} className={styles.tel}>
                          {l.farmer.mobile}
                        </a>
                      </>
                    )}
                  </p>
                  <p className={styles.rowMetaMuted}>
                    {[l.farmer?.village, l.taluk_en, l.district_en].filter(Boolean).join(', ') ||
                      '—'}{' '}
                    · Harvest {fmtMonth(l.harvest_month)}
                  </p>
                  {checked && (
                    <p className={styles.rowMetaMuted}>
                      Checked {fmtDate(l.quality_checked_at!)} by {l.quality_checked_by ?? '—'}
                    </p>
                  )}
                </div>

                <div className={styles.rowActions}>
                  {checked ? (
                    <p className={styles.actionNote}>
                      Done. To correct the reading, open Details.
                    </p>
                  ) : (
                    <CheckForm listing={l} role={role} kept={open ? kept : null} />
                  )}
                  <DetailsToggle
                    open={open}
                    openHref={href({ sel: l.id })}
                    closeHref={href({ sel: undefined })}
                  />
                </div>

                {open && (
                  <div className={styles.detail}>
                    <dl className={styles.fields}>
                      <div>
                        <dt>Farmer</dt>
                        <dd>{l.farmer?.full_name ?? '—'}</dd>
                      </div>
                      <div>
                        <dt>Mobile</dt>
                        <dd className={styles.mono}>{l.farmer?.mobile ?? '—'}</dd>
                      </div>
                      <div>
                        <dt>Where</dt>
                        <dd>
                          {[l.farmer?.village, l.taluk_en, l.district_en].filter(Boolean).join(', ') ||
                            '—'}
                        </dd>
                      </div>
                      <div>
                        <dt>Crop</dt>
                        <dd>
                          {varietyLabel(l)} · {l.quantity_quintals} q · {fmtMonth(l.harvest_month)}
                        </dd>
                      </div>
                      {checked && (
                        <div>
                          <dt>Current check</dt>
                          <dd>
                            {Number(l.moisture_pct).toFixed(1)}% · {fmtDate(l.quality_checked_at!)} ·{' '}
                            {l.quality_checked_by ?? '—'}
                          </dd>
                        </div>
                      )}
                    </dl>
                    {checked && (
                      <>
                        <h3 className={styles.subhead}>
                          <Bi kn="ಪರಿಶೀಲನೆ ತಿದ್ದಿ" en="Correct this check" />
                        </h3>
                        <CheckForm listing={l} role={role} kept={kept} />
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
