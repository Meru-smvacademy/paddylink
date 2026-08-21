import T from './T';
import styles from './About.module.css';

/**
 * About — ported from Figma Make file b7llkwYtWHD4leB751w7HN
 * (src/components/AboutPage.tsx).
 *
 * That Make file also carries the old four-column footer, which the footer
 * from KHTmHHpRF4tRwZJoVKKAwh has superseded. Only the About content is
 * ported; the site footer sits beneath this, untouched.
 *
 * LANGUAGE: the frame prints both languages at once — a large Kannada line
 * over a small English one throughout — and has no toggle of its own. That
 * stack is preserved and the ಕ|EN control does not flip it, matching the
 * ruling on /how-it-works, so every <T> carries the same string in both
 * slots.
 *
 * The frame centres the article vertically in a full-screen field. Kept as
 * designed; under the real header and footer this renders as a tall page
 * with the text floating mid-viewport. Flagged, not changed.
 *
 * There is no imagery in this frame — the 🌾 list bullet is an emoji,
 * marked aria-hidden as the frame marks it.
 */

const GRAIN_BULLET = '🌾';

const stats: { kn: string; en: string | null }[] = [
  { kn: 'ರೈತರಿಗೆ ಸದಾ ಉಚಿತ', en: 'Free for farmers, always' },
  { kn: 'ಪ್ರತಿ ಖರೀದಿದಾರ ಪರಿಶೀಲಿತ', en: 'Every buyer verified' },
  // The frame gives this third item no English line.
  { kn: 'ರಾಯಚೂರು · ಕೊಪ್ಪಳ · ಯಾದಗಿರಿ', en: null },
];

export default function About() {
  return (
    <main className={styles.page}>
      <article className={styles.article}>
        {/* Eyebrow pill */}
        <div className={styles.eyebrowWrap}>
          <span className={styles.eyebrow}>
            <T kn="ನಮ್ಮ ಬಗ್ಗೆ" en="ನಮ್ಮ ಬಗ್ಗೆ" />
            <span className={styles.eyebrowDivider} aria-hidden="true" />
            <span className={styles.eyebrowEn}>
              <T kn="About" en="About" />
            </span>
          </span>
        </div>

        {/* Heading — Kannada large, English small italic beneath */}
        <h1 className={styles.heading}>
          <span className={styles.headingKn}>
            <T kn="ರೈತರ ಕೈಗೆ ನೇರ ಸಂಪರ್ಕ" en="ರೈತರ ಕೈಗೆ ನೇರ ಸಂಪರ್ಕ" />
          </span>
          <span className={styles.headingEn}>
            <T
              kn="Direct connection, in farmers' hands"
              en="Direct connection, in farmers' hands"
            />
          </span>
        </h1>

        <div className={styles.rule} />

        {/* Body — neutrality disclaimer, built verbatim per CEO ruling */}
        <div className={styles.body}>
          <p className={styles.bodyKn}>
            <T
              kn="PaddyLink ಕರ್ನಾಟಕದ ಭತ್ತದ ಬೆಲ್ಟ್‌ನ ರೈತರನ್ನು ಪರಿಶೀಲಿತ ಖರೀದಿದಾರರೊಂದಿಗೆ ನೇರವಾಗಿ ಸಂಪರ್ಕಿಸುವ ವೇದಿಕೆ. ನಾವು ಖರೀದಿ-ಮಾರಾಟ ಮಾಡುವುದಿಲ್ಲ, ಕಮಿಷನ್ ಇಲ್ಲ, ಬೆಲೆ ನಿಗದಿ ಇಲ್ಲ — ಸಂಪರ್ಕ ಮಾತ್ರ. ವ್ಯವಹಾರ ಸಂಪೂರ್ಣ ನಿಮ್ಮದು."
              en="PaddyLink ಕರ್ನಾಟಕದ ಭತ್ತದ ಬೆಲ್ಟ್‌ನ ರೈತರನ್ನು ಪರಿಶೀಲಿತ ಖರೀದಿದಾರರೊಂದಿಗೆ ನೇರವಾಗಿ ಸಂಪರ್ಕಿಸುವ ವೇದಿಕೆ. ನಾವು ಖರೀದಿ-ಮಾರಾಟ ಮಾಡುವುದಿಲ್ಲ, ಕಮಿಷನ್ ಇಲ್ಲ, ಬೆಲೆ ನಿಗದಿ ಇಲ್ಲ — ಸಂಪರ್ಕ ಮಾತ್ರ. ವ್ಯವಹಾರ ಸಂಪೂರ್ಣ ನಿಮ್ಮದು."
            />
          </p>
          <p className={styles.bodyEn}>
            <T
              kn="PaddyLink connects farmers of Karnataka's rice belt directly with verified buyers. We don't buy or sell, take no commission, and never set prices — we only connect. The deal is entirely yours."
              en="PaddyLink connects farmers of Karnataka's rice belt directly with verified buyers. We don't buy or sell, take no commission, and never set prices — we only connect. The deal is entirely yours."
            />
          </p>
        </div>

        {/* Stats */}
        <ul className={styles.stats}>
          {stats.map((s) => (
            <li key={s.kn} className={styles.stat}>
              <span className={styles.statBullet} aria-hidden="true">
                {GRAIN_BULLET}
              </span>
              <div>
                <span className={styles.statKn}>
                  <T kn={s.kn} en={s.kn} />
                </span>
                {s.en && (
                  <span className={styles.statEn}>
                    <T kn={s.en} en={s.en} />
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* Closing line */}
        <p className={styles.closing}>
          <T
            kn="Kalbantt Tech OPC Pvt Ltd ನ ಒಂದು ಉಪಕ್ರಮ"
            en="Kalbantt Tech OPC Pvt Ltd ನ ಒಂದು ಉಪಕ್ರಮ"
          />{' '}
          <span className={styles.closingSlash}>/</span>{' '}
          <span className={styles.closingEn}>
            <T
              kn="An initiative of Kalbantt Tech OPC Pvt Ltd."
              en="An initiative of Kalbantt Tech OPC Pvt Ltd."
            />
          </span>
        </p>
      </article>
    </main>
  );
}
