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
 * The frame's logo is the parked burst crest (logo_png_paddy_link_v8.png);
 * per brief the official sheaf is dropped into the same 46x46 cream tile
 * at the frame's 38x38 inner size. Marked LOGO-SUB below.
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
          <Link href="/" className={styles.brand}>
            <span className={styles.logoTile}>
              {/* LOGO-SUB — official paddy sheaf in place of the frame's burst crest. */}
              <Image
                src="/brand/paddy-sheaf.png"
                alt="PaddyLink paddy sheaf"
                width={38}
                height={38}
                className={styles.logoImg}
              />
            </span>
            <span className={styles.wordmark}>PaddyLink</span>
          </Link>

          <div className={styles.links}>
            <LinkRow lang="kn" />
            <LinkRow lang="en" />
          </div>

          <div className={styles.contact}>
            <a href="tel:+919108540960" className={styles.phone}>
              +91 91085 40960
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
