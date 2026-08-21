import Link from 'next/link';
import styles from './Footer.module.css';

/**
 * Site footer — ported from Figma Make frame b7llkwYtWHD4leB751w7HN.
 * Only the footer block from that file is in scope; the About page above
 * it was not read or used.
 *
 * The frame renders Kannada and English together for every link, so the
 * footer does not respond to the ಕ|EN toggle. That is the design.
 */

const infoLinks = [
  { kn: 'ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ', label: 'How It Works', href: '/how-it-works' },
  { kn: 'ಖರೀದಿದಾರರಿಗೆ', label: 'For Buyers', href: '/buyers' },
  { kn: 'ನಮ್ಮ ಬಗ್ಗೆ', label: 'About', href: '/about' },
  { kn: 'ಸಹಾಯ', label: 'Support', href: '/support' },
];

const legalLinks: { kn: string; en: string; href: string; note?: string }[] = [
  { kn: 'ನಿಯಮಗಳು ಮತ್ತು ಷರತ್ತುಗಳು', en: 'Terms & Conditions', href: '/terms' },
  { kn: 'ಗೌಪ್ಯತಾ ನೀತಿ', en: 'Privacy Policy', href: '/privacy' },
  { kn: 'ಮರುಪಾವತಿ ನೀತಿ', en: 'Refund Policy', href: '/refund-policy' },
  {
    kn: 'ಕುಂದುಕೊರತೆ ಅಧಿಕಾರಿ',
    en: 'Grievance Officer',
    href: 'mailto:founder@kalbantt.in',
    note: 'founder@kalbantt.in',
  },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.columns}>
        {/* Col 1 — Brand */}
        <div>
          <div className={styles.brand}>
            <svg width="30" height="30" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <circle cx="14" cy="14" r="12" fill="#2A5C42" />
              <path d="M18 8a8 8 0 1 0 0 12A6 6 0 1 1 18 8z" fill="#C5963A" />
              <circle cx="18.5" cy="9.5" r="1.25" fill="#D9B26A" />
            </svg>
            <span className={styles.wordmark}>PaddyLink</span>
          </div>
          <p className={styles.tagline}>
            ರೈತ ಸಂಪರ್ಕ · ಪರಿಶೀಲಿತ ಖರೀದಿದಾರರು · ನೇರ ವ್ಯವಹಾರ
          </p>
        </div>

        {/* Col 2 — Information */}
        <div>
          <p className={styles.heading}>
            ಮಾಹಿತಿ <span className={styles.headingSub}>/ Information</span>
          </p>
          <ul className={`${styles.list} ${styles.listInfo}`}>
            {infoLinks.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className={styles.link}>
                  <span className={styles.knLabel}>{link.kn}</span>
                  <span className={styles.enLabel}>{link.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3 — Legal */}
        <div>
          <p className={styles.heading}>
            ಕಾನೂನು <span className={styles.headingSub}>/ Legal</span>
          </p>
          <ul className={`${styles.list} ${styles.listLegal}`}>
            {legalLinks.map((link) => (
              <li key={link.en}>
                {link.href.startsWith('mailto:') ? (
                  <a href={link.href} className={styles.link}>
                    <span className={styles.knLabel}>{link.kn}</span>
                    <span className={styles.enLabel}>{link.en}</span>
                    {link.note && <span className={styles.note}>{link.note}</span>}
                  </a>
                ) : (
                  <Link href={link.href} className={styles.link}>
                    <span className={styles.knLabel}>{link.kn}</span>
                    <span className={styles.enLabel}>{link.en}</span>
                    {link.note && <span className={styles.note}>{link.note}</span>}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Col 4 — Contact */}
        <div>
          <p className={styles.heading}>
            ಸಂಪರ್ಕ <span className={styles.headingSub}>/ Contact</span>
          </p>
          <div className={styles.contact}>
            <div>
              <span className={styles.phone}>+91 91085 40960</span>
              <span className={styles.hours}>
                Mon–Sat, 10am–6pm
                <br />
                Call / WhatsApp
              </span>
            </div>
            <div>
              <span className={styles.email}>founder@kalbantt.in</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className={styles.bottomBar}>
        <p className={styles.legalText}>
          Kalbantt Tech OPC Private Limited · CIN: U85500KA2026OPC224772
          <br />
          Registered Office: Unit 101, Oxford Towers, 139/88 Old Airport Road,
          Kodihalli, Bangalore, Karnataka, India – 560008
          <br />
          © 2026 Kalbantt Tech OPC Pvt Ltd.{' '}
          <span className={styles.legalKn}>
            PaddyLink ಮಾಹಿತಿ ಮತ್ತು ಸಂಪರ್ಕ ಸೇವೆ ಮಾತ್ರ — ವ್ಯವಹಾರಗಳು ರೈತರು ಮತ್ತು
            ಖರೀದಿದಾರರ ನಡುವೆ ನೇರವಾಗಿ ನಡೆಯುತ್ತವೆ.
          </span>{' '}
          / PaddyLink is an information and connection service only — transactions
          happen directly between farmers and buyers.
        </p>
      </div>
    </footer>
  );
}
