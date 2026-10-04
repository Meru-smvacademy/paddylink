'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { AdminRole } from '@/lib/adminSession';
import styles from './desk.module.css';

/**
 * Desk navigation — a grid of large two-line buttons, Kannada over English.
 * A client component only so the current desk can be marked; the links
 * themselves are the same for every visit.
 *
 * TEMP-TWO-TIER — scoped to the role exactly as before: admin sees every
 * desk, staff sees only Quality and Field routes. Cosmetic; the proxy gate
 * and each page's own role check are the enforcement.
 */

const ADMIN_DESKS = [
  { href: '/admin/overview', kn: 'ಅವಲೋಕನ', en: 'Overview' },
  { href: '/admin/buyers', kn: 'ಖರೀದಿದಾರರು', en: 'Buyers' },
  { href: '/admin/listings', kn: 'ಪಟ್ಟಿಗಳು', en: 'Listings' },
  { href: '/admin/quality', kn: 'ಗುಣಮಟ್ಟ', en: 'Quality' },
  { href: '/admin/listings/routes', kn: 'ಮಾರ್ಗಗಳು', en: 'Field routes' },
  { href: '/admin/orders', kn: 'ಪಾವತಿಗಳು', en: 'Payments' },
];

const STAFF_DESKS = ADMIN_DESKS.filter(
  (d) => d.href === '/admin/quality' || d.href === '/admin/listings/routes',
);

export default function DeskNav({ role }: { role: AdminRole }) {
  const pathname = usePathname();
  const desks = role === 'admin' ? ADMIN_DESKS : STAFF_DESKS;
  // Longest match wins, so /admin/listings/routes does not also light
  // up /admin/listings.
  const current = desks
    .filter((d) => pathname === d.href || pathname.startsWith(`${d.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className={styles.nav} aria-label="Admin desks">
      <ul className={role === 'admin' ? styles.navList : styles.navListTwo}>
        {desks.map((d) => (
          <li key={d.href}>
            <Link
              href={d.href}
              className={d.href === current ? styles.navLinkActive : styles.navLink}
              aria-current={d.href === current ? 'page' : undefined}
            >
              <span className={styles.bi}>
                <span className={styles.kn} lang="kn">
                  {d.kn}
                </span>
                <span className={styles.en}>{d.en}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
