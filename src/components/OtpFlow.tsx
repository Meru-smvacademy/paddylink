'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import FarmerListingFormV2, { type CreatedListing } from './FarmerListingFormV2';
import FarmerSuccess from './FarmerSuccess';
import type { ReferenceData } from '@/lib/reference';
import T from './T';
import styles from './OtpFlow.module.css';

/**
 * Entry flow — ported from Figma Make file GrgKytpvcZYRwTpZsAM9wa
 * (src/App.tsx, OtpScreen). The frame has one OTP component parameterised by
 * `door`, and this keeps that shape: /login/farmer and /login/buyer render
 * the same screens, differing only where the frame differs.
 *
 * The frame's three buyer differences, and nothing else:
 *   accent       gadde-700   -> bhatta-600  (pill, send button, filled box,
 *                                            active resend)
 *   accent-light gadde-300   -> bhatta-200  (card border)
 *   pill text    ರೈತ / Farmer -> ಖರೀದಿದಾರ / Buyer
 * Every string, size and disabled colour is identical across both doors.
 *
 * After a verified code the farmer walks on to the listing form and then the
 * success screen. The form is now the CEO's redesign, from Make file
 * RaEviXLLlGJv2UI7Bp7xy3; the success screen is still this file's. The frame returns verified
 * buyers to the door chooser, calling it a placeholder; per CEO ruling they
 * now land on /buyer/listings, the private listings browser.
 *
 * THE OTP IS REAL NOW. /api/otp/send puts a code on the phone through MSG91
 * and /api/otp/verify checks it; the session cookie is minted by the verify
 * route, from the number it just proved. This component no longer tells the
 * server who anybody is — the two fetches to /api/farmer/session and
 * /api/buyer/session that used to do exactly that are gone, because a screen
 * that can name its own user is not a login.
 *
 * EVERY RULE IS THE SERVER'S. Ten minutes, five attempts, three sends per
 * fifteen minutes, one live code per door — all of it lives in migration 016
 * and is enforced there. The countdown below is a courtesy so the resend
 * button does not invite a refusal; it is not the limit, and shortening it in
 * the browser buys nothing.
 *
 * FAIL CLOSED (CEO ruling). When the code cannot be sent — provider down,
 * timed out, MSG91 wallet empty — this screen says login is temporarily
 * unavailable, prints a number to call, and does NOT advance to the code
 * boxes. There is no path through this file that reaches a session without a
 * verified code.
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
 * The frame drops that link on the success screen, and so does this.
 */

const OTP_LENGTH = 6;
const PHONE_LENGTH = 10;
const RESEND_SECONDS = 30;

/** The number a farmer calls when the SMS cannot be sent. Printed on the
 *  fail-closed notice, and the same constant the send route exports. */
const SUPPORT_MOBILE = '7483759960';

type Door = 'farmer' | 'buyer';
type Phase = 'phone' | 'verify' | 'form' | 'success';

/**
 * Everything this screen may need to say, in the frame's own stack: Kannada
 * first, English beneath. Held as a pair rather than a boolean because there
 * are now six distinct things that can go wrong and telling a farmer "wrong
 * OTP" when his code expired, or when the SMS was never sent, is a lie.
 */
type Notice = { kn: string; en: string };

const NOTICES = {
  wrongCode: (left?: number): Notice => ({
    kn:
      left && left > 0
        ? `ತಪ್ಪು OTP — ಇನ್ನು ${left} ಪ್ರಯತ್ನ ಉಳಿದಿದೆ`
        : 'ತಪ್ಪು OTP — ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
    en:
      left && left > 0
        ? `Wrong OTP — ${left} ${left === 1 ? 'try' : 'tries'} left`
        : 'Wrong OTP — try again',
  }),
  expired: {
    kn: 'OTP ಅವಧಿ ಮುಗಿದಿದೆ — ಮತ್ತೆ ಕಳುಹಿಸಿ',
    en: 'OTP expired — send a new one',
  },
  tooManyAttempts: {
    kn: 'ಹಲವು ತಪ್ಪು ಪ್ರಯತ್ನಗಳು — ಹೊಸ OTP ಕಳುಹಿಸಿ',
    en: 'Too many wrong attempts — send a new OTP',
  },
  noChallenge: {
    kn: 'OTP ಸಿಂಧುವಾಗಿಲ್ಲ — ಮತ್ತೆ ಕಳುಹಿಸಿ',
    en: 'That OTP is no longer valid — send a new one',
  },
  rateLimited: (minutes: number): Notice => ({
    kn: `ಹಲವು ಬಾರಿ ಕಳುಹಿಸಲಾಗಿದೆ — ${minutes} ನಿಮಿಷಗಳ ನಂತರ ಪ್ರಯತ್ನಿಸಿ`,
    en: `Too many requests — try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`,
  }),
  /* The fail-closed notice. It never blames the farmer and always gives him
     somewhere to go, because on this path there is nothing he can do alone. */
  unavailable: {
    kn: `ಲಾಗಿನ್ ತಾತ್ಕಾಲಿಕವಾಗಿ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಕರೆ ಮಾಡಿ: ${SUPPORT_MOBILE}`,
    en: `Login is temporarily unavailable. Please call ${SUPPORT_MOBILE}`,
  },
  network: {
    kn: 'ಸಂಪರ್ಕ ಸಿಗಲಿಲ್ಲ — ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
    en: 'Could not reach PaddyLink — try again',
  },
} as const;

