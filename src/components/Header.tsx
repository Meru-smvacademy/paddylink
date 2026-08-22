'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/lib/language';
import styles from './Header.module.css';

type NavItem = { href: string; en: string; kn: string };

const NAV: NavItem[] = [
  { href: '/how-it-works', en: 'How It Works', kn: 'ಹೇಗೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ' },
  { href: '/buyers', en: 'For Buyers', kn: 'ಖರೀದಿದಾರರಿಗೆ' },
  { href: '/about', en: 'About', kn: 'ನಮ್ಮ ಬಗ್ಗೆ' },
  { href: '/support', en: 'Support', kn: 'ಸಹಾಯ' },
];

const MOBILE_MAX = 767;

/* Distance scrolled before the home-route header trades its transparent
   overlay for the cream bar. The frame does not specify a threshold — it has
   no scroll state at all — so this is the one judgement call in the port;
   24px is far enough not to flicker on trackpad jitter. */
const SCROLL_SWAP = 24;

/** `hasMark` is resolved on the server; when false no <img> is rendered
 *  at all, so no broken-image icon appears. */
export default function Header({ hasMark }: { hasMark: boolean }) {
  const { lang, toggleLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  /* The header is a transparent fixed overlay across the top of the home
     hero, and the cream bar everywhere else — including on home once the
     hero has been scrolled past. */
  const isHome = usePathname() === '/';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setScrolled(window.scrollY > SCROLL_SWAP);
    onScroll(); // a reload part-way down the page must not start transparent
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  const overHero = isHome && !scrolled && !open;

  const t = (en: string, kn: string) => (lang === 'en' ? en : kn);
  const close = useCallback(() => setOpen(false), []);

  /* Escape, outside pointer, tab trap, and closing if the viewport grows
     past the mobile breakpoint while the drawer is open. */
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        return;
      }
      if (e.key !== 'Tab') return;
      const drawer = drawerRef.current;
      if (!drawer) return;
      const items = Array.from(
        drawer.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !drawer.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (drawerRef.current?.contains(target)) return;
      if (hamburgerRef.current?.contains(target)) return;
      close();
    };

    const onResize = () => {
      if (window.innerWidth > MOBILE_MAX) close();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', onResize);
    };
  }, [open, close]);

  /* Lock body scroll while the drawer is open. */
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  /* Focus into the drawer on open; back to the hamburger on close. */
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      drawerRef.current?.querySelector<HTMLElement>('a[href]')?.focus();
    } else if (wasOpen.current) {
      wasOpen.current = false;
      hamburgerRef.current?.focus();
    }
  }, [open]);

  const langToggle = (
    <button
      type="button"
      onClick={toggleLang}
      aria-label="Toggle language"
      className={styles.toggle}
    >
      <span className={`${styles.pill} ${lang === 'kn' ? styles.pillActive : ''}`}>
        ಕ
      </span>
      <span className={`${styles.pill} ${lang === 'en' ? styles.pillActive : ''}`}>
        EN
      </span>
    </button>
  );

  return (
    <header
      className={[
        styles.header,
        isHome ? styles.overlay : '',
        overHero ? styles.transparent : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={styles.shell}>
        <Link href="/" className={styles.brand}>
          {hasMark && (
            <Image
              src="/brand/paddy-sheaf.png"
              alt="PaddyLink paddy sheaf logo"
              width={74}
              height={74}
              className={styles.mark}
              priority
            />
          )}
          <span className={styles.wordmark}>{t('PaddyLink', 'ಪ್ಯಾಡಿಲಿಂಕ್')}</span>
        </Link>

        {/* Desktop + tablet nav; hidden below 768px, where it moves into the drawer. */}
        <nav className={styles.nav}>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={styles.navLink}>
              {t(item.en, item.kn)}
            </Link>
          ))}
        </nav>

        <div className={styles.controls}>
          {langToggle}

          <Link href="/login" className={styles.login}>
            {t('Login', 'ಪ್ರವೇಶಿಸಿ')}
          </Link>

          <button
            type="button"
            ref={hamburgerRef}
            className={styles.hamburger}
            aria-label={t('Menu', 'ಮೆನು')}
            aria-expanded={open}
            aria-controls="mobile-drawer"
            onClick={() => setOpen((v) => !v)}
          >
            <span className={`${styles.bars} ${open ? styles.barsOpen : ''}`} />
          </button>
        </div>

        {open && (
          <div id="mobile-drawer" ref={drawerRef} className={styles.drawer}>
            <nav className={styles.drawerNav}>
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={styles.drawerLink}
                  onClick={close}
                >
                  {t(item.en, item.kn)}
                </Link>
              ))}
            </nav>
            <Link href="/login" className={styles.drawerLogin} onClick={close}>
              {t('Login', 'ಪ್ರವೇಶಿಸಿ')}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
