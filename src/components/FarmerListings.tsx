import Link from 'next/link';
import styles from './FarmerListings.module.css';

/**
 * Farmer listings — ported from Figma Make file 0rUYFiQWi1c6HMmzLiTCPZ
 * (src/App.tsx). Card contents, copy and layout are the frame's, verbatim.
 *
 * PRIVATE ROUTE, reached from the farmer path: the success screen after a
 * listing is submitted links here, and this page's + ಹೊಸ ಪಟ್ಟಿ returns to the
 * form. Nothing public links to it.
 *
 * KANNADA-ONLY, like the listing form it follows: the ಕ|EN toggle leaves it
 * unchanged, so no <T> appears here. The only Latin on the page is "13.2%".
 *
 * WIRED. The cards are this farmer's real listings, read on the server from
 * the database. The fixtures are gone, and so is the ?empty=1 parameter that
 * stood in for an empty state — a farmer with no listings now reaches the
 * real one.
 *
 * TEMP-PRE-AUTH: which farmer this is comes from the httpOnly cookie set at
 * the OTP step, not from a verified session. Nothing proves the number
 * belongs to whoever is looking.
 *
 * CEO-approved deviations, each marked at its site:
 * - DEV-ICON         the frame's 📞 and ⚠ emoji replaced with line icons in
 *                    the frame's own colours, as ruled on buyer listings.
 * - DEV-PALETTE      the frame's gadde-50/100/200/400/800, muted-fg,
 *                    warning-* and red-700 mapped by role onto the existing
 *                    ramp; no new tokens. Map in the stylesheet header.
 *
 * Logged, built as designed: ಎಡಿಟ್ and ತೆಗೆದುಹಾಕಿ have no handlers in the
 * frame either and ship inert and aria-disabled — a farmer clicking ಎಡಿಟ್
 * gets nothing, and no message says why. The buyers pill now counts real
 * unlocks but still offers no way to reach them. The empty state's padlock
 * icon reads as "locked" rather than "empty"; it is the frame's drawing.
 *
 * BADGES: migration 007 gave the schema real quality columns, and the admin
 * quality desk is their only write path. A card reads
 * "ಗುಣಮಟ್ಟ ಪರಿಶೀಲಿತ · ತೇವಾಂಶ 13.2%" the moment staff record a check — the
 * same number the buyer sees, one truth on two screens — and
 * "ಪರಿಶೀಲನೆ ಬಾಕಿ — ಕೊಯ್ಲಿನ ಸಮಯದಲ್ಲಿ ನಮ್ಮ ತಂಡ ಬರುತ್ತದೆ" until then, which is
 * the promise the listing form makes.
 */

import type { BadgeType, FarmerListingRow } from '@/lib/farmerListings';

/* The form step of the farmer flow. */
const FORM_HREF = '/login/farmer';

/* DEV-ICON: replaces the frame's 📞 emoji. */
function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path
        d="M13 10.5c0 .3-.07.59-.21.88-.14.29-.33.56-.58.81-.42.46-.88.68-1.36.68-.34 0-.71-.09-1.11-.27-.4-.18-.8-.42-1.2-.72a19.5 19.5 0 01-1.19-1.07 19.1 19.1 0 01-1.06-1.19c-.29-.4-.53-.8-.71-1.19-.18-.4-.27-.77-.27-1.11 0-.33.08-.65.24-.95.16-.3.39-.58.7-.83.24-.2.5-.29.79-.29.14 0 .28.03.4.09.13.06.25.15.34.29l1.18 1.66c.09.13.16.25.21.37.05.11.08.22.08.32 0 .13-.04.26-.11.38-.07.12-.17.25-.3.37l-.4.42a.27.27 0 00-.08.2c0 .04.01.07.02.11.02.04.04.07.05.1.09.16.24.37.45.62.22.25.45.51.7.76.26.25.51.48.77.7.25.21.46.36.63.44.03.01.06.03.1.04.04.01.08.02.12.02a.29.29 0 00.21-.09l.4-.41c.13-.13.26-.23.38-.29.12-.07.24-.1.37-.1.1 0 .2.02.32.07.11.05.23.12.36.21l1.68 1.19c.14.1.23.21.29.34.05.13.08.27.11.41z"
        fill="currentColor"
      />
    </svg>
  );
}

/* DEV-ICON: replaces the frame's ⚠ glyph. */
function WarningIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 3.2 2.6 16a1 1 0 0 0 .87 1.5h13.06A1 1 0 0 0 17.4 16L10 3.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M10 8v3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="14.2" r="0.9" fill="currentColor" />
    </svg>
  );
}

