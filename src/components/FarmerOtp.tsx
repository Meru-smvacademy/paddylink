'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import T from './T';
import styles from './FarmerOtp.module.css';

/**
 * Farmer OTP — ported from Figma Make file GrgKytpvcZYRwTpZsAM9wa
 * (src/App.tsx, OtpScreen with door="farmer"). Piece 1 of the entry flow:
 * the two OTP states only. The listing form and success screen in the same
 * Make file are later pieces and are deliberately not built here.
 *
 * AWAITING-BACKEND: nothing here sends or checks a real OTP. No SMS is
 * dispatched, no code is validated, and no session is created. The states
 * are driven entirely by local input length so the screens can be reviewed;
 * every point that needs a real call is marked AWAITING-BACKEND below.
 *
 * LANGUAGE: the frame prints Kannada with a smaller English line beneath and
 * has no working toggle of its own. That stack is preserved and the site
 * ಕ|EN control does not flip it, matching the ruling on /how-it-works, so
 * every <T> carries the same string in both slots.
 *
 * The frame's own top bar is replaced by the site header. Its back link is
 * kept in the frame's treatment directly above the card and, as the frame
 * has it, returns to the door chooser rather than to phone entry — so a
 * mistyped number cannot be corrected without restarting. Flagged, not fixed.
 */

const OTP_LENGTH = 6;
const PHONE_LENGTH = 10;
const RESEND_SECONDS = 30;

