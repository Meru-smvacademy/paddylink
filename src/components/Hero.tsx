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
 * COPY PASS (CEO): the frame's headline, subline, caption, microphone block
 * and one trust item have all been overruled since the port. The
 * headline no longer promises a price — PaddyLink neither sets prices nor
 * runs a marketplace — the two stacked body lines collapse to one sans line,
 * the mic comes out entirely, a quiet buyer door goes in beside the gold CTA,
 * and the trust strip drops the blanket GST claim. Deviations from the frame
 * are deliberate; the frame is no longer the authority on this copy.
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
  /* KN-PENDING — the Kannada read "ಪ್ರತಿ ಖರೀದಿದಾರ GST ಪರಿಶೀಲಿತ" ("every buyer
     GST-verified"), the same claim the English just dropped. Leaving it would
     keep that claim standing in the language most of the audience reads, so
     both slots carry the new English until the Kannada is supplied. */
  { kn: 'Buyers verified before listing access', en: 'Buyers verified before listing access' },
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
        {/* Second line is gold, in both languages — the frame's treatment,
            which put the gold on the closing word. That word is now the whole
            of line two. */}
        <h1 className={styles.headline}>
          <T kn="ನಿಮ್ಮ ಭತ್ತಕ್ಕೆ ಖರೀದಿದಾರರು." en="Buyers for your paddy." />
          <br />
          <span className={styles.headlineAccent}>
            <T kn="ನೇರವಾಗಿ." en="Direct." />
          </span>
        </h1>

        {/* One subhead line in the body sans, replacing the Tiro subline and
            the Inter caption that stood under it.
            KN-PENDING — the caption this supersedes already carried the same
            English in both states (the frame's own line); the Tiro subline it
            also replaces had Kannada, but none exists for this new sentence
            and none is invented here. */}
        <p className={styles.subline}>
          <T
            kn="PaddyLink puts verified buyers in touch with farmers across Karnataka. You talk, you decide, you deal."
            en="PaddyLink puts verified buyers in touch with farmers across Karnataka. You talk, you decide, you deal."
          />
        </p>

        <div className={styles.ctaRow}>
          <Link href="/login" className={styles.ctaFarmer}>
            <T kn="ನಿಮ್ಮ ಭತ್ತ ನೋಂದಾಯಿಸಿ" en="List Your Paddy" />
          </Link>

          {/* Secondary door, deliberately quieter than the gold CTA: text only,
              no fill. /buyers is the existing buyer route — the "For Buyers"
              page the header already links, which opens the verification flow. */}
          <Link href="/buyers" className={styles.ctaBuyer}>
            <T kn="ನಾನು ಖರೀದಿದಾರ →" en="I'm a buyer →" />
          </Link>
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