/**
 * The frame's error treatment, now carrying whatever the server said rather
 * than one hardcoded sentence. role="alert" so a farmer using a screen reader
 * hears it without hunting for what changed, and the same panel serves both
 * the phone screen and the code screen so a failure never looks like a
 * different kind of event depending on which step it happened on.
 */
function NoticePanel({ notice }: { notice: Notice }) {
  return (
    <div className={styles.errorPanel} role="alert">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="8" stroke="var(--kemmannu-600)" strokeWidth="1.5" />
        <path d="M9 5.5V9.5" stroke="var(--kemmannu-600)" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="9" cy="12.5" r="1" fill="var(--kemmannu-600)" />
      </svg>
      <div>
        <span className={styles.errorKn}>
          <T kn={notice.kn} en={notice.kn} />
        </span>
        <span className={styles.errorEn}>
          <T kn={`/ ${notice.en}`} en={`/ ${notice.en}`} />
        </span>
      </div>
    </div>
  );
}

export default function OtpFlow({
  door,
  reference,
}: {
  door: Door;
  /** Only the farmer door renders the listing form, so this is optional. */
  reference?: ReferenceData;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('phone');
  const [listing, setListing] = useState<CreatedListing | null>(null);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  /** What went wrong, in both languages, or null. */
  const [notice, setNotice] = useState<Notice | null>(null);
  /** Drives the red boxes. A send failure is a notice but not a bad code. */
  const [codeError, setCodeError] = useState(false);
  /** In flight. Both guard against a double submit and drive the labels. */
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
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

  /**
   * Ask for a code. Used by the send button and by resend — one function,
   * because the two differ only in what is already on the screen.
   *
   * THE PHASE ONLY ADVANCES ON A CONFIRMED SEND. A farmer is never shown six
   * empty boxes for a code that was not dispatched; that is the whole of the
   * fail-closed ruling as it appears on this screen.
   */
  async function requestCode(isResend: boolean) {
    if (phone.length !== PHONE_LENGTH || sending) return;
    setSending(true);
    setNotice(null);
    setCodeError(false);

    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: phone, door }),
      });

      if (res.ok) {
        setOtp(Array(OTP_LENGTH).fill(''));
        setPhase('verify');
        startCountdown();
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
        return;
      }

      const body = await res.json().catch(() => ({}) as Record<string, unknown>);

      if (res.status === 429) {
        const seconds = Number(body?.retryAfterSeconds ?? 900);
        setNotice(NOTICES.rateLimited(Math.max(1, Math.ceil(seconds / 60))));
        /* A blocked resend must not restart the clock — the countdown would
           promise a retry the server has already refused. */
        if (!isResend) setPhase('phone');
        return;
      }

      if (res.status === 503) {
        /* MSG91 is down, timed out, or the wallet is empty. The server has
           already logged its own words; the farmer gets a number to call. */
        setNotice(NOTICES.unavailable);
        if (!isResend) setPhase('phone');
        return;
      }

      setNotice(NOTICES.network);
      if (!isResend) setPhase('phone');
    } catch {
      /* Offline, or the request never landed. Never advances. */
      setNotice(NOTICES.network);
    } finally {
      setSending(false);
    }
  }

  function handleSendOtp() {
    void requestCode(false);
  }

  /**
   * Send the typed code to be checked. Nothing here decides whether it is
   * right — the server does, and this reports what it said.
   *
   * THE COOKIE IS SET BY THE RESPONSE, not by this file: /api/otp/verify
   * returns Set-Cookie for the door it verified. Navigation therefore has to
   * wait for the response to land, which it does — the old buyer branch
   * already had to learn this, and it now applies to both doors.
   */
  async function check(next: string[]) {
    const code = next.join('');
    if (code.length !== OTP_LENGTH || verifying) return;

    setVerifying(true);
    setNotice(null);
    setCodeError(false);

    const clear = () => {
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    };

    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: phone, code, door }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        hasListings?: boolean;
        attemptsLeft?: number;
      };

      if (!res.ok || !body.ok) {
        setCodeError(true);
        clear();
        switch (body.error) {
          case 'expired':
            setNotice(NOTICES.expired);
            break;
          case 'too_many_attempts':
            setNotice(NOTICES.tooManyAttempts);
            break;
          case 'no_challenge':
            setNotice(NOTICES.noChallenge);
            break;
          case 'wrong_code':
            setNotice(NOTICES.wrongCode(body.attemptsLeft));
            break;
          default:
            setNotice(NOTICES.network);
        }
        return;
      }

      /* Verified. The session cookie is already on this response. */
      if (door === 'farmer') {
        /* A farmer who already has listings came back for them, not to post
           another — the server counted, because this screen cannot. A farmer
           with none goes on to the form, which is where the frame sent
           everyone. */
        if (body.hasListings) {
          router.push('/farmer/listings');
        } else {
          setPhase('form');
        }
        return;
      }
      router.push('/buyer/listings');
    } catch {
      setCodeError(true);
      clear();
      setNotice(NOTICES.network);
    } finally {
      setVerifying(false);
    }
  }

  function handleOtpChange(i: number, raw: string) {
    const val = raw.replace(/\D/g, '').slice(-1);
    if (raw !== '' && val === '') return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    setNotice(null);
    setCodeError(false);
    if (val && i < OTP_LENGTH - 1) inputRefs.current[i + 1]?.focus();
    if (val && next.every((d) => d)) setTimeout(() => void check(next), 300);
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

  /**
   * The button under the boxes. Auto-submit on the sixth digit stays — this
   * is the same call by another route, for a farmer whose code arrived by
   * paste or SMS autofill in one event, or who simply looked for something
   * to press. check() re-checks the length and the in-flight flag, so a click
   * that races the timer is a no-op rather than a second verify.
   */
  function handleVerify() {
    void check(otp);
  }

  function handleResend() {
    if (!canResend || sending) return;
    /* The same request the send button makes. The server supersedes the
       previous code, so the one in the first SMS stops working the moment
       this one is issued. */
    void requestCode(true);
  }

  const ready = phone.length === PHONE_LENGTH;
  const codeReady = otp.every((d) => d);
  const clock = `0:${String(countdown).padStart(2, '0')}`;
  const pill = door === 'farmer' ? 'ರೈತ / Farmer' : 'ಖರೀದಿದಾರ / Buyer';

  return (
    <main className={`${styles.page} ${door === 'buyer' ? styles.buyer : ''}`}>
      <div className={`${styles.main} ${phase === 'form' ? styles.mainForm : ''}`}>
        {/* Frame's back link, kept in its own treatment. Returns to the door
            chooser exactly as the frame does, and is dropped on the success
            screen because the frame drops its top-bar back link there. */}
        {phase !== 'success' && (
          <div className={`${styles.backRow} ${phase === 'form' ? styles.backRowForm : ''}`}>
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
        )}

        {phase === 'form' && reference && (
          <FarmerListingFormV2
            reference={reference}
            /* Display only. The number has been verified by this point, and
               the create route takes it from the signed session rather than
               from this prop — see FarmerListingFormV2. */
            mobile={phone}
            onSubmitted={(created) => {
              setListing(created);
              setPhase('success');
            }}
          />
        )}

        {phase === 'success' && <FarmerSuccess listing={listing} />}

        {(phase === 'phone' || phase === 'verify') && (
          <div className={styles.card}>
            <div className={styles.pillRow}>
              <span className={styles.pill}>
                <T kn={pill} en={pill} />
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

                {/* Send failures and rate limits land here, on the screen the
                    farmer is still looking at. The phase does not advance. */}
                {notice && <NoticePanel notice={notice} />}

                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={!ready || sending}
                  className={`${styles.sendBtn} ${ready && !sending ? styles.sendBtnReady : ''}`}
                >
                  {sending ? (
                    <>
                      <T kn="ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ…" en="ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ…" />
                      <span className={styles.sendBtnEn}>
                        <T kn="/ Sending…" en="/ Sending…" />
                      </span>
                    </>
                  ) : (
                    <>
                      <T kn="OTP ಕಳುಹಿಸಿ" en="OTP ಕಳುಹಿಸಿ" />
                      <span className={styles.sendBtnEn}>
                        <T kn="/ Send OTP" en="/ Send OTP" />
                      </span>
                    </>
                  )}
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
                      aria-invalid={codeError}
                      disabled={verifying}
                      className={[
                        styles.box,
                        d ? styles.boxFilled : '',
                        codeError ? styles.boxError : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    />
                  ))}
                </div>

                {notice && <NoticePanel notice={notice} />}

                {/* The frame had no such control — the code submitted itself
                    on the sixth digit and nothing else. That left a farmer
                    whose code arrived in one paste or one SMS autofill with a
                    screen that did nothing and no way to ask it to. Same
                    primary button as the phone screen, same disabled
                    treatment; the auto-submit above is untouched. */}
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={!codeReady || verifying}
                  className={`${styles.sendBtn} ${codeReady && !verifying ? styles.sendBtnReady : ''}`}
                >
                  {verifying ? (
                    <>
                      <T kn="ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ…" en="ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ…" />
                      <span className={styles.sendBtnEn}>
                        <T kn="/ Verifying…" en="/ Verifying…" />
                      </span>
                    </>
                  ) : (
                    <>
                      <T kn="ದೃಢೀಕರಿಸಿ" en="ದೃಢೀಕರಿಸಿ" />
                      <span className={styles.sendBtnEn}>
                        <T kn="/ Verify" en="/ Verify" />
                      </span>
                    </>
                  )}
                </button>

                <div className={styles.resendRow}>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={!canResend || sending}
                    className={`${styles.resendBtn} ${canResend && !sending ? styles.resendBtnActive : ''}`}
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
        )}
      </div>
    </main>
  );
}