export default function FarmerOtp() {
  const [phase, setPhase] = useState<'phone' | 'verify'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback(() => {
    setCountdown(RESEND_SECONDS);
    setCanResend(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setCanResend(true);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  function handleSendOtp() {
    if (phone.length !== PHONE_LENGTH) return;
    // AWAITING-BACKEND: this is where the send-OTP request goes.
    setPhase('verify');
    startCountdown();
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }

  function check(next: string[]) {
    const code = next.join('');
    // AWAITING-BACKEND: this is where the verify-OTP request goes. Until then
    // a full six digits advances to the stub panel. The length guard below is
    // the instructed wrong-length error; the frame's own rule was the literal
    // code "000000", which is kept so the error state stays reachable.
    if (code.length !== OTP_LENGTH || code === '0'.repeat(OTP_LENGTH)) {
      setError(true);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      return;
    }
    setAdvanced(true);
  }

  function handleOtpChange(i: number, raw: string) {
    const val = raw.replace(/\D/g, '').slice(-1);
    if (raw !== '' && val === '') return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    setError(false);
    if (val && i < OTP_LENGTH - 1) inputRefs.current[i + 1]?.focus();
    if (val && next.every((d) => d)) setTimeout(() => check(next), 300);
  }

  function handleOtpKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      e.preventDefault();
      inputRefs.current[i - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault();
      inputRefs.current[i - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) {
      e.preventDefault();
      inputRefs.current[i + 1]?.focus();
    }
  }

  function handleResend() {
    if (!canResend) return;
    // AWAITING-BACKEND: this is where the resend-OTP request goes.
    setOtp(Array(OTP_LENGTH).fill(''));
    setError(false);
    setAdvanced(false);
    startCountdown();
    inputRefs.current[0]?.focus();
  }

  const ready = phone.length === PHONE_LENGTH;
  const clock = `0:${String(countdown).padStart(2, '0')}`;

  return (
    <main className={styles.page}>
      <div className={styles.main}>
        {/* Frame's back link, kept in its own treatment. Returns to the door
            chooser exactly as the frame does. */}
        <div className={styles.backRow}>
          <Link href="/login" className={styles.back}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M10 12L6 8l4-4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <T kn="ಹಿಂದೆ / Back" en="ಹಿಂದೆ / Back" />
          </Link>
        </div>

        <div className={styles.card}>
          <div className={styles.pillRow}>
            <span className={styles.pill}>
              <T kn="ರೈತ / Farmer" en="ರೈತ / Farmer" />
            </span>
          </div>

          {phase === 'phone' ? (
            <>
              <div>
                <h1 className={styles.headingKn}>
                  <T kn="ನಿಮ್ಮ ಮೊಬೈಲ್ ನಂಬರ್" en="ನಿಮ್ಮ ಮೊಬೈಲ್ ನಂಬರ್" />
                </h1>
                <p className={styles.headingEn}>
                  <T kn="Your mobile number" en="Your mobile number" />
                </p>
              </div>

              <div className={styles.phoneRow}>
                <span className={styles.prefix}>+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={PHONE_LENGTH}
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, '').slice(0, PHONE_LENGTH))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendOtp();
                  }}
                  placeholder="9876543210"
                  aria-label="Mobile number"
                  className={styles.phoneInput}
                />
              </div>

              <button
                type="button"
                onClick={handleSendOtp}
                disabled={!ready}
                className={`${styles.sendBtn} ${ready ? styles.sendBtnReady : ''}`}
              >
                <T kn="OTP ಕಳುಹಿಸಿ" en="OTP ಕಳುಹಿಸಿ" />
                <span className={styles.sendBtnEn}>
                  <T kn="/ Send OTP" en="/ Send OTP" />
                </span>
              </button>
            </>
          ) : (
            <>
              <div>
                <h1 className={styles.headingKn}>
                  <T kn="OTP ನಮೂದಿಸಿ" en="OTP ನಮೂದಿಸಿ" />
                </h1>
                <p className={styles.headingEn}>
                  <T kn={`Enter OTP · +91 ${phone}`} en={`Enter OTP · +91 ${phone}`} />
                </p>
              </div>

              <div className={styles.boxes}>
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    aria-label={`OTP digit ${i + 1}`}
                    aria-invalid={error}
                    className={[
                      styles.box,
                      d ? styles.boxFilled : '',
                      error ? styles.boxError : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  />
                ))}
              </div>

              {error && (
                <div className={styles.errorPanel} role="alert">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <circle cx="9" cy="9" r="8" stroke="var(--kemmannu-600)" strokeWidth="1.5" />
                    <path
                      d="M9 5.5V9.5"
                      stroke="var(--kemmannu-600)"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <circle cx="9" cy="12.5" r="1" fill="var(--kemmannu-600)" />
                  </svg>
                  <div>
                    <span className={styles.errorKn}>
                      <T kn="ತಪ್ಪು OTP — ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ" en="ತಪ್ಪು OTP — ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ" />
                    </span>
                    <span className={styles.errorEn}>
                      <T kn="/ Wrong OTP — try again" en="/ Wrong OTP — try again" />
                    </span>
                  </div>
                </div>
              )}

              {/* STUB — piece 2 attaches the listing form here. */}
              {advanced && (
                <div className={styles.stubPanel} role="status">
                  <p className={styles.stubKn}>
                    <T kn="ಮುಂದಿನ ಹಂತ ಶೀಘ್ರದಲ್ಲಿ" en="ಮುಂದಿನ ಹಂತ ಶೀಘ್ರದಲ್ಲಿ" />
                  </p>
                  <p className={styles.stubEn}>
                    <T kn="Next step coming soon" en="Next step coming soon" />
                  </p>
                </div>
              )}

              <div className={styles.resendRow}>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={!canResend}
                  className={`${styles.resendBtn} ${canResend ? styles.resendBtnActive : ''}`}
                >
                  <T kn="ಮತ್ತೆ ಕಳುಹಿಸಿ" en="ಮತ್ತೆ ಕಳುಹಿಸಿ" />
                  {!canResend && ` ${clock}`}
                </button>
                <p className={styles.resendEn}>
                  <T kn="Resend" en="Resend" />
                  {!canResend && ` in ${clock}`}
                </p>
              </div>

              <div className={styles.reassure}>
                <p className={styles.reassureKn}>
                  <T kn="ಎರಡು ನಿಮಿಷ, ಸಂಪೂರ್ಣ ಉಚಿತ" en="ಎರಡು ನಿಮಿಷ, ಸಂಪೂರ್ಣ ಉಚಿತ" />
                </p>
                <p className={styles.reassureEn}>
                  <T kn="Two minutes, completely free" en="Two minutes, completely free" />
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
