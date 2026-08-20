'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/lib/language';
import styles from './Header.module.css';

type NavItem = { href: string; en: string; kn: string };

const NAV: NavItem[] = [
  { href: '/how-it-works', en: 'How It Works', kn: 'ಹೇಗೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ' },
  { href: '/buyers', en: 'For Buyers', kn: 'ಖರೀದಿದಾರರಿಗೆ' },
  { href: '/about', en: 'About', kn: 'ನಮ್ಮ ಬಗ್ಗೆ' },
  { href: '/support', en: 'Support', kn: 'ಸಹಾಯ' },
];

/** `hasCrescent` is resolved on the server; when false no <img> is rendered
 *  at all, so no broken-image icon appears. */
export default function Header({ hasCrescent }: { hasCrescent: boolean }) {
  const { lang, toggleLang } = useLanguage();
  const t = (en: string, kn: string) => (lang === 'en' ? en : kn);

  return (
    <header className={styles.header}>
      <div className={styles.shell}>
        <Link href="/" className={styles.brand}>
          {hasCrescent && (
            <Image
              src="/brand/paddy-crescent.png"
              alt="PaddyLink paddy crescent logo"
              width={74}
              height={74}
              className={styles.crescent}
              priority
            />
          )}
          <span className={styles.wordmark}>{t('PaddyLink', 'ಪ್ಯಾಡಿಲಿಂಕ್')}</span>
        </Link>

        <nav className={styles.nav}>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={styles.navLink}>
              {t(item.en, item.kn)}
            </Link>
          ))}
        </nav>

        <div className={styles.controls}>
          <button
            type="button"
            onClick={toggleLang}
            aria-label="Toggle language"
            className={styles.toggle}
          >
            <span
              className={`${styles.pill} ${lang === 'kn' ? styles.pillActive : ''}`}
            >
              ಕ
            </span>
            <span
              className={`${styles.pill} ${lang === 'en' ? styles.pillActive : ''}`}
            >
              EN
            </span>
          </button>

          <Link href="/login" className={styles.login}>
            {t('Login', 'ಪ್ರವೇಶಿಸಿ')}
          </Link>
        </div>
      </div>
    </header>
  );
}
