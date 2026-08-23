import Link from 'next/link';
import Image from 'next/image';
import { getAdminSession } from '@/lib/adminAuth';
import styles from './admin.module.css';

/**
 * Admin chrome — the dense working bar over every desk. Lives in the (desks)
 * group so /admin/login can render the CEO-approved full-screen frame with
 * no bar above it; the URLs are unchanged.
 *
 * Deliberately NOT the public site's Header/Footer: English-only, no ಕ|EN
 * toggle, no marketing polish.
 *
 * TEMP-TWO-TIER — the nav is scoped to the role: admin sees every desk,
 * staff sees only the two they may reach (Field routes + Quality). This is
 * cosmetic; the real enforcement is the proxy gate plus each page's own role
 * check. The identity chip shows the role until per-staff names arrive.
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
            width={23}
            height={23}
            className={styles.mark}
          />
          <span className={styles.wordmark}>PaddyLink</span>
          <span className={styles.portalTag}>Admin</span>
        </div>
        {role && (
          <nav className={styles.nav} aria-label="Admin">
            {role === 'admin' && (
              <>
                <Link href="/admin/buyers" className={styles.navLink}>
                  Buyer KYC
                </Link>
                <Link href="/admin/listings" className={styles.navLink}>
                  Listings
                </Link>
              </>
            )}
            {/* Both roles reach these two. */}
            <Link href="/admin/quality" className={styles.navLink}>
              Quality
            </Link>
            <Link href="/admin/listings/routes" className={styles.navLink}>
              Field routes
            </Link>
            {role === 'admin' && (
              <Link href="/admin/overview" className={styles.navLink}>
                Overview
              </Link>
            )}
            <span className={styles.identity} title="TEMP-TWO-TIER">
              {role}
            </span>
            <form method="post" action="/admin/logout">
              <button type="submit" className={styles.logout}>
                Sign out
              </button>
            </form>
          </nav>
        )}
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
