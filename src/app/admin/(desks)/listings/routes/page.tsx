import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminPage } from '@/lib/adminAuth';
import { getRoutePlan } from '@/lib/adminListings';
import styles from './routes.module.css';

/**
 * DESK 2b — Field-team route list. Active listings for one harvest month,
 * grouped district → taluk → village, so the quality-check team can plan a
 * drive and phone ahead. Staff-only surface: farmer mobiles are shown in
 * full here, never on anything public.
 *
 * Unchecked listings are the reason a visit exists — they are badged and
 * counted at every level. Print-friendly on purpose: the team takes this on
 * the road.
 */

export const metadata: Metadata = {
  title: 'Field routes — PaddyLink Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

function fmtMonthKey(key: string): string {
  return new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default async function AdminRoutesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdminPage();

  const params = await searchParams;
  const monthParam = typeof params.month === 'string' ? params.month : undefined;
  const plan = await getRoutePlan(monthParam);

  return (
    <div className={styles.page}>
      <div className={styles.headRow}>
        <h1 className={styles.title}>Field routes</h1>
        {plan.months.length > 0 && (
          <nav className={styles.months} aria-label="Harvest month">
            {plan.months.map((m) => (
              <Link
                key={m}
                href={`/admin/listings/routes?month=${m}`}
                className={m === plan.month ? styles.monthActive : styles.month}
              >
                {fmtMonthKey(m)}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {plan.month === null ? (
        <p className={styles.empty}>No active listings — nothing to route.</p>
      ) : (
        <>
          <p className={styles.summary}>
            {fmtMonthKey(plan.month)} harvest — {plan.total} active listing
            {plan.total === 1 ? '' : 's'}, {plan.unchecked} awaiting quality check.
          </p>

          {plan.districts.map((d) => (
            <section key={d.district_en} className={styles.district}>
              <h2 className={styles.districtHead}>
                {d.district_en}
                <span className={styles.headMeta}>
                  {d.quintals} q · {d.unchecked} unchecked
                </span>
              </h2>
              {d.taluks.map((t) => (
                <div key={t.taluk_en} className={styles.taluk}>
                  <h3 className={styles.talukHead}>
                    {t.taluk_en}
                    <span className={styles.headMeta}>
                      {t.quintals} q · {t.unchecked} unchecked
                    </span>
                  </h3>
                  {t.villages.map((v) => (
                    <div key={v.village} className={styles.village}>
                      <h4 className={styles.villageHead}>{v.village}</h4>
                      <ul className={styles.stops}>
                        {v.listings.map((l) => (
                          <li key={l.id} className={styles.stop}>
                            <span className={styles.farmer}>{l.farmer_name ?? 'Unnamed farmer'}</span>
                            <span className={styles.mobile}>{l.farmer_mobile}</span>
                            <span className={styles.crop}>
                              {l.variety_en ?? '—'}
                              {l.variety_other ? `: ${l.variety_other}` : ''} ·{' '}
                              {l.quantity_quintals} q
                            </span>
                            {l.quality_checked_at ? (
                              <span className={styles.checked}>
                                ✓ checked{l.moisture_pct != null ? ` · ${l.moisture_pct}%` : ''}
                              </span>
                            ) : (
                              <span className={styles.unchecked}>needs check</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
