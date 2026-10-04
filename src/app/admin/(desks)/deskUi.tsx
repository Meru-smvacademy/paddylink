import Link from 'next/link';
import styles from './desk.module.css';

/**
 * Shared presentation pieces for the admin desks. Server components, no
 * client JS: filters are links, decisions are plain form posts, and the
 * detail of a row opens through ?sel= in the query string.
 */

/** Kannada label above English — the farmer surfaces' order, on every
 *  heading and button in the portal. */
export function Bi({ kn, en }: { kn: string; en: string }) {
  return (
    <span className={styles.bi}>
      {/* Data values (district names, months) have no Kannada form here;
          they pass kn="" and render as their single line. */}
      {kn && (
        <span className={styles.kn} lang="kn">
          {kn}
        </span>
      )}
      <span className={kn ? styles.en : styles.kn}>{en}</span>
    </span>
  );
}

export interface Segment {
  key: string;
  kn: string;
  en: string;
  href: string;
}

/** Large segmented status filter. Links, not a dropdown. */
export function Segments({
  label,
  items,
  active,
}: {
  label: { kn: string; en: string };
  items: Segment[];
  active: string;
}) {
  return (
    <nav className={styles.segGroup} aria-label={label.en}>
      <span className={styles.segLabel}>
        <span lang="kn">{label.kn}</span> · {label.en}
      </span>
      <ul className={styles.segments}>
        {items.map((s) => (
          <li key={s.key}>
            <Link
              href={s.href}
              className={s.key === active ? styles.segActive : styles.seg}
              aria-current={s.key === active ? 'page' : undefined}
            >
              <Bi kn={s.kn} en={s.en} />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Flash({ flash }: { flash: { kind: 'ok' | 'err'; text: string } | null }) {
  if (!flash) return null;
  return (
    <p className={flash.kind === 'ok' ? styles.flashOk : styles.flashErr} role="status">
      {flash.text}
    </p>
  );
}

/** The explicit "ವಿವರ / Details" tap. The only way a row opens. */
export function DetailsToggle({
  open,
  openHref,
  closeHref,
}: {
  open: boolean;
  openHref: string;
  closeHref: string;
}) {
  return (
    <Link
      href={open ? closeHref : openHref}
      className={open ? styles.detailsBtnOpen : styles.detailsBtn}
      aria-expanded={open}
    >
      {open ? <Bi kn="ಮುಚ್ಚಿ" en="Close details" /> : <Bi kn="ವಿವರ" en="Details" />}
    </Link>
  );
}

export function DeskHead({
  kn,
  en,
  sub,
}: {
  kn: string;
  en: string;
  sub?: React.ReactNode;
}) {
  return (
    <header className={styles.deskHead}>
      <h1 className={styles.title}>
        <Bi kn={kn} en={en} />
      </h1>
      {sub && <p className={styles.deskSub}>{sub}</p>}
    </header>
  );
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function fmtMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function fmtMonthKey(
  key: string,
  month: 'short' | 'long' = 'short',
  locale: 'en-IN' | 'kn-IN' = 'en-IN',
): string {
  return new Date(`${key}-01T00:00:00Z`).toLocaleDateString(locale, {
    month,
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function age(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `${h}h ${minutes % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export function varietyLabel(l: { variety_en: string | null; variety_other: string | null }): string {
  const base = l.variety_en ?? '—';
  return l.variety_other ? `${base}: ${l.variety_other}` : base;
}

/** Status words, Kannada first. Display only — the stored values are the
 *  keys (buyers keep 'approved'; "Verified" is the product word). */
export const KYC_WORD: Record<string, { kn: string; en: string }> = {
  pending: { kn: 'ಬಾಕಿ', en: 'Pending' },
  under_review: { kn: 'ಪರಿಶೀಲನೆ', en: 'Under review' },
  approved: { kn: 'ಪರಿಶೀಲಿತ', en: 'Verified' },
  rejected: { kn: 'ತಿರಸ್ಕೃತ', en: 'Rejected' },
};

export const LISTING_WORD: Record<string, { kn: string; en: string }> = {
  draft: { kn: 'ಕರಡು', en: 'Draft' },
  active: { kn: 'ಸಕ್ರಿಯ', en: 'Active' },
  flagged: { kn: 'ಗುರುತಿಸಲಾಗಿದೆ', en: 'Flagged' },
  sold: { kn: 'ಮಾರಾಟವಾಗಿದೆ', en: 'Sold' },
  expired: { kn: 'ಅವಧಿ ಮುಗಿದಿದೆ', en: 'Expired' },
  removed: { kn: 'ತೆಗೆದುಹಾಕಲಾಗಿದೆ', en: 'Removed' },
};

/** A status pill: one line, Kannada · English. `tone` picks the colour. */
export function Pill({
  word,
  tone,
}: {
  word: { kn: string; en: string };
  tone: 'wait' | 'ok' | 'bad' | 'quiet';
}) {
  const cls = {
    wait: styles.pillWait,
    ok: styles.pillOk,
    bad: styles.pillBad,
    quiet: styles.pillQuiet,
  }[tone];
  return (
    <span className={cls}>
      <span lang="kn">{word.kn}</span> · {word.en}
    </span>
  );
}
