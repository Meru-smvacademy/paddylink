import Link from 'next/link';
import T from './T';
import styles from './Login.module.css';

/**
 * Login — the two-door entry screen, ported from Figma Make file
 * GrgKytpvcZYRwTpZsAM9wa (src/App.tsx, ChooseScreen).
 *
 * The Make file also holds the OTP, farmer-form and success screens. Those
 * become /login/farmer and /login/buyer in a later step; only the door
 * chooser is ported here.
 *
 * The frame draws its own top bar (paddy mark + ಪ್ಯಾಡಿಲಿಂಕ್ / PaddyLink on a
 * hottu-50 strip); per brief the site header replaces it. The frame's empty
 * "Footer strip" comment renders nothing, and nothing is built for it.
 *
 * LANGUAGE: the frame prints both languages at once — Kannada large over
 * small English — and has no toggle of its own. That stack is preserved and
 * the ಕ|EN control does not flip it, matching the ruling on /how-it-works,
 * so every <T> carries the same string in both slots.
 *
 * Three CEO-approved deviations, marked below:
 * - DEV-FOCUS: the frame's cards are <button> with focus:outline-none, which
 *   suppresses the ring and leaves them keyboard-unusable. Real links here,
 *   with a visible :focus-visible ring in each card's accent.
 * - DEV-ROUTE: the register link goes to /register-buyer, not the frame's
 *   buyer door.
 * - DEV-LINK: the frame's English "New buyer? Register →" is a dead span;
 *   both halves are wrapped in one combined link target.
 */

function FarmerIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
      <path
        d="M17 4 C17 4 9 9 9 18 C9 24 12.5 28 17 28 C21.5 28 25 24 25 18 C25 9 17 4 17 4Z"
        fill="var(--gadde-300)"
        opacity="0.5"
      />
      <path d="M17 4 V28" stroke="var(--bhatta-200)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17 14 C17 14 13 12 11 9" stroke="var(--gadde-300)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M17 14 C17 14 21 12 23 9" stroke="var(--gadde-300)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 30 H22" stroke="var(--bhatta-600)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BuyerIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
      <rect x="8" y="13" width="18" height="14" rx="2" fill="var(--hottu-50)" opacity="0.7" />
      <path
        d="M12 13 V10 C12 7.24 14.24 5 17 5 C19.76 5 22 7.24 22 10 V13"
        stroke="var(--hottu-50)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="17" cy="20" r="2.5" fill="var(--bhatta-600)" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M4 9h10M10 5l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Door = {
  href: string;
  accent: string;
  accentShadow: string;
  icon: React.ReactNode;
  kn: string;
  en: string;
  bodyKn: string;
  bodyEn: string;
};

const DOORS: Door[] = [
  {
    href: '/login/farmer',
    accent: 'var(--gadde-700)',
    accentShadow: 'color-mix(in srgb, var(--gadde-700) 8%, transparent)',
    icon: <FarmerIcon />,
    kn: 'ರೈತ',
    en: 'Farmer',
    bodyKn: 'ಭತ್ತ ಪಟ್ಟಿ ಮಾಡಿ ಮತ್ತು ನಿಮ್ಮ ಪಟ್ಟಿಗಳನ್ನು ನೋಡಿ',
    bodyEn: 'List paddy and see your listings',
  },
  {
    href: '/login/buyer',
    accent: 'var(--bhatta-600)',
    accentShadow: 'color-mix(in srgb, var(--bhatta-600) 8%, transparent)',
    icon: <BuyerIcon />,
    kn: 'ಖರೀದಿದಾರ',
    en: 'Buyer',
    bodyKn: 'ಪಟ್ಟಿಗಳನ್ನು ನೋಡಿ, ಸಂಪರ್ಕ ತೆರೆಯಿರಿ',
    bodyEn: 'Browse listings, unlock contacts',
  },
];

export default function Login() {
  return (
    <main className={styles.page}>
      <div className={styles.main}>
        <div className={styles.heading}>
          <h1 className={styles.titleKn}>
            <T kn="ಪ್ರವೇಶಿಸಿ" en="ಪ್ರವೇಶಿಸಿ" />
          </h1>
          <p className={styles.titleEn}>
            <T kn="Login" en="Login" />
          </p>
          <div className={styles.rule} />
        </div>

        <div className={styles.cards}>
          {DOORS.map((d) => (
            // DEV-FOCUS: real link, not the frame's focus-suppressed <button>.
            <Link
              key={d.href}
              href={d.href}
              className={styles.card}
              style={
                {
                  '--accent': d.accent,
                  '--accent-shadow': d.accentShadow,
                } as React.CSSProperties
              }
            >
              <span className={styles.cardIcon}>{d.icon}</span>

              <span>
                <span className={styles.cardTitleKn}>
                  <T kn={d.kn} en={d.kn} />
                </span>
                <span className={styles.cardTitleEn}>
                  <T kn={d.en} en={d.en} />
                </span>
              </span>

              <p className={styles.cardBodyKn}>
                <T kn={d.bodyKn} en={d.bodyKn} />
              </p>
              <p className={styles.cardBodyEn}>
                <T kn={d.bodyEn} en={d.bodyEn} />
              </p>

              <span className={styles.cardCta}>
                <T kn="ಮುಂದುವರಿಯಿರಿ" en="ಮುಂದುವರಿಯಿರಿ" />
                <ArrowIcon />
              </span>
            </Link>
          ))}
        </div>

        {/* DEV-ROUTE + DEV-LINK: one combined target at /register-buyer. */}
        <div className={styles.registerWrap}>
          <Link href="/register-buyer" className={styles.register}>
            <span className={styles.registerKn}>
              <T
                kn="ಹೊಸ ಖರೀದಿದಾರರೇ? ನೋಂದಾಯಿಸಿ →"
                en="ಹೊಸ ಖರೀದಿದಾರರೇ? ನೋಂದಾಯಿಸಿ →"
              />
            </span>
            <span className={styles.registerEn}>
              <T kn="New buyer? Register →" en="New buyer? Register →" />
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
