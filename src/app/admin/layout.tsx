import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { isAdminSession } from '@/lib/adminAuth';
import styles from './admin.module.css';

/**
 * Admin chrome. Deliberately NOT the public site's Header/Footer: a single
 * dense bar with the brand mark, an English-only nav and Sign out. No ಕ|EN
 * toggle — the admin portal is English-only. No marketing polish.
 *
 * TEMP-SINGLE-ADMIN — the chrome shows the fixed 'admin' identity; per-staff
 * names arrive with real accounts.
 */

export const metadata: Metadata = {
  title: 'PaddyLink Admin',
  // Never in a search index; the proxy also sets X-Robots-Tag on every
  // /admin response. Nothing public links here.
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Chrome only differs by session state: the login screen gets the bare
  // bar, a signed-in desk gets nav + Sign out.
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
