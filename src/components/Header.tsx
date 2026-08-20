'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/lib/language';
import styles from './Header.module.css';

type NavItem = { href: string; en: string; kn: string };

const NAV: NavItem[] = [
  { href: '/how-it-works', en: 'How It Works', kn: 'ಹೇಗೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ' },
  { href: '/about', en: 'About', kn: 'ನಮ್ಮ ಬಗ್ಗೆ' },
  { href: '/support', en: 'Support', kn: 'ಬೆಂಬಲ' },
];

export default function Header() {
  const { lang, toggleLang } = useLanguage();

  return (
    <header className={styles.header}>
      <div className={styles.shell}>
        <Link href="/" className={styles.brand}>
          <Image
            src="/brand/paddy-crescent.png"
            alt="PaddyLink paddy crescent logo"
            width={74}
            height={74}
            className={styles.crescent}
            priority
          />
          <span className={styles.wordmark}>
            {lang === 'en' ? 'PaddyLink' : 'ಪ್ಯಾಡಿಲಿಂಕ್'}
          </span>
        </Link>

        <nav className={styles.nav}>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={styles.navLink}>
              {lang === 'en' ? item.en : item.kn}
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
        </div>
      </div>
    </header>
  );
}
