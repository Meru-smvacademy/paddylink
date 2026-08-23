'use client';

import { useState } from 'react';
import styles from './login.module.css';

/**
 * The sign-in form from the frame. Client component only for presentation:
 * the eye show/hide toggle, and hiding the server's error once the admin
 * starts retyping (the frame clears its error on input). Submission is the
 * unchanged native POST to /admin/api/login — no fetch, no client auth.
 */

/* The frame's own eye icons, verbatim vector data. */
function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function LoginForm({ error }: { error: string | null }) {
  const [showPassword, setShowPassword] = useState(false);
  const [errorHidden, setErrorHidden] = useState(false);

  const errorActive = error !== null && !errorHidden;

  return (
    <form method="post" action="/admin/api/login" className={styles.form}>
      <div className={errorActive ? styles.fieldTight : styles.field}>
        <label htmlFor="admin-password" className={styles.label}>
          Password
        </label>
        <div className={styles.inputWrap}>
          <input
            id="admin-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            autoComplete="current-password"
            autoFocus
            required
            onChange={() => setErrorHidden(true)}
            className={`${styles.input} ${errorActive ? styles.inputError : ''} ${showPassword ? styles.inputPlain : ''}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className={styles.eye}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            <EyeIcon open={showPassword} />
          </button>
        </div>
      </div>

      {errorActive && (
        <div className={styles.errorRow} role="alert">
          {/* The frame's error glyph, verbatim; stroke follows the error
              color via currentColor on the wrapper. */}
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 4.5v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="8" cy="11" r="0.8" fill="currentColor" />
          </svg>
          <span className={styles.errorText}>{error}</span>
        </div>
      )}

      <button type="submit" className={styles.submit}>
        Sign in
      </button>
    </form>
  );
}
