import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminPage } from '@/lib/adminAuth';
import { getQualityQueue, SANE_MIN, SANE_MAX, type QualityFilters } from '@/lib/adminQuality';
import styles from '../buyers/buyers.module.css';
import own from './quality.module.css';

/**
 * DESK 3 — Quality. The field team's moisture readings enter here: the only
 * write path for moisture_pct / quality_checked_at / quality_checked_by
 * (migration 007). Active listings only; pending checks are the work queue
 * on top, the done pile sits below. Same zero-JS pattern as Desks 1–2:
 * filters are a GET form, the panel is ?sel=, decisions are form posts.
 *
 * Checks can be edited (overwrite; audit keeps the previous values), never
 * deleted here — CEO ruling in the Desk 3 gate.
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

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function fmtMonthKey(key: string): string {
  return new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Date the panel's date input defaults to — today in IST, the field clock. */
function todayIst(): string {
  return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

function varietyLabel(l: { variety_en: string | null; variety_other: string | null }): string {
  const base = l.variety_en ?? '—';
  return l.variety_other ? `${base}: ${l.variety_other}` : base;
}

export default async function AdminQualityPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdminPage();

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
  const selected = sel ? queue.rows.find((l) => l.id === sel) ?? null : null;

  // Values bounced back from a rejected attempt, so nothing is re-typed.
  const keptMoisture = str('m');
  const keptName = str('n');
  const keptDate = str('d');
  const needsRangeConfirm = str('flash') === 'confirm_range';

  const filterQs = (over: Record<string, string | undefined> = {}) => {
    const q = new URLSearchParams();
    const merged = {
      district: filters.districtEn,
      month: filters.harvestMonth,
      state: filters.state,
      sel: sel ?? undefined,
      ...over,
    };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `?${s}` : '';
  };

  return (
    <div className={styles.desk}>
      <div className={styles.listPane}>
        <div className={styles.headRow}>
          <h1 className={styles.title}>Quality</h1>
          <span className={own.counts}>
            {queue.pendingCount} pending · {queue.checkedCount} checked
          </span>
        </div>

        {/* Filters — a plain GET form; selects submit on the button. */}
        <form method="get" action="/admin/quality" className={own.filters}>
          <select name="district" defaultValue={filters.districtEn ?? ''} className={own.select}>
            <option value="">All districts</option>
            {queue.districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select name="month" defaultValue={filters.harvestMonth ?? ''} className={own.select}>
            <option value="">All harvest months</option>
            {queue.months.map((m) => (
              <option key={m} value={m}>
                {fmtMonthKey(m)}
              </option>
            ))}
          </select>
          <select name="state" defaultValue={filters.state ?? ''} className={own.select}>
            <option value="">Pending + checked</option>
            <option value="pending">Pending only</option>
            <option value="checked">Checked only</option>
          </select>
          <button type="submit" className={own.applyBtn}>
            Apply
          </button>
          {(filters.districtEn || filters.harvestMonth || filters.state) && (
            <Link href="/admin/quality" className={own.clear}>
              Clear
            </Link>
          )}
        </form>

        {flash && (
          <p className={flash.kind === 'ok' ? styles.flashOk : styles.flashErr} role="status">
            {flash.text}
          </p>
        )}

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Farmer</th>
              <th>Mobile</th>
              <th>Village</th>
              <th>Taluk</th>
              <th>District</th>
              <th>Variety</th>
              <th>Qty (q)</th>
              <th>Harvest</th>
              <th>Quality</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {queue.rows.length === 0 && (
              <tr>
                <td colSpan={10} className={styles.empty}>
                  No active listings match these filters.
                </td>
              </tr>
            )}
            {queue.rows.map((l) => (
              <tr key={l.id} className={l.id === sel ? styles.rowSel : undefined}>
                <td>{l.farmer?.full_name ?? '—'}</td>
                <td className={styles.mono}>{l.farmer?.mobile ?? '—'}</td>
                <td>{l.farmer?.village ?? '—'}</td>
                <td>{l.taluk_en ?? '—'}</td>
                <td>{l.district_en ?? '—'}</td>
                <td>{varietyLabel(l)}</td>
                <td className={styles.mono}>{l.quantity_quintals}</td>
                <td>{fmtMonth(l.harvest_month)}</td>
                <td>
                  {l.quality_checked_at ? (
                    <span className={own.checked}>
                      ✓ {Number(l.moisture_pct).toFixed(1)}% · {fmtDate(l.quality_checked_at)} ·{' '}
                      {l.quality_checked_by ?? '—'}
                    </span>
                  ) : (
                    <span className={own.pending}>pending</span>
                  )}
                </td>
                <td>
                  <Link href={filterQs({ sel: l.id })} className={styles.rowLink}>
                    {l.quality_checked_at ? 'Edit check' : 'Record check'}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sel && (
        <aside className={styles.panel} aria-label="Quality check">
          {!selected ? (
            <p className={styles.empty}>
              Listing not in this view — it may not be active, or a filter hides it.
            </p>
          ) : (
            <>
              <div className={styles.panelHead}>
                <h2 className={styles.panelTitle}>
                  {selected.quality_checked_at ? 'Edit check' : 'Record check'}
                </h2>
                <Link href={filterQs({ sel: undefined })} className={styles.panelClose} aria-label="Close panel">
                  ✕
                </Link>
              </div>

              <dl className={styles.fields}>
                <dt>Farmer</dt>
                <dd>
                  {selected.farmer?.full_name ?? '—'} · {selected.farmer?.mobile ?? '—'}
                </dd>
                <dt>Where</dt>
                <dd>
                  {[selected.farmer?.village, selected.taluk_en, selected.district_en]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </dd>
                <dt>Crop</dt>
                <dd>
                  {varietyLabel(selected)} · {selected.quantity_quintals} q ·{' '}
                  {fmtMonth(selected.harvest_month)}
                </dd>
                {selected.quality_checked_at && (
                  <>
                    <dt>Current check</dt>
                    <dd>
                      {Number(selected.moisture_pct).toFixed(1)}% ·{' '}
                      {fmtDate(selected.quality_checked_at)} · {selected.quality_checked_by ?? '—'}
                    </dd>
                  </>
                )}
              </dl>

              <form method="post" action="/admin/api/quality" className={own.checkForm}>
                <input type="hidden" name="listing_id" value={selected.id} />

                <label htmlFor="q-moisture" className={own.formLabel}>
                  Moisture %
                </label>
                <input
                  id="q-moisture"
                  name="moisture"
                  type="number"
                  step="0.1"
                  min="0"
                  max="99.9"
                  required
                  defaultValue={
                    keptMoisture ||
                    (selected.moisture_pct != null ? Number(selected.moisture_pct).toFixed(1) : '')
                  }
                  placeholder="e.g. 14.8"
                  className={own.formInput}
                />

                <label htmlFor="q-checker" className={own.formLabel}>
                  Checked by
                </label>
                <input
                  id="q-checker"
                  name="checked_by"
                  type="text"
                  maxLength={80}
                  required
                  defaultValue={keptName || selected.quality_checked_by || 'admin'}
                  className={own.formInput}
                />

                <label htmlFor="q-date" className={own.formLabel}>
                  Check date
                </label>
                <input
                  id="q-date"
                  name="checked_on"
                  type="date"
                  required
                  max={todayIst()}
                  defaultValue={
                    keptDate ||
                    (selected.quality_checked_at
                      ? new Date(selected.quality_checked_at).toISOString().slice(0, 10)
                      : todayIst())
                  }
                  className={own.formInput}
                />

                {needsRangeConfirm && (
                  <label className={own.confirmRow}>
                    <input type="checkbox" name="confirm_range" value="1" required />
                    <span>
                      Record this out-of-range value anyway ({SANE_MIN.toFixed(1)}–
                      {SANE_MAX.toFixed(1)}% is the sane band)
                    </span>
                  </label>
                )}

                <button type="submit" className={styles.approveBtn}>
                  {selected.quality_checked_at ? 'Save correction' : 'Record check'}
                </button>
                {selected.quality_checked_at && (
                  <span className={styles.noNotify}>
                    Overwrites the current check; the audit trail keeps the old values. Checks are
                    never deleted from this desk.
                  </span>
                )}
              </form>
            </>
          )}
        </aside>
      )}
    </div>
  );
}
