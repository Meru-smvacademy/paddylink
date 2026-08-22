import Link from 'next/link';
import T from './T';
import cta from './Cta.module.css';
import styles from './HomeSections.module.css';

/**
 * Home middle sections — ported from Figma Make file Vq0BfMfMUhkvcu9bKxXhDy
 * (src/App.tsx). These are the two sections the frame places between the
 * hero's trust strip and the footer; the hero above is untouched.
 *
 * LANGUAGE: the frame prints both languages at once — Kannada lines with a
 * smaller English line beneath — and its own ಕ|EN toggle is inert. That stack
 * is preserved and the site toggle does not flip it, matching the ruling on
 * /how-it-works, so every <T> carries the same string in both slots.
 *
 * Destinations: the frame's gold CTA is a bare <button> with no target and
 * its text link points at the in-page anchor "#how". Per brief these go to
 * /login and /how-it-works. Marked DEST below. The frame's id="how" on the
 * pillar section is kept as designed even though nothing now targets it.
 *
 * An earlier revision of this frame closed with its own footer block
 * (crescent, wordmark, "© 2025 PaddyLink"). The frame has since removed it,
 * so there is nothing to drop and the pillars meet the site footer directly —
 * both gadde-950, no divider.
 */

const PILLARS = [
  {
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
        <circle cx="22" cy="22" r="20" stroke="var(--bhatta-400)" strokeWidth="1.5" opacity="0.3" />
        <path
          d="M14 22l5 5 11-11"
          stroke="var(--bhatta-400)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    kn: 'ಪರಿಶೀಲಿತ ಖರೀದಿದಾರರು',
    en: 'Verified buyers',
    line: 'ಪ್ರತಿ ಖರೀದಿದಾರರ GST-PAN ಪರಿಶೀಲಿತ',
    lineEn: "every buyer's GST & PAN checked",
  },
  {
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
        <circle cx="22" cy="22" r="20" stroke="var(--bhatta-400)" strokeWidth="1.5" opacity="0.3" />
        <path
          d="M22 12v4M22 28v4M12 22h4M28 22h4"
          stroke="var(--bhatta-400)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="22" cy="22" r="5" stroke="var(--bhatta-400)" strokeWidth="2" />
      </svg>
    ),
    kn: 'ಗುಣಮಟ್ಟ ಬ್ಯಾಡ್ಜ್',
    en: 'Quality badge',
    line: 'ಕಟಾವಿನಲ್ಲಿ ಉಚಿತ ತೇವಾಂಶ ಪರಿಶೀಲನೆ, ಮೌಲ್ಯ ನಿಮ್ಮ ಪಟ್ಟಿಯಲ್ಲಿ',
    lineEn: 'free moisture check at harvest, value on your listing',
  },
  {
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
        <circle cx="22" cy="22" r="20" stroke="var(--bhatta-400)" strokeWidth="1.5" opacity="0.3" />
        <rect x="15" y="17" width="14" height="10" rx="2" stroke="var(--bhatta-400)" strokeWidth="2" />
        <path
          d="M19 17v-2a3 3 0 0 1 6 0v2"
          stroke="var(--bhatta-400)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    kn: 'ಒಂದು ನಿಯಮ',
    en: 'One rule',
    line: 'ಪಾವತಿ ಮೊದಲು, ನಂತರ ಭತ್ತ',
    lineEn: 'payment first, then paddy',
  },
];

export default function HomeSections() {
  return (
    <>
      {/* ── Section 1: message card on cream ── */}
      <section className={styles.messageSection}>
        <div className={styles.card}>
          <p className={styles.cardLine1}>
            <T kn="ಜಗತ್ತಿನ ರೈತನ ಕೈಯಲ್ಲಿ ಮಾಹಿತಿ ಇದೆ." en="ಜಗತ್ತಿನ ರೈತನ ಕೈಯಲ್ಲಿ ಮಾಹಿತಿ ಇದೆ." />
            <br />
            <T kn="ನಮ್ಮ ಕೈಯಲ್ಲಿ ಏಕಿಲ್ಲ?" en="ನಮ್ಮ ಕೈಯಲ್ಲಿ ಏಕಿಲ್ಲ?" />
          </p>

          <p className={styles.cardLine2}>
            <T
              kn="ದುಡಿಮೆಯಲ್ಲಿ ನಾವು ಯಾರಿಗೂ ಕಡಿಮೆ ಇಲ್ಲ."
              en="ದುಡಿಮೆಯಲ್ಲಿ ನಾವು ಯಾರಿಗೂ ಕಡಿಮೆ ಇಲ್ಲ."
            />
            <br />
            <T kn="ಇನ್ನು ಮಾಹಿತಿಯಲ್ಲೂ ಇಲ್ಲ." en="ಇನ್ನು ಮಾಹಿತಿಯಲ್ಲೂ ಇಲ್ಲ." />
          </p>

          <p className={styles.cardLine3}>
            <T kn="ನಿಮ್ಮ ಭತ್ತ," en="ನಿಮ್ಮ ಭತ್ತ," />{' '}
            <span className={styles.cardAccent}>
              <T kn="ನಿಮ್ಮ ಬೆಲೆ." en="ನಿಮ್ಮ ಬೆಲೆ." />
            </span>{' '}
            <T kn="ನೋಂದಣಿ ಉಚಿತ." en="ನೋಂದಣಿ ಉಚಿತ." />
          </p>

          <p className={styles.cardEn}>
            <T
              kn="The world's farmer has information in his hand. Why not ours? Your paddy, your price. Registration free."
              en="The world's farmer has information in his hand. Why not ours? Your paddy, your price. Registration free."
            />
          </p>
        </div>

        <div className={styles.ctaRow}>
          {/* DEST — bare <button> in the frame; per brief this goes to /login. */}
          <Link href="/login" className={cta.gold}>
            <T kn="ನಿಮ್ಮ ಭತ್ತ ನೋಂದಾಯಿಸಿ" en="ನಿಮ್ಮ ಭತ್ತ ನೋಂದಾಯಿಸಿ" />
            <span className={cta.goldEn}>
              <T kn="/ List Your Paddy" en="/ List Your Paddy" />
            </span>
          </Link>

          {/* DEST — href="#how" in the frame; per brief this goes to /how-it-works. */}
          <Link href="/how-it-works" className={cta.link}>
            <T kn="ಹೇಗೆ ನಡೆಯುತ್ತದೆ →" en="ಹೇಗೆ ನಡೆಯುತ್ತದೆ →" />
            <span className={cta.linkEn}>
              <T kn="How it works →" en="How it works →" />
            </span>
          </Link>
        </div>
      </section>

      {/* ── Section 2: dark pillar band ── */}
      <section id="how" className={styles.pillarSection}>
        <div className={styles.pillarGrid}>
          {PILLARS.map((p) => (
            <div key={p.kn} className={styles.pillar}>
              <div>{p.icon}</div>

              <div>
                <p className={styles.pillarKn}>
                  <T kn={p.kn} en={p.kn} />
                </p>
                <p className={styles.pillarEn}>
                  <T kn={p.en} en={p.en} />
                </p>
              </div>

              <div className={styles.pillarDetail}>
                <p className={styles.pillarLine}>
                  <T kn={p.line} en={p.line} />
                </p>
                <p className={styles.pillarLineEn}>
                  <T kn={p.lineEn} en={p.lineEn} />
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cream band between the dark pillar section and the dark footer.
          Empty and decorative — see .separator in the stylesheet. */}
      <div className={styles.separator} aria-hidden="true" />
    </>
  );
}
