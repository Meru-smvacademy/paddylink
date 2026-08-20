import Image from 'next/image';
import Link from 'next/link';
import T from './T';
import styles from './Hero.module.css';

/**
 * Home hero — ported from Figma Make frame Vq0BfMfMUhkvcu9bKxXhDy.
 *
 * The frame carries its own fixed header; per brief that part is ignored and
 * this mounts under the approved site header instead.
 *
 * The frame has no English state for the headline, subline, CTAs, mic label or
 * badge — it is Kannada-only. Per instruction, <T> receives the same Kannada
 * string for both languages rather than inventing English copy. The one
 * genuinely English string in the frame (the caption) and the buyer CTA's
 * "Register as Buyer" sub-label are used verbatim.
 */
export default function Hero() {
  return (
    <section className={styles.hero}>
      <Image
        src="/hero/field.webp"
        alt="Vast golden paddy field stretching to the horizon with the sun setting over it"
        fill
        priority
        sizes="100vw"
        className={styles.photo}
      />

      {/* Overlay stack, in the frame's order */}
      <div className={`${styles.layer} ${styles.scrimLeft}`} />
      <div className={`${styles.layer} ${styles.skyAmplifier}`} />
      <div className={`${styles.layer} ${styles.goldenGlow}`} />
      <div className={`${styles.layer} ${styles.horizonBurn}`} />
      <div className={`${styles.layer} ${styles.hillLight}`} />
      <div className={`${styles.layer} ${styles.bottomVignette}`} />
      <div className={styles.headerFade} />

      <div className={styles.content}>
        <div className={styles.textScrim} />

        <h1 className={styles.headline}>
          <T kn="ನಿಮ್ಮ ಭತ್ತ," en="ನಿಮ್ಮ ಭತ್ತ," />
          <br />
          <span className={styles.headlineAccent}>
            <T kn="ನಿಮ್ಮ ಬೆಲೆ." en="ನಿಮ್ಮ ಬೆಲೆ." />
          </span>
        </h1>

        <p className={styles.subline}>
          <T
            kn="ನೇರ ಖರೀದಿದಾರರೊಂದಿಗೆ ನಿಮ್ಮ ಸುಗ್ಗಿಯನ್ನು ಸಂಪರ್ಕಿಸಿ."
            en="ನೇರ ಖರೀದಿದಾರರೊಂದಿಗೆ ನಿಮ್ಮ ಸುಗ್ಗಿಯನ್ನು ಸಂಪರ್ಕಿಸಿ."
          />
        </p>

        <p className={styles.caption}>
          <T
            kn="PaddyLink connects farmers directly with verified buyers across Karnataka — you talk, you decide, you deal."
            en="PaddyLink connects farmers directly with verified buyers across Karnataka — you talk, you decide, you deal."
          />
        </p>

        <div className={styles.ctaRow}>
          <Link href="/login" className={styles.ctaFarmer}>
            <T kn="ನಿಮ್ಮ ಭತ್ತ ನೋಂದಾಯಿಸಿ" en="ನಿಮ್ಮ ಭತ್ತ ನೋಂದಾಯಿಸಿ" />
          </Link>

          <Link href="/buyers" className={styles.ctaBuyer}>
            <T kn="ಖರೀದಿದಾರರಾಗಿ ನೋಂದಾಯಿಸಿ" en="ಖರೀದಿದಾರರಾಗಿ ನೋಂದಾಯಿಸಿ" />
            <br />
            <span className={styles.ctaBuyerSub}>
              <T kn="Register as Buyer" en="Register as Buyer" />
            </span>
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
                <rect x="9" y="2" width="6" height="12" rx="3" fill="white" />
                <path d="M5 11a7 7 0 0 0 14 0" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="12" y1="18" x2="12" y2="22" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="8" y1="22" x2="16" y2="22" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>

            <div className={styles.voiceBadge}>
              <T kn="ಶೀಘ್ರದಲ್ಲಿ · Soon" en="ಶೀಘ್ರದಲ್ಲಿ · Soon" />
            </div>

            <span className={styles.voiceLabel}>
              <T kn="ಧ್ವನಿ ನೋಂದಣಿ" en="ಧ್ವನಿ ನೋಂದಣಿ" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
