import type { Metadata } from 'next';
import styles from './login.module.css';

/**
 * /admin/login — a single password field, checked server-side by
 * POST /admin/api/login. Plain form post, no client JS: the redirect back
 * carries ?error= when the attempt fails.
 *
 * TEMP-SINGLE-ADMIN — one shared password until per-staff accounts land.
 */

export const metadata: Metadata = {
  title: 'Sign in — PaddyLink Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const ERRORS: Record<string, string> = {
  wrong: 'Wrong password.',
  unconfigured:
    'ADMIN_PASSWORD is not set. Add it to .env.local and restart the server.',
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
    <div className={styles.wrap}>
      <form method="post" action="/admin/api/login" className={styles.card}>
        <h1 className={styles.title}>Staff sign in</h1>
        <p className={styles.hint}>Authorized PaddyLink staff only.</p>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <label className={styles.label} htmlFor="admin-password">
          Password
        </label>
        <input
          id="admin-password"
          className={styles.input}
          type="password"
          name="password"
          autoComplete="current-password"
          autoFocus
          required
        />
        <button type="submit" className={styles.submit}>
          Sign in
        </button>
      </form>
    </div>
  );
}
