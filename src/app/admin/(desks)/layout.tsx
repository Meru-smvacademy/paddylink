import Link from 'next/link';
import Image from 'next/image';
import { isAdminSession } from '@/lib/adminAuth';
import styles from './admin.module.css';

/**
 * Admin chrome — the dense working bar over every desk. Lives in the (desks)
 * group so /admin/login can render the CEO-approved full-screen frame with
 * no bar above it; the URLs are unchanged.
 *
 * Deliberately NOT the public site's Header/Footer: English-only, no ಕ|EN
 * toggle, no marketing polish.
 *
 * TEMP-SINGLE-ADMIN — the chrome shows the fixed 'admin' identity; per-staff
 * names arrive with real accounts.
 */

export default async function DeskLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // A desk is only ever served to a signed-in admin (proxy + per-page
  // checks); the flag still gates the nav so an expired session that slips
  // through to a redirect never flashes a working chrome.
  const authed = await isAdminSession();

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
        {authed && (
          <nav className={styles.nav} aria-label="Admin">
            <Link href="/admin/buyers" className={styles.navLink}>
              Buyer KYC
            </Link>
            <Link href="/admin/listings" className={styles.navLink}>
              Listings
            </Link>
            <Link href="/admin/listings/routes" className={styles.navLink}>
              Field routes
            </Link>
            <span className={styles.identity} title="TEMP-SINGLE-ADMIN">
              admin
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
