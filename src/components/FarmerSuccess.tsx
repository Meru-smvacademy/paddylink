'use client';

import Link from 'next/link';
import type { CreatedListing } from './FarmerListingFormV2';
import T from './T';
import styles from './FarmerSuccess.module.css';

/**
 * Farmer success screen — ported from Figma Make file GrgKytpvcZYRwTpZsAM9wa
 * (src/App.tsx, FormScreen, the `submitted` branch). Piece 3 of 3, which
 * completes the farmer entry flow.
 *
 * The listing IS saved by the time this renders — the form posts to
 * /api/farmer/listings and passes the created row down, so the summary below
 * is read back from the database rather than echoed from the form. That
 * closes the gap flagged when this screen was ported: the frame showed the
 * farmer nothing he had entered, so a mistyped quantity was invisible.
 *
 * LANGUAGE: the frame prints Kannada with a smaller English line beneath and
 * has no working toggle. That stack is preserved and the site ಕ|EN control
 * does not flip it, so every <T> carries the same string in both slots.
 *
 * DEV-LINK: the frame offers only "back to start", stranding the farmer with
 * no way to his listings. A link to /farmer/listings is added above it, in
 * the words the /login farmer card already uses.
 *
 * Two things about the frame's own design, flagged rather than fixed:
 * - Its only control returns to the door chooser. The farmer door advertises
 *   "ನಿಮ್ಮ ಪಟ್ಟಿಗಳನ್ನು ನೋಡಿ", but no listings screen exists in the file.
 *
 * The frame drops the back link from its top bar on this screen; ours lives
 * in OtpFlow and is hidden for the same reason, leaving the one button below.
 */

/** The harvest month as the farmer picked it, from the stored date. */
const MONTHS_KN = [
  'ಜನವರಿ', 'ಫೆಬ್ರವರಿ', 'ಮಾರ್ಚ್', 'ಏಪ್ರಿಲ್', 'ಮೇ', 'ಜೂನ್',
  'ಜುಲೈ', 'ಆಗಸ್ಟ್', 'ಸೆಪ್ಟೆಂಬರ್', 'ಅಕ್ಟೋಬರ್', 'ನವೆಂಬರ್', 'ಡಿಸೆಂಬರ್',
];

function harvestKn(isoDate: string) {
  const m = Number(isoDate.slice(5, 7));
  return MONTHS_KN[m - 1] ?? '';
}

export default function FarmerSuccess({ listing }: { listing?: CreatedListing | null }) {
  return (
    /* role="status" is not in the frame. This replaces the form without a
       navigation, so without it a screen reader is given no announcement
       that the listing went through. */
    <div className={styles.shell} role="status">
      <div className={styles.tick}>
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
          <path
            d="M14 28L24 38L42 18"
            stroke="var(--bhatta-200)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h1 className={styles.headKn}>
        <T kn="ನಿಮ್ಮ ಭತ್ತ ಪಟ್ಟಿಯಾಗಿದೆ!" en="ನಿಮ್ಮ ಭತ್ತ ಪಟ್ಟಿಯಾಗಿದೆ!" />
      </h1>
      <p className={styles.headEn}>
        <T kn="Your paddy is listed!" en="Your paddy is listed!" />
      </p>

      {/* What was actually stored. Kannada-only, like the form it follows. */}
      {listing && (
        <dl className={styles.summary}>
          <div className={styles.summaryRow}>
            <dt className={styles.summaryKey}>ಪ್ರಮಾಣ</dt>
            <dd className={styles.summaryValue}>{listing.quantity_quintals} ಕ್ವಿಂಟಾಲ್</dd>
          </div>
          <div className={styles.summaryRow}>
            <dt className={styles.summaryKey}>ಕೊಯ್ಲು ತಿಂಗಳು</dt>
            <dd className={styles.summaryValue}>{harvestKn(listing.harvest_month)}</dd>
          </div>
          {listing.variety_kn && (
            <div className={styles.summaryRow}>
              <dt className={styles.summaryKey}>ಭತ್ತದ ತಳಿ</dt>
              <dd className={styles.summaryValue}>{listing.variety_kn}</dd>
            </div>
          )}
        </dl>
      )}

      <div className={styles.panel}>
        <p className={styles.panelKn}>
          <T
            kn="ಕಟಾವಿನ ಸಮಯದಲ್ಲಿ ಗುಣಮಟ್ಟ ಪರಿಶೀಲನೆಗೆ ನಾವು ಬರುತ್ತೇವೆ"
            en="ಕಟಾವಿನ ಸಮಯದಲ್ಲಿ ಗುಣಮಟ್ಟ ಪರಿಶೀಲನೆಗೆ ನಾವು ಬರುತ್ತೇವೆ"
          />
        </p>
        <p className={styles.panelEn}>
          <T
            kn="We'll come for the quality check at harvest time."
            en="We'll come for the quality check at harvest time."
          />
        </p>
      </div>

      <div className={styles.actions}>
        {/* DEV-LINK — not in the frame. The farmer door on /login promises
            "ನಿಮ್ಮ ಪಟ್ಟಿಗಳನ್ನು ನೋಡಿ"; /farmer/listings is what finally keeps
            that promise, so the loop closes in the same words. */}
        <Link href="/farmer/listings" className={styles.primary}>
          <T kn="ನಿಮ್ಮ ಪಟ್ಟಿಗಳನ್ನು ನೋಡಿ / See your listings" en="ನಿಮ್ಮ ಪಟ್ಟಿಗಳನ್ನು ನೋಡಿ / See your listings" />
        </Link>

        {/* The frame's handler resets the form and returns to the door
            chooser, which is /login here — not the site's front page. */}
        <Link href="/login" className={styles.restart}>
          <T kn="← ಮೊದಲ ಪುಟಕ್ಕೆ / Back to start" en="← ಮೊದಲ ಪುಟಕ್ಕೆ / Back to start" />
        </Link>
      </div>
    </div>
  );
}