/** The frame's own badge copy, verbatim. */
const BADGE_LABELS: Record<BadgeType, string> = {
  verified: 'ಗುಣಮಟ್ಟ ಪರಿಶೀಲಿತ',
  pending: 'ಪರಿಶೀಲನೆ ಬಾಕಿ — ಕೊಯ್ಲಿನ ಸಮಯದಲ್ಲಿ ನಮ್ಮ ತಂಡ ಬರುತ್ತದೆ',
  active: 'ಪಟ್ಟಿ ಸಕ್ರಿಯ',
};

function Badge({ type, label }: { type: BadgeType; label: string }) {
  const cls =
    type === 'verified'
      ? styles.badgeVerified
      : type === 'active'
        ? styles.badgeActive
        : styles.badgePending;
  const dotCls =
    type === 'verified'
      ? styles.dotVerified
      : type === 'active'
        ? styles.dotActive
        : styles.dotPending;

  return (
    <span className={`${styles.badge} ${cls}`}>
      <span className={`${styles.dot} ${dotCls}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function ListingCard({ listing }: { listing: FarmerListingRow }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div className={styles.cardHead}>
          <h2 className={styles.variety}>
            {listing.varietyKn}
            <span className={styles.qty}> · {listing.quantityKn}</span>
          </h2>
          <div className={styles.meta}>
            <span>{listing.harvestKn}</span>
            <span className={styles.metaDot} aria-hidden="true">
              ·
            </span>
            <span>{listing.locationKn}</span>
          </div>
        </div>

        {/* Inert in the frame too. aria-disabled so neither pretends to work. */}
        <div className={styles.actions}>
          <button type="button" className={styles.edit} aria-disabled="true">
            ಎಡಿಟ್
          </button>
          <button type="button" className={styles.remove} aria-disabled="true">
            ತೆಗೆದುಹಾಕಿ
          </button>
        </div>
      </div>

      <div className={styles.badgeRow}>
        {/* CEO ruling (Desk 3 gate): the verified badge carries the real
            moisture reading, one decimal — the number IS the substance. */}
        <Badge
          type={listing.badge}
          label={
            listing.badge === 'verified' && listing.moisturePct
              ? `${BADGE_LABELS.verified} · ತೇವಾಂಶ ${listing.moisturePct}%`
              : BADGE_LABELS[listing.badge]
          }
        />
        {listing.buyersKn && (
          <span className={styles.buyers}>
            <PhoneIcon />
            {listing.buyersKn}
          </span>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
          {/* color-mix() is unreliable in an SVG presentation attribute,
              so the two fills come from the stylesheet. */}
          <rect x="8" y="20" width="28" height="18" rx="3" className={styles.emptyIconBody} />
          <path
            d="M14 20V14C14 10.686 17.134 8 22 8C26.866 8 30 10.686 30 14V20"
            className={styles.emptyIconShackle}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="22" cy="29" r="3" className={styles.emptyIconDot} />
        </svg>
      </div>
      <div className={styles.emptyText}>
        <p className={styles.emptyTitle}>ಇನ್ನೂ ಪಟ್ಟಿ ಇಲ್ಲ</p>
        <p className={styles.emptySub}>
          ನಿಮ್ಮ ಮೊದಲ ಭತ್ತದ ಪಟ್ಟಿ ಮಾಡಿ, ಖರೀದಿದಾರರು ತಾವೇ ಬರುತ್ತಾರೆ.
        </p>
      </div>
      <Link href={FORM_HREF} className={styles.emptyBtn}>
        ಮೊದಲ ಪಟ್ಟಿ ಮಾಡಿ
      </Link>
    </div>
  );
}

export default function FarmerListings({ listings }: { listings: FarmerListingRow[] }) {
  const empty = listings.length === 0;
  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        {/* The frame's own branded top bar is replaced by the site header.
            It carried a different product name. */}
        <div className={styles.headRow}>
          <h1 className={styles.title}>ನನ್ನ ಪಟ್ಟಿಗಳು</h1>
          {/* The frame hides this button in the empty state. */}
          {!empty && (
            <Link href={FORM_HREF} className={styles.newBtn}>
              <span className={styles.plus} aria-hidden="true">
                +
              </span>
              ಹೊಸ ಪಟ್ಟಿ
            </Link>
          )}
        </div>

        {empty ? (
          <EmptyState />
        ) : (
          <>
            <div className={styles.cards}>
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>

            {/* Advisory — the Fair Dealing Code. Not shown in the empty
                state, as the frame has it. */}
            <div className={styles.advisory}>
              <span className={styles.advisoryIcon}>
                <WarningIcon />
              </span>
              <p className={styles.advisoryText}>
                ಖರೀದಿದಾರ ಕರೆ ಮಾಡಿದಾಗ ನೆನಪಿಡಿ:{' '}
                <span className={styles.advisoryStrong}>ಪಾವತಿ ಮೊದಲು, ನಂತರ ಭತ್ತ.</span>
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
