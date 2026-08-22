'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  browseClient,
  getBrowseListings,
  type BrowseListing,
} from '@/lib/browseListings';
import type { RefDistrict, RefVariety } from '@/lib/reference';
import T from './T';
import styles from './BuyerListings.module.css';

/**
 * Buyer listings browser — ported from Figma Make file
 * 8Wf4G4tW7lGRmd8LI2LyKw (src/App.tsx). Layout, copy and card contents are
 * the frame's, verbatim.
 *
 * PRIVATE ROUTE. Reached only by finishing the buyer OTP flow at
 * /login/buyer. Nothing public links here, and tokens appear on this page
 * and nowhere else on the site.
 *
 * WIRED FOR READS. The cards are real active listings from
 * public.listings_browse, and every filter is a database query — the browser
 * runs the same anon-key query the server does, against the one object anon
 * is allowed to read. The view carries no identity at all: no farmer id, no
 * name, no mobile, no village.
 *
 * UNLOCK IS STILL DEMO, and deliberately so. A real unlock spends a token and
 * releases a farmer's contact, which needs an authenticated buyer, a wallet
 * and the unlock_contact() function — none of which is reachable before OTP
 * auth lands. So the modal flips a card in component state, decrements a
 * demo balance, and touches nothing in the database. No token is spent and no
 * contact is released. The names and numbers a demo unlock reveals are
 * fixtures, not real farmers.
 *
 * AWAITING-BACKEND: the token balance, the "+ ಸೇರಿಸಿ / Add" control and the
 * unlock itself.
 *
 * LANGUAGE: the frame prints Kannada with a smaller English twin and has no
 * working toggle. That stack is preserved and the site ಕ|EN control does not
 * flip it, so every <T> carries the same string in both slots.
 *
 * CEO-approved deviations, each marked at its site:
 * - DEV-PALETTE  green for verified, gold for spend; see the stylesheet
 *                header for the full role map.
 * - DEV-GLYPH    the frame centred ₮ (U+20AE, the Mongolian tugrik sign) in
 *                the coin. A real currency sign has no place here, so the
 *                disc ships bare.
 * - DEV-FIXTURES the frame's six sample phone numbers were valid, diallable
 *                Indian mobiles, and card 1 displayed one in full on load.
 *                Replaced with an obviously synthetic run that cannot
 *                connect. Format and masking are unchanged.
 * - DEV-GUARD    the frame subtracts 5 without checking the balance, so it
 *                goes negative. Unlocking is now blocked below 5.
 * - DEV-I18N     the frame's result count and clear link were English-only,
 *                breaking bilingual-always. Both now carry Kannada.
 * - DEV-A11Y     the frame's modal had no dialog role, no focus trap, no
 *                Escape and a backdrop that ignored clicks.
 * - DEV-ICON     the frame's 📞 emoji replaced with the line icon used
 *                elsewhere, and the tel: link now carries +91.
 *
 * Logged, built verbatim per the character-for-character rule: the frame
 * writes ಯಾದಗಿರ (elsewhere ಯಾದಗಿರಿ) and ಗುಲಬರ್ಗಾ (now ಕಲಬುರಗಿ, which is what
 * /register-buyer lists). ಗುಲಬರ್ಗಾ matches no listing, so choosing it always
 * lands on the empty state. Both are data cleanup for the backend pass.
 */

type QualityStatus = 'checked' | 'pending';

/** A real browse row, plus the DEMO unlock flag which lives only in state. */
type Card = BrowseListing & { unlocked: boolean };

/* The demo identities a DEMO unlock reveals. These are NOT farmers: the
   browse view carries no identity, and a real unlock needs auth, a wallet and
   unlock_contact(). Until then an unlocked card shows this placeholder pair
   so the state is reviewable, and it is obviously not a real person. */
const DEMO_IDENTITY = {
  farmerFull: 'ರೈತ: ಪರೀಕ್ಷಾ ಹೆಸರು',
  phoneFull: '90000 00000',
};

const MASKED_FARMER = 'ರೈತ: *****';
const MASKED_PHONE = '9X XXX XXXXX';

