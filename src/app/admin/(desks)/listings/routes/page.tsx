import type { Metadata } from 'next';
import { requireAdminPage } from '@/lib/adminAuth';
import { getRoutePlan } from '@/lib/adminListings';
import { DeskHead, Pill, Segments, fmtMonthKey } from '../../deskUi';
import styles from '../../desk.module.css';

/**
 * DESK 2b — Field-team route list. Active listings for one harvest month,
 * grouped district → taluk → village, so the quality-check team can plan a
 * drive and phone ahead. Staff-only surface: farmer mobiles are shown in
 * full here, never on anything public — and are tap-to-call, because the
 * team reads this from a phone on the road.
 *
 * Unchecked listings are the reason a visit exists — they are badged and
 * counted at every level. Print still works: the chrome drops out.
 */

export const metadata: Metadata = {
  title: 'Field routes — PaddyLink Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminRoutesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdminPage();

  const params = await searchParams;
  const monthParam = typeof params.month === 'string' ? params.month : undefined;
  // CEO ruling (Desk 3 gate): default is the work queue — pending only.
  const pendingOnly = params.view !== 'all';
  const plan = await getRoutePlan(monthParam, pendingOnly);
  const qs = (month: string | null, view: 'pending' | 'all') => {
    const q = new URLSearchParams();
    if (month) q.set('month', month);
    if (view === 'all') q.set('view', 'all');
    const s = q.toString();
    return `/admin/listings/routes${s ? `?${s}` : ''}`;
  };
  const view = plan.pendingOnly ? 'pending' : 'all';

  return (
    <>
      <DeskHead
        kn="ಕ್ಷೇತ್ರ ಮಾರ್ಗಗಳು"
        en="Field routes"
        sub={
          plan.month === null
            ? undefined
            : plan.pendingOnly
              ? `${fmtMonthKey(plan.month, 'long')} harvest — ${plan.total} listing${plan.total === 1 ? '' : 's'} awaiting quality check`
              : `${fmtMonthKey(plan.month, 'long')} harvest — ${plan.total} active, ${plan.unchecked} awaiting quality check`
        }
      />

      <Segments
        label={{ kn: 'ಪಟ್ಟಿ', en: 'Show' }}
        active={view}
        items={[
          { key: 'pending', kn: 'ಬಾಕಿ ಮಾತ್ರ', en: 'Pending only', href: qs(plan.month, 'pending') },
          { key: 'all', kn: 'ಎಲ್ಲಾ', en: 'All', href: qs(plan.month, 'all') },
        ]}
      />
      {plan.months.length > 0 && (
        <Segments
          label={{ kn: 'ಕಟಾವು ತಿಂಗಳು', en: 'Harvest month' }}
          active={plan.month ?? ''}
          items={plan.months.map((m) => ({
            key: m,
            kn: fmtMonthKey(m, 'long', 'kn-IN'),
            en: fmtMonthKey(m),
            href: qs(m, view),
          }))}
        />
      )}

      {plan.month === null ? (
        <p className={styles.empty}>No active listings — nothing to route.</p>
      ) : plan.total === 0 ? (
        <p className={styles.empty}>
          {fmtMonthKey(plan.month, 'long')} harvest — every active listing is quality-checked.
          Nothing pending to route.
        </p>
      ) : (
        plan.districts.map((d) => (
          <section key={d.district_en} className={styles.district}>
            <h2 className={styles.districtHead}>
              {d.district_en}
              <span className={styles.headMeta}>
                {d.quintals} q · {d.unchecked} unchecked
              </span>
            </h2>
            {d.taluks.map((t) => (
              <div key={t.taluk_en}>
                <h3 className={styles.talukHead}>
                  {t.taluk_en}
                  <span className={styles.headMeta}>
                    {t.quintals} q · {t.unchecked} unchecked
                  </span>
                </h3>
                {t.villages.map((v) => (
                  <div key={v.village}>
                    <h4 className={styles.villageHead}>{v.village}</h4>
                    <ul className={styles.rows}>
                      {v.listings.map((l) => (
                        <li key={l.id} className={styles.row}>
                          <div className={styles.rowMain}>
                            <p className={styles.rowTitle}>{l.farmer_name ?? 'Unnamed farmer'}</p>
                            <p className={styles.rowMeta}>
                              {l.variety_en ?? '—'}
                              {l.variety_other ? `: ${l.variety_other}` : ''} · {l.quantity_quintals} q
                            </p>
                            {l.quality_checked_at ? (
                              <Pill
                                word={{
                                  kn: 'ಪರಿಶೀಲಿತ',
                                  en: `Checked${l.moisture_pct != null ? ` · ${l.moisture_pct}%` : ''}`,
                                }}
                                tone="ok"
                              />
                            ) : (
                              <Pill word={{ kn: 'ಬಾಕಿ', en: 'Needs check' }} tone="wait" />
                            )}
                          </div>
                          {l.farmer_mobile && (
                            <div className={styles.rowActions}>
                              <a href={`tel:${l.farmer_mobile}`} className={styles.btnPrimary}>
                                <span className={styles.bi}>
                                  <span className={styles.kn} lang="kn">
                                    ಕರೆ ಮಾಡಿ
                                  </span>
                                  <span className={styles.en}>Call {l.farmer_mobile}</span>
                                </span>
                              </a>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </section>
        ))
      )}
    </>
  );
}
