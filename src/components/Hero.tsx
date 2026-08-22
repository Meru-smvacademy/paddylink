import Image from 'next/image';
import Link from 'next/link';
import T from './T';
import styles from './Hero.module.css';

/**
 * Home hero — ported fresh from Figma Make file Vq0BfMfMUhkvcu9bKxXhDy
 * (src/App.tsx), replacing an earlier port of an older revision of the same
 * frame (navy scrims, green CTA, buyer button, badge over the mic).
 *
 * The frame carries its own fixed header; per brief that part is ignored and
 * this mounts under the site header, which goes transparent over the hero at
 * the top of the home route.
 *
 * LANGUAGE: the frame is Kannada-only — it holds `lang` state and renders
 * ಕ|EN buttons, but no string reads that state, so the frame's own toggle is
 * inert. The English strings below are the approved CEO addition, not frame
 * content; each is marked EN-ADDED. The one genuinely English string in the
 * frame (the Inter paragraph) is used verbatim and is identical in both
 * states, as instructed.
 */

/* Gold paddy grain separator between trust items. Frame draws this inline. */
function GrainMark() {
  return (
    <svg
      width="10"
      height="20"
      viewBox="0 0 10 20"
      fill="none"
      aria-hidden="true"
      className={styles.grain}
    >
      <ellipse cx="5" cy="12" rx="3.2" ry="6.5" fill="var(--bhatta-400)" opacity="0.6" />
      <path
        d="M5 5.5 L5 2"
        stroke="var(--bhatta-400)"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}

const TRUST: { kn: string; en: string }[] = [
  // EN-ADDED on each `en` below.
  { kn: 'ರೈತರಿಗೆ ಸದಾ ಉಚಿತ', en: 'Free for farmers, always' },
  { kn: 'ಪ್ರತಿ ಖರೀದಿದಾರ GST ಪರಿಶೀಲಿತ', en: 'Every buyer GST-verified' },
  { kn: 'ಕರ್ನಾಟಕದ ಭತ್ತದ ನಾಡಿನಲ್ಲಿ', en: "Across Karnataka's rice belt" },
];

export default function Hero() {
  return (
    <section className={styles.hero}>
      <Image
        src="/hero/field.webp"
        alt="Vast golden paddy field stretching to the horizon at sunset"
        fill
        priority
        sizes="100vw"
        className={styles.photo}
      />

      {/* Overlay stack, in the frame's order */}
      <div className={`${styles.layer} ${styles.scrimLeft}`} />
      <div className={`${styles.layer} ${styles.bottomVignette}`} />
      <div className={styles.headerFade} />
      <div className={`${styles.layer} ${styles.skyAmplifier}`} />
      <div className={`${styles.layer} ${styles.goldenGlow}`} />
      <div className={`${styles.layer} ${styles.horizonBurn}`} />
      <div className={`${styles.layer} ${styles.hillLight}`} />

      <div className={styles.content}>
        {/* Only the final word is gold, in both languages. */}
        <h1 className={styles.headline}>
          <T kn="ನಿಮ್ಮ ಭತ್ತ," en="Your paddy," />
          <br />
          <T kn="ನಿಮ್ಮ " en="your " />
          <span className={styles.headlineAccent}>
            <T kn="ಬೆಲೆ." en="price." />
          </span>
        </h1>

        <p className={styles.subline}>
          <T
            kn="ನೇರ ಖರೀದಿದಾರರೊಂದಿಗೆ ನಿಮ್ಮ ಸುಗ್ಗಿಯನ್ನು ಸಂಪರ್ಕಿಸಿ."
            en="Connect your harvest with direct buyers."
          />
        </p>

        {/* The frame's own English line — same string in both states. */}
        <p className={styles.caption}>
          <T
            kn="PaddyLink connects farmers directly with verified buyers across Karnataka — you talk, you decide, you deal."
            en="PaddyLink connects farmers directly with verified buyers across Karnataka — you talk, you decide, you deal."
          />
        </p>

        <div className={styles.ctaRow}>
          <Link href="/login" className={styles.ctaFarmer}>
            <T kn="ನಿಮ್ಮ ಭತ್ತ ನೋಂದಾಯಿಸಿ" en="List Your Paddy" />
          </Link>

          {/* Voice listing — rendered as designed, deliberately non-functional. */}
          <div className={styles.voiceWrap}>
            <button
              type="button"
              className={styles.voiceButton}
              title="Voice listing"
              aria-disabled="true"
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="9" y="2" width="6" height="12" rx="3" fill="var(--bhatta-400)" />
                <path
                  d="M5 11a7 7 0 0 0 14 0"
                  stroke="var(--bhatta-400)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <line
                  x1="12"
                  y1="18"
                  x2="12"
                  y2="22"
                  stroke="var(--bhatta-400)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <line
                  x1="8"
                  y1="22"
                  x2="16"
                  y2="22"
                  stroke="var(--bhatta-400)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Caption sits to the RIGHT of the mic, two stacked lines. */}
            <div className={styles.voiceCaption}>
              <span className={styles.voiceLabel}>
                <T kn="ಧ್ವನಿ ನೋಂದಣಿ" en="Voice listing" />
              </span>
              <span className={styles.voiceSoon}>
                <T kn="ಶೀಘ್ರದಲ್ಲಿ" en="Coming soon" />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.trust}>
        {TRUST.map((item, i) => (
          <div key={item.kn} className={styles.trustItem}>
            <span className={styles.trustText}>
              <T kn={item.kn} en={item.en} />
            </span>
            {i < TRUST.length - 1 && <GrainMark />}
          </div>
        ))}
      </div>
    </section>
  );
}