/* The twelve months, so a harvest date can be labelled in Kannada. */
const MONTHS_KN = [
  'ಜನವರಿ', 'ಫೆಬ್ರವರಿ', 'ಮಾರ್ಚ್', 'ಏಪ್ರಿಲ್', 'ಮೇ', 'ಜೂನ್',
  'ಜುಲೈ', 'ಆಗಸ್ಟ್', 'ಸೆಪ್ಟೆಂಬರ್', 'ಅಕ್ಟೋಬರ್', 'ನವೆಂಬರ್', 'ಡಿಸೆಂಬರ್',
];

function harvestKn(isoDate: string) {
  return MONTHS_KN[Number(isoDate.slice(5, 7)) - 1] ?? '';
}

const UNLOCK_COST = 5;
const START_BALANCE = 32;

/* DEV-GLYPH: the frame put ₮ inside this disc. It ships bare. */
function Coin({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle
        cx="8"
        cy="8"
        r="7"
        fill="var(--bhatta-400)"
        stroke="var(--bhatta-600)"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path
        d="M6.5 1.5C4.567 1.5 3 3.067 3 5c0 2.667 3.5 6.5 3.5 6.5S10 7.667 10 5c0-1.933-1.567-3.5-3.5-3.5z"
        stroke="var(--hottu-400)"
        strokeWidth="1.2"
      />
      <circle cx="6.5" cy="5" r="1.2" fill="var(--hottu-400)" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <rect x="1.5" y="2.5" width="10" height="9" rx="1.5" stroke="var(--hottu-400)" strokeWidth="1.2" />
      <path
        d="M1.5 5.5h10M4.5 1.5v2M8.5 1.5v2"
        stroke="var(--hottu-400)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* DEV-ICON: replaces the frame's 📞 emoji. */
function PhoneIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path
        d="M13 10.5c0 .3-.07.59-.21.88-.14.29-.33.56-.58.81-.42.46-.88.68-1.36.68-.34 0-.71-.09-1.11-.27-.4-.18-.8-.42-1.2-.72a19.5 19.5 0 01-1.19-1.07 19.1 19.1 0 01-1.06-1.19c-.29-.4-.53-.8-.71-1.19-.18-.4-.27-.77-.27-1.11 0-.33.08-.65.24-.95.16-.3.39-.58.7-.83.24-.2.5-.29.79-.29.14 0 .28.03.4.09.13.06.25.15.34.29l1.18 1.66c.09.13.16.25.21.37.05.11.08.22.08.32 0 .13-.04.26-.11.38-.07.12-.17.25-.3.37l-.4.42a.27.27 0 00-.08.2c0 .04.01.07.02.11.02.04.04.07.05.1.09.16.24.37.45.62.22.25.45.51.7.76.26.25.51.48.77.7.25.21.46.36.63.44.03.01.06.03.1.04.04.01.08.02.12.02a.29.29 0 00.21-.09l.4-.41c.13-.13.26-.23.38-.29.12-.07.24-.1.37-.1.1 0 .2.02.32.07.11.05.23.12.36.21l1.68 1.19c.14.1.23.21.29.34.05.13.08.27.11.41z"
        fill="currentColor"
      />
    </svg>
  );
}

function QualityBadge({ quality, moisture }: { quality: QualityStatus; moisture?: string }) {
  if (quality === 'checked') {
    return (
      <span className={`${styles.badge} ${styles.badgeChecked}`}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <circle cx="6" cy="6" r="5.5" fill="var(--gadde-700)" />
          <path
            d="M3.5 6l1.8 1.8 3.2-3.6"
            stroke="var(--hottu-50)"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className={styles.badgeCheckedText}>
          <T kn="ಗುಣಮಟ್ಟ ಪರಿಶೀಲಿತ" en="ಗುಣಮಟ್ಟ ಪರಿಶೀಲಿತ" />
        </span>
        {moisture && (
          <span className={styles.badgeMoisture}>
            <T kn={`· ತೇವಾಂಶ ${moisture}%`} en={`· ತೇವಾಂಶ ${moisture}%`} />
          </span>
        )}
      </span>
    );
  }
  return (
    <span className={`${styles.badge} ${styles.badgePending}`}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <circle cx="6" cy="6" r="5.5" stroke="var(--hottu-400)" strokeWidth="1.2" />
        <path d="M6 4v3M6 8.5v.5" stroke="var(--hottu-400)" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      <span className={styles.badgePendingText}>
        <T kn="ಪರಿಶೀಲನೆ ಬಾಕಿ " en="ಪರಿಶೀಲನೆ ಬಾಕಿ " />
        <span className={styles.badgePendingEn}>
          <T kn="/ Check pending" en="/ Check pending" />
        </span>
      </span>
    </span>
  );
}

