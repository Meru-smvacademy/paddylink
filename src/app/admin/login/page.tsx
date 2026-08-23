import type { Metadata } from 'next';
import Image from 'next/image';
import LoginForm from './LoginForm';
import styles from './login.module.css';

/**
 * /admin/login — CEO-approved frame (Figma Make n8qhqk8eY7tC4Hek4y9iBY),
 * presentation only: the server-side password check, signed cookie, 8-hour
 * session and proxy gate are exactly the Desk 1 flow.
 *
 * Deviations from the frame, all CEO-directed:
 * - Logo is the repo master public/brand/paddy-sheaf.png, rendered plain —
 *   the frame's rounded/blended logo tile is discarded.
 * - No version string (the frame's "v2.4.1" was invented).
 * - Error text is exactly "Incorrect password." (frame appended "Please try
 *   again.").
 * - DM Sans → Inter (--inter), the closest face the repo already loads;
 *   frame colors map to existing brand tokens, no new colors.
 * - The frame's bottom-right "Error state" demo toggle was a prototyping
 *   aid and is not shipped; the eye show/hide toggle is.
 *
 * TEMP-SINGLE-ADMIN — one shared password until per-staff accounts land.
 */

export const metadata: Metadata = {
  title: 'Sign in — PaddyLink Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const ERRORS: Record<string, string> = {
  // CEO constant: exactly this string, inline under the field.
  wrong: 'Incorrect password.',
  // Not in the frame (it has no such state): rendered in the same slot.
  unconfigured: 'ADMIN_PASSWORD is not set. Add it to .env.local and restart the server.',
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const errorKey = typeof params.error === 'string' ? params.error : null;
  const error = errorKey ? (ERRORS[errorKey] ?? 'Sign-in failed.') : null;

  return (
    <div className={styles.screen}>
      {/* LEFT — dark brand panel (55% on desktop, compact band stacked on top below 900px) */}
      <div className={styles.brandPanel}>
        <div className={styles.brandInner}>
          {/* CEO correction: the current master logo file, exactly as it
              stands — no tile, no rounding, no blend. */}
          <Image
            src="/brand/paddy-sheaf.png"
            alt="PaddyLink logomark"
            width={128}
            height={128}
            className={styles.logo}
            priority
          />
          <div className={styles.wordmarkBlock}>
            <span className={styles.wordmark}>PaddyLink</span>
            <span className={styles.rule} aria-hidden="true" />
            <span className={styles.console}>Admin Console</span>
          </div>
        </div>
        <span className={styles.legal}>Kalbantt Tech (OPC) Private Limited</span>
      </div>

      {/* RIGHT — cream panel with the sign-in card */}
      <div className={styles.formPanel}>
        <div className={styles.card}>
          <div className={styles.headingArea}>
            <h1 className={styles.title}>Sign in</h1>
            <p className={styles.subtitle}>Restricted access. Authorized staff only.</p>
          </div>
          <LoginForm error={error} />
          <p className={styles.sessionNote}>Sessions expire after 8 hours.</p>
        </div>
      </div>
    </div>
  );
}
