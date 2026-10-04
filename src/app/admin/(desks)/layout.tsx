import Image from 'next/image';
import { getAdminSession } from '@/lib/adminAuth';
import { Bi } from './deskUi';
import DeskNav from './DeskNav';
import styles from './desk.module.css';

/**
 * Admin chrome — brand bar and desk navigation over every desk. Lives in the
 * (desks) group so /admin/login can render the CEO-approved full-screen
 * frame with no bar above it; the URLs are unchanged.
 *
 * Mobile-first: admin is checked from a phone. Deliberately NOT the public
 * site's Header/Footer — no ಕ|EN toggle; every heading and button carries
 * Kannada above English instead, as on the farmer surfaces.
 *
 * TEMP-TWO-TIER — the nav is scoped to the role (see DeskNav). The identity
 * chip shows the role until per-staff names arrive.
 */

export default async function DeskLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // A desk is only ever served to a signed-in role (proxy + per-page checks);
  // the session still gates the nav so an expired session that slips through
  // to a redirect never flashes a working chrome.
  const session = await getAdminSession();
  const role = session?.role ?? null;

  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <div className={styles.brand}>
          <Image
            src="/brand/paddy-sheaf-46.png"
            alt=""
            width={28}
            height={28}
            className={styles.mark}
          />
          <span className={styles.wordmark}>PaddyLink</span>
          <span className={styles.portalTag}>Admin</span>
        </div>
        {role && (
          <div className={styles.barEnd}>
            <span className={styles.identity} title="TEMP-TWO-TIER">
              {role}
            </span>
            <form method="post" action="/admin/logout">
              <button type="submit" className={styles.logout}>
                <Bi kn="ಲಾಗ್ ಔಟ್" en="Sign out" />
              </button>
            </form>
          </div>
        )}
      </header>
      {role && <DeskNav role={role} />}
      <main className={styles.main}>{children}</main>
    </div>
  );
}