function ListingCard({
  listing,
  affordable,
  onUnlockClick,
}: {
  listing: Card;
  affordable: boolean;
  onUnlockClick: (id: string) => void;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.stripe} aria-hidden="true" />

      <div className={styles.cardBody}>
        <div className={styles.cardHead}>
          <div>
            <h2 className={styles.variety}>
              <T kn={listing.variety_kn} en={listing.variety_kn} />
            </h2>
            <p className={styles.quantity}>
              <T
                kn={`${listing.quantity_quintals} ಕ್ವಿಂಟಾಲ್`}
                en={`${listing.quantity_quintals} ಕ್ವಿಂಟಾಲ್`}
              />
            </p>
          </div>
          {listing.unlocked && (
            <span className={styles.unlockedTag}>
              <T kn="ತೆರೆಯಲಾಗಿದೆ / Unlocked" en="ತೆರೆಯಲಾಗಿದೆ / Unlocked" />
            </span>
          )}
        </div>

        <p className={styles.metaRow}>
          <PinIcon />
          <T
            kn={`${listing.taluk_kn ?? ''}, ${listing.district_en ?? ''}`}
            en={`${listing.taluk_kn ?? ''}, ${listing.district_en ?? ''}`}
          />
        </p>

        <p className={styles.metaRow}>
          <CalendarIcon />
          <T
            kn={`ಕಟಾವು: ${harvestKn(listing.harvest_month)}`}
            en={`ಕಟಾವು: ${harvestKn(listing.harvest_month)}`}
          />
        </p>

        <div>
          {/* The badge reads the fact, not a fixture: verified only when
              staff recorded a check (migration 007). */}
          <QualityBadge
            quality={listing.quality_checked_at ? 'checked' : 'pending'}
            moisture={listing.moisture_pct != null ? String(listing.moisture_pct) : undefined}
          />
        </div>

        <div className={styles.identity}>
          {/* The browse view carries no identity, so there is nothing real to
              reveal. A DEMO unlock shows an obviously fake pair. */}
          {listing.unlocked ? (
            <>
              <p className={styles.farmerFull}>
                <T kn={DEMO_IDENTITY.farmerFull} en={DEMO_IDENTITY.farmerFull} />
              </p>
              <p className={styles.phoneFull}>
                <PhoneIcon />
                <T kn={DEMO_IDENTITY.phoneFull} en={DEMO_IDENTITY.phoneFull} />
              </p>
            </>
          ) : (
            <>
              <p className={styles.farmerMasked}>
                <T kn={MASKED_FARMER} en={MASKED_FARMER} />
              </p>
              <p className={styles.phoneMasked}>
                <T kn={MASKED_PHONE} en={MASKED_PHONE} />
              </p>
            </>
          )}
        </div>
      </div>

      <div className={styles.cardFoot}>
        {listing.unlocked ? (
          /* DEV-ICON: the frame's tel: dropped the country code. */
          <a
            href={`tel:+91${DEMO_IDENTITY.phoneFull.replace(/\s/g, '')}`}
            className={styles.cta}
          >
            <PhoneIcon size={15} />
            <T kn="ಕರೆ ಮಾಡಿ " en="ಕರೆ ಮಾಡಿ " />
            <span className={styles.ctaEn}>
              <T kn="/ Call" en="/ Call" />
            </span>
          </a>
        ) : (
          /* DEV-GUARD: the frame had no affordability check. */
          <button
            type="button"
            onClick={() => onUnlockClick(listing.id)}
            disabled={!affordable}
            className={`${styles.cta} ${affordable ? '' : styles.ctaDisabled}`}
          >
            <Coin size={14} />
            <T
              kn={`ಸಂಪರ್ಕ ತೆರೆಯಿರಿ · ${UNLOCK_COST} ಟೋಕನ್ `}
              en={`ಸಂಪರ್ಕ ತೆರೆಯಿರಿ · ${UNLOCK_COST} ಟೋಕನ್ `}
            />
            <span className={styles.ctaEn}>
              <T kn={`/ Unlock · ${UNLOCK_COST} tokens`} en={`/ Unlock · ${UNLOCK_COST} tokens`} />
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

function UnlockModal({
  affordable,
  onConfirm,
  onCancel,
}: {
  affordable: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  /* DEV-A11Y — none of this is in the frame: it had no dialog role, no
     Escape, no focus management and a backdrop that ignored clicks. */
  useEffect(() => {
    confirmRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }
      if (e.key !== 'Tab' || !modalRef.current) return;
      const items = modalRef.current.querySelectorAll<HTMLElement>('button:not([disabled])');
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  /* DEV-A11Y: backdrop click closes; the frame's backdrop ignored clicks. */
  return (
    <div className={styles.overlay} onClick={onCancel} role="presentation">
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="unlock-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalIconRow}>
          <div className={styles.modalIcon}>
            <Coin size={28} />
          </div>
        </div>

        <div className={styles.modalHead}>
          <h2 id="unlock-title" className={styles.modalKn}>
            <T kn="ಸಂಪರ್ಕ ತೆರೆಯುವುದೇ?" en="ಸಂಪರ್ಕ ತೆರೆಯುವುದೇ?" />
          </h2>
          <p className={styles.modalEn}>
            <T kn="Unlock contact?" en="Unlock contact?" />
          </p>
          <div className={styles.modalCost}>
            <Coin size={16} />
            <span className={styles.modalCostKn}>
              <T
                kn={`${UNLOCK_COST} ಟೋಕನ್ ಬಳಕೆಯಾಗುತ್ತದೆ`}
                en={`${UNLOCK_COST} ಟೋಕನ್ ಬಳಕೆಯಾಗುತ್ತದೆ`}
              />
            </span>
          </div>
          <p className={styles.modalCostEn}>
            <T kn={`${UNLOCK_COST} tokens will be used`} en={`${UNLOCK_COST} tokens will be used`} />
          </p>
          {/* DEV-GUARD */}
          {!affordable && (
            <p className={styles.modalShort}>
              <T kn="ಟೋಕನ್ ಸಾಲದು / Not enough tokens" en="ಟೋಕನ್ ಸಾಲದು / Not enough tokens" />
            </p>
          )}
        </div>

        <div className={styles.safety}>
          <p className={styles.safetyKn}>
            <T kn="ನೆನಪಿಡಿ: ಪಾವತಿ ಮೊದಲು, ನಂತರ ಭತ್ತ." en="ನೆನಪಿಡಿ: ಪಾವತಿ ಮೊದಲು, ನಂತರ ಭತ್ತ." />
          </p>
          <p className={styles.safetyEn}>
            <T kn="Remember: Payment first, paddy second." en="Remember: Payment first, paddy second." />
          </p>
        </div>

        <div className={styles.actions}>
          <button type="button" onClick={onCancel} className={styles.cancel}>
            <T kn="ರದ್ದು " en="ರದ್ದು " />
            <span className={styles.actionEn}>
              <T kn="/ Cancel" en="/ Cancel" />
            </span>
          </button>
          <button
            type="button"
            ref={confirmRef}
            onClick={onConfirm}
            disabled={!affordable}
            className={`${styles.confirm} ${affordable ? '' : styles.confirmDisabled}`}
          >
            <T kn="ಒಪ್ಪಿಗೆ " en="ಒಪ್ಪಿಗೆ " />
            <span className={styles.actionEn}>
              <T kn="/ Confirm" en="/ Confirm" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <path
            d="M6 30l8-8M30 6l-8 8M6 6l8 8M30 30l-8-8"
            stroke="var(--hottu-400)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle
            cx="18"
            cy="18"
            r="10"
            stroke="var(--hottu-300)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <path
            d="M12 18c0-3.314 2.686-6 6-6s6 2.686 6 6-2.686 6-6 6-6-2.686-6-6z"
            fill="var(--hottu-200)"
          />
          <path d="M15 18h6M18 15v6" stroke="var(--hottu-400)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <p className={styles.emptyKn}>
          <T kn="ಈ ಆಯ್ಕೆಗೆ ಪಟ್ಟಿಗಳಿಲ್ಲ" en="ಈ ಆಯ್ಕೆಗೆ ಪಟ್ಟಿಗಳಿಲ್ಲ" />
        </p>
        <p className={styles.emptyEn}>
          <T kn="No listings for this filter" en="No listings for this filter" />
        </p>
      </div>
      <button type="button" onClick={onClear} className={styles.clearBtn}>
        <T kn="ಆಯ್ಕೆ ತೆರವುಗೊಳಿಸಿ / Clear filters" en="ಆಯ್ಕೆ ತೆರವುಗೊಳಿಸಿ / Clear filters" />
      </button>
    </div>
  );
}

export default function BuyerListings({
  initialListings,
  districts,
  varieties,
}: {
  initialListings: BrowseListing[];
  districts: RefDistrict[];
  varieties: RefVariety[];
}) {
  const [rows, setRows] = useState<BrowseListing[]>(initialListings);
  /* DEMO unlocks live in their own state, not derived from the current
     result set: filtering a card out must not forget that it was unlocked,
     or the state vanishes the moment a buyer looks at another district. */
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(START_BALANCE);
  /* Filters hold canonical English names and a month number — what the view
     is queried by. The dropdowns show Kannada. */
  const [districtFilter, setDistrictFilter] = useState('');
  const [varietyFilter, setVarietyFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [qualityOnly, setQualityOnly] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState<string | null>(null);

  const supabase = useMemo(() => browseClient(), []);
  const hasFilters = Boolean(districtFilter || varietyFilter || monthFilter || qualityOnly);

  /* Every filter change is a query against listings_browse — the same anon
     read the server does, not a client-side sift of a preloaded array. A
     DEMO unlock is remembered across refetches so the reviewed state does not
     vanish when a filter moves. */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getBrowseListings(
      {
        districtEn: districtFilter || undefined,
        varietyEn: varietyFilter || undefined,
        harvestMonth: monthFilter ? Number(monthFilter) : undefined,
        qualityCheckedOnly: qualityOnly || undefined,
      },
      supabase,
    )
      .then((next) => {
        if (!cancelled) setRows(next);
      })
      .catch((e) => console.error('[buyer listings] query failed', e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [districtFilter, varietyFilter, monthFilter, qualityOnly, supabase]);

  const filtered: Card[] = useMemo(
    () => rows.map((r) => ({ ...r, unlocked: unlockedIds.has(r.id) })),
    [rows, unlockedIds],
  );
  const affordable = tokenBalance >= UNLOCK_COST;

  const clearFilters = useCallback(() => {
    setDistrictFilter('');
    setVarietyFilter('');
    setMonthFilter('');
    setQualityOnly(false);
  }, []);

  const closeModal = useCallback(() => setUnlockTarget(null), []);

  function handleUnlockConfirm() {
    // DEMO ONLY. A real unlock calls unlock_contact(), which needs an
    // authenticated buyer and a wallet — neither exists before OTP auth. This
    // spends nothing, releases nothing, and resets on reload.
    if (unlockTarget === null || !affordable) return;
    setUnlockedIds((prev) => new Set(prev).add(unlockTarget));
    setTokenBalance((b) => b - UNLOCK_COST);
    setUnlockTarget(null);
  }

  return (
    <main className={styles.page}>
      {/* Top bar — the frame's own branded header above this is replaced by
          the site header. It carried a different product name. */}
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.titleKn}>
            <T kn="ಭತ್ತದ ಪಟ್ಟಿಗಳು" en="ಭತ್ತದ ಪಟ್ಟಿಗಳು" />
          </h1>
          <p className={styles.titleEn}>
            <T kn="Paddy Listings" en="Paddy Listings" />
          </p>
        </div>

        <div className={styles.tokenRow}>
          <div className={styles.tokenChip}>
            <Coin size={15} />
            <span className={`${styles.tokenCount} ${affordable ? '' : styles.tokenLow}`}>
              <T kn={`${tokenBalance} ಟೋಕನ್`} en={`${tokenBalance} ಟೋಕನ್`} />
            </span>
          </div>
          {/* AWAITING-BACKEND: no top-up flow exists, so this does nothing. */}
          <button type="button" className={styles.addLink}>
            <T kn="+ ಸೇರಿಸಿ " en="+ ಸೇರಿಸಿ " />
            <span className={styles.addLinkEn}>
              <T kn="/ Add" en="/ Add" />
            </span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filter}>
          <label className={styles.filterLabel} htmlFor="bl-district">
            <T kn="ಜಿಲ್ಲೆ / District" en="ಜಿಲ್ಲೆ / District" />
          </label>
          <select
            id="bl-district"
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className={`${styles.select} ${styles.selectDistrict}`}
          >
            <option value="">ಎಲ್ಲ ಜಿಲ್ಲೆಗಳು</option>
            {/* Value is name_en: listings_browse carries district_en. */}
            {districts.map((d) => (
              <option key={d.id} value={d.name_en}>
                {d.name_kn}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filter}>
          <label className={styles.filterLabel} htmlFor="bl-variety">
            <T kn="ತಳಿ / Variety" en="ತಳಿ / Variety" />
          </label>
          <select
            id="bl-variety"
            value={varietyFilter}
            onChange={(e) => setVarietyFilter(e.target.value)}
            className={`${styles.select} ${styles.selectVariety}`}
          >
            <option value="">ಎಲ್ಲ ತಳಿಗಳು</option>
            {/* Value is name_en so a Kannada relabel cannot break the filter. */}
            {varieties.map((v) => (
              <option key={v.id} value={v.name_en}>
                {v.name_kn}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filter}>
          <label className={styles.filterLabel} htmlFor="bl-month">
            <T kn="ಕಟಾವು ತಿಂಗಳು / Harvest month" en="ಕಟಾವು ತಿಂಗಳು / Harvest month" />
          </label>
          <select
            id="bl-month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className={`${styles.select} ${styles.selectMonth}`}
          >
            <option value="">ಎಲ್ಲ ತಿಂಗಳು</option>
            {/* All twelve now: the frame listed three because its fixtures
                only used three. Value is the month number. */}
            {MONTHS_KN.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.toggleWrap}>
          <button
            type="button"
            onClick={() => setQualityOnly((v) => !v)}
            aria-pressed={qualityOnly}
            className={`${styles.toggle} ${qualityOnly ? styles.toggleOn : ''}`}
          >
            <span
              className={`${styles.togglePill} ${qualityOnly ? styles.togglePillOn : ''}`}
              aria-hidden="true"
            >
              <span className={`${styles.toggleKnob} ${qualityOnly ? styles.toggleKnobOn : ''}`} />
            </span>
            <T kn="ಗುಣಮಟ್ಟ ಪರಿಶೀಲಿತ ಮಾತ್ರ" en="ಗುಣಮಟ್ಟ ಪರಿಶೀಲಿತ ಮಾತ್ರ" />
            <span className={styles.toggleEn}>
              <T kn="/ Quality checked only" en="/ Quality checked only" />
            </span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className={styles.main}>
        {filtered.length > 0 && (
          /* DEV-I18N: the frame's count and clear link were English-only. */
          <p className={styles.count} role="status">
            <span className={styles.countKn}>
              <T kn={`${filtered.length} ಪಟ್ಟಿಗಳು`} en={`${filtered.length} ಪಟ್ಟಿಗಳು`} />
            </span>{' '}
            <T kn={`/ ${filtered.length} listings`} en={`/ ${filtered.length} listings`} />
            {hasFilters && (
              <button type="button" onClick={clearFilters} className={styles.clearInline}>
                <T kn="ಆಯ್ಕೆ ತೆರವುಗೊಳಿಸಿ / Clear filters" en="ಆಯ್ಕೆ ತೆರವುಗೊಳಿಸಿ / Clear filters" />
              </button>
            )}
          </p>
        )}

        <div className={styles.grid}>
          {filtered.length === 0 ? (
            <EmptyState onClear={clearFilters} />
          ) : (
            filtered.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                affordable={affordable}
                onUnlockClick={setUnlockTarget}
              />
            ))
          )}
        </div>
      </div>

      {unlockTarget !== null && (
        <UnlockModal
          affordable={affordable}
          onConfirm={handleUnlockConfirm}
          onCancel={closeModal}
        />
      )}
    </main>
  );
}
