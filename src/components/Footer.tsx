import Image from 'next/image';
import Link from 'next/link';
import T from './T';
import styles from './Footer.module.css';

/**
 * Site footer — ported from Figma Make file KHTmHHpRF4tRwZJoVKKAwh
 * (src/App.tsx), replacing the earlier four-column footer.
 *
 * Two rows split by a hairline: brand · legal links · contact above,
 * company/CIN/copyright, address and the two disclaimers below.
 *
 * LANGUAGE: the frame prints both languages at once — a Kannada link row
 * above an English one, and a Kannada disclaimer above its English twin —
 * and has no toggle of its own. That stack is preserved and the ಕ|EN
 * control does not change it, matching the ruling on /how-it-works, so
 * every <T> carries the same string in both slots.
 *
 * The frame's logo is the parked burst crest (logo_png_paddy_link_v8.png),
 * originally dropped into the frame's 46x46 cream tile. That tile was there
 * to give the old light-needing crescent a ground; the official lockup needs
 * no ground of its own, so the wrapper is gone and the logo sits directly on
 * the footer. Marked TILE-REMOVED below.
 *
 * The frame leaves every legal href as "#"; the real routes are wired here
 * per brief. Marked HREF-WIRED below.
 */

const LEGAL = [
  { kn: 'ನಿಯಮಗಳು', en: 'Terms', href: '/terms' },
  { kn: 'ಗೌಪ್ಯತೆ', en: 'Privacy', href: '/privacy' },
  { kn: 'ಮರುಪಾವತಿ', en: 'Refunds', href: '/refund-policy' },
  { kn: 'ಕುಂದುಕೊರತೆ', en: 'Grievance', href: '/support#grievance' },
]; // HREF-WIRED — all four are "#" in the frame.

function LinkRow({ lang }: { lang: 'kn' | 'en' }) {
  return (
    <div className={styles.linkRow}>
      {LEGAL.map((item, i) => {
        const label = lang === 'kn' ? item.kn : item.en;
        return (
          <span key={item.href} className={styles.linkItem}>
            <Link
              href={item.href}
              lang={lang}
              className={`${styles.link} ${lang === 'kn' ? styles.linkKn : styles.linkEn}`}
            >
              <T kn={label} en={label} />
            </Link>
            {i < LEGAL.length - 1 && (
              <span aria-hidden="true" className={styles.sep}>
                ·
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        {/* ── Row 1: brand · links · contact ── */}
        <div className={styles.top}>
          <Link href="/" className={styles.brand} aria-label="PaddyLink">
            {/* TILE-REMOVED — the white/gold cut is drawn for a dark ground, so
                it sits straight on the footer's --gadde-950. The frame's 46x46
                cream tile existed for the old crescent and is obsolete.
                The lockup carries the wordmark, so the text <span> beside it
                is gone. */}
            <Image
              src="/brand/paddylink-logo-dark.png"
              alt="PaddyLink"
              width={1700}
              height={900}
              className={styles.logoImg}
            />
          </Link>

          <div className={styles.links}>
            <LinkRow lang="kn" />
            <LinkRow lang="en" />
          </div>

          <div className={styles.contact}>
            <a href="tel:+917483759960" className={styles.phone}>
              +91 74837 59960
            </a>
            <a href="mailto:founder@kalbantt.in" className={styles.email}>
              founder@kalbantt.in
            </a>
          </div>
        </div>

        <div className={styles.hairline} />

        {/* ── Row 2: address block ── */}
        <div className={styles.legal}>
          <div className={styles.meta}>
            <span className={styles.company}>
              <T
                kn="Kalbantt Tech OPC Private Limited"
                en="Kalbantt Tech OPC Private Limited"
              />
            </span>
            <span aria-hidden="true" className={styles.metaDot}>
              ·
            </span>
            <span className={styles.cin}>
              <T kn="CIN: U85500KA2026OPC224772" en="CIN: U85500KA2026OPC224772" />
            </span>
            <span aria-hidden="true" className={styles.metaDot}>
              ·
            </span>
            <span className={styles.copyright}>
              <T
                kn="© 2026 Kalbantt Tech OPC Pvt Ltd"
                en="© 2026 Kalbantt Tech OPC Pvt Ltd"
              />
            </span>
          </div>

          <div className={styles.address}>
            <T
              kn="Unit 101, Oxford Towers, 139/88 Old Airport Road, Kodihalli, Bangalore, Karnataka 560008"
              en="Unit 101, Oxford Towers, 139/88 Old Airport Road, Kodihalli, Bangalore, Karnataka 560008"
            />
          </div>

          <div className={styles.disclaimerKn} lang="kn">
            <T
              kn="PaddyLink ಮಾಹಿತಿ ಮತ್ತು ಸಂಪರ್ಕ ಸೇವೆ ಮಾತ್ರ — ವ್ಯವಹಾರಗಳು ರೈತರು ಮತ್ತು ಖರೀದಿದಾರರ ನಡುವೆ ನೇರ."
              en="PaddyLink ಮಾಹಿತಿ ಮತ್ತು ಸಂಪರ್ಕ ಸೇವೆ ಮಾತ್ರ — ವ್ಯವಹಾರಗಳು ರೈತರು ಮತ್ತು ಖರೀದಿದಾರರ ನಡುವೆ ನೇರ."
            />
          </div>

          <div className={styles.disclaimerEn} lang="en">
            <T
              kn="PaddyLink is an information and connection service only — transactions are directly between farmers and buyers."
              en="PaddyLink is an information and connection service only — transactions are directly between farmers and buyers."
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
