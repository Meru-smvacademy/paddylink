'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  browseClient,
  getBrowseListings,
  getSoldIds,
  type BrowseListing,
} from '@/lib/browseListings';
import type { RefDistrict, RefVariety } from '@/lib/reference';
import T from './T';
import { PositioningNotice } from './BuyerWallet';
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
 * SOLD LISTINGS ARE NOT FILTERED HERE, and that is deliberate. Migration 011
 * took them out of listings_browse, so a sold listing never arrives in the
 * first place — there is nothing on this page that could show one by
 * mistake. The one exception is a listing this buyer already unlocked: he
 * paid for that contact, so it stays in his history with a sold tag rather
 * than disappearing. Whether it sold is read from public.listings_sold,
 * scoped to the ids he already holds.
 *
 * THE BALANCE IS REAL. It is the sum of this buyer's token_ledger deltas,
 * read on the server — purchases credited by the Razorpay webhook, unlocks
 * debited, 12-hour re-credits added back. Nothing in this file computes it,
 * adjusts it, or remembers a number of its own; the demo constant it used to
 * carry is gone. The "+ ಸೇರಿಸಿ / Add" control now goes to the wallet, where a
 * pack can actually be bought.
 *
 * UNLOCK IS REAL. It posts to /api/buyer/unlock, which calls
 * unlock_contact_for_buyer() (migration 015) — one transaction that writes
 * the unlock row, debits token_ledger, moves buyer_wallets and writes an
 * audit row. The fixture name and phone number this file used to reveal are
 * gone; what a card shows after an unlock is the farmer's real contact,
 * returned by that call and by nothing else.
 *
 * THE BROWSER NEVER WRITES A BALANCE, the rule BuyerWallet already states.
 * There is no arithmetic on the token count here: the number on screen is
 * replaced by the balance the server read back from the row it updated, and
 * a failed unlock leaves it exactly as it was. A second unlock of the same
 * listing is answered with already: true and tokens_spent 0, so the figure
 * does not move.
 *
 * AWAITING-BACKEND: nothing on this screen. The balance, the "+ ಸೇರಿಸಿ / Add"
 * control and the unlock are all wired.
 *
 * THE PRICE IS NOT WRITTEN DOWN HERE. It was, and it was wrong: this file
 * hardcoded 5 while config.unlock.cost said 1, so every screen quoted a
 * price the database would not have charged. The cost now arrives as a prop
 * read from config on the server, and there is no constant and no default
 * left to drift. If that read fails the page says so and blocks unlocking —
 * it never guesses, because a guessed price either overcharges a buyer or
 * promises him a discount that does not exist.
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

/** The farmer's contact, as the unlock call returns it. Held only for
 *  listings this buyer has actually paid to open. */
type Contact = { name: string | null; mobile: string | null };

/** A real browse row, plus whether this buyer has unlocked it in this
 *  session, the contact that unlock released, and whether the farmer has
 *  since marked the paddy sold. */
type Card = BrowseListing & { unlocked: boolean; sold: boolean; contact: Contact | null };

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

/* No UNLOCK_COST constant lives here any more, deliberately. The price of a
   farmer's contact is config.unlock.cost and nothing else; this component is
   handed it as a prop, read on the server, and has no default to fall back
   on. See src/lib/unlockPricing.ts. */

/* No START_BALANCE constant. The demo wallet is gone: the balance shown here
   is the sum of this buyer's token_ledger rows, read on the server and passed
   in. token_ledger is append-only by trigger, so it is the one figure that
   cannot be edited into being wrong, and it is the same figure the wallet
   page shows. */

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
  unlockCost,
  affordable,
  onUnlockClick,
}: {
  listing: Card;
  /** null when the price could not be read. The CTA then quotes nothing and
   *  does nothing — see the banner at the top of the page. */
  unlockCost: number | null;
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
          <div className={styles.tags}>
            {/* The farmer has marked this paddy sold. The card is kept
                because this buyer unlocked it — it is his history, and he
                paid for it — but the tag has to say so before he calls. */}
            {listing.sold && (
              <span className={styles.soldTag}>
                <T kn="ಮಾರಾಟವಾಗಿದೆ / Sold" en="ಮಾರಾಟವಾಗಿದೆ / Sold" />
              </span>
            )}
            {listing.unlocked && (
              <span className={styles.unlockedTag}>
                <T kn="ತೆರೆಯಲಾಗಿದೆ / Unlocked" en="ತೆರೆಯಲಾಗಿದೆ / Unlocked" />
              </span>
            )}
          </div>
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
          {/* listings_browse carries no identity by design. What is shown
              here came back from the unlock call, which released it only
              after the token was spent. */}
          {listing.unlocked && listing.contact ? (
            <>
              <p className={styles.farmerFull}>
                <T
                  kn={`ರೈತ: ${listing.contact.name ?? '—'}`}
                  en={`ರೈತ: ${listing.contact.name ?? '—'}`}
                />
              </p>
              <p className={styles.phoneFull}>
                <PhoneIcon />
                <T kn={listing.contact.mobile ?? '—'} en={listing.contact.mobile ?? '—'} />
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
        {listing.unlocked && listing.contact?.mobile ? (
          /* DEV-ICON: the frame's tel: dropped the country code. */
          <a
            href={`tel:+91${listing.contact.mobile.replace(/\D/g, '')}`}
            className={styles.cta}
          >
            <PhoneIcon size={15} />
            <T kn="ಕರೆ ಮಾಡಿ " en="ಕರೆ ಮಾಡಿ " />
            <span className={styles.ctaEn}>
              <T kn="/ Call" en="/ Call" />
            </span>
          </a>
        ) : (
          /* DEV-GUARD: the frame had no affordability check. With no price
             read there is nothing to quote, so the button carries no number
             and is disabled — fail closed, never a fallback figure. */
          <button
            type="button"
            onClick={() => onUnlockClick(listing.id)}
            disabled={!affordable}
            className={`${styles.cta} ${affordable ? '' : styles.ctaDisabled}`}
          >
            <Coin size={14} />
            <T
              kn={
                unlockCost === null
                  ? 'ಸಂಪರ್ಕ ತೆರೆಯಿರಿ '
                  : `ಸಂಪರ್ಕ ತೆರೆಯಿರಿ · ${unlockCost} ಟೋಕನ್ `
              }
              en={
                unlockCost === null
                  ? 'ಸಂಪರ್ಕ ತೆರೆಯಿರಿ '
                  : `ಸಂಪರ್ಕ ತೆರೆಯಿರಿ · ${unlockCost} ಟೋಕನ್ `
              }
            />
            <span className={styles.ctaEn}>
              {/* The cost is data now, so the English twin has to agree with
                  it: at cost 1 the frame's hardcoded "tokens" was wrong. */}
              <T
                kn={
                  unlockCost === null
                    ? '/ Unlock'
                    : `/ Unlock · ${unlockCost} ${unlockCost === 1 ? 'token' : 'tokens'}`
                }
                en={
                  unlockCost === null
                    ? '/ Unlock'
                    : `/ Unlock · ${unlockCost} ${unlockCost === 1 ? 'token' : 'tokens'}`
                }
              />
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

function UnlockModal({
  unlockCost,
  affordable,
  busy,
  failure,
  onConfirm,
  onCancel,
}: {
  /** Never null here: the modal cannot be opened without a price. */
  unlockCost: number;
  affordable: boolean;
  /** An unlock is in flight. Both buttons lock so a second tap cannot start
   *  a second call while the first is still deciding. */
  busy: boolean;
  /** The server's refusal code, or null. Distinct from `affordable`, which is
   *  what the screen believed before asking: the server has the last word,
   *  and a balance spent on another device lands here. */
  failure: string | null;
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
                kn={`${unlockCost} ಟೋಕನ್ ಬಳಕೆಯಾಗುತ್ತದೆ`}
                en={`${unlockCost} ಟೋಕನ್ ಬಳಕೆಯಾಗುತ್ತದೆ`}
              />
            </span>
          </div>
          <p className={styles.modalCostEn}>
            <T
              kn={`${unlockCost} ${unlockCost === 1 ? 'token' : 'tokens'} will be used`}
              en={`${unlockCost} ${unlockCost === 1 ? 'token' : 'tokens'} will be used`}
            />
          </p>
          {/* DEV-GUARD — what the screen knew before asking. */}
          {!affordable && !failure && (
            <p className={styles.modalShort}>
              <T kn="ಟೋಕನ್ ಸಾಲದು / Not enough tokens" en="ಟೋಕನ್ ಸಾಲದು / Not enough tokens" />
            </p>
          )}
          {/* What the server said. A short balance is named, and the way to
              fix it is a link rather than an instruction — nothing was spent,
              so the only thing missing is tokens. */}
          {failure === 'insufficient_balance' && (
            <p className={styles.modalShort} role="alert">
              <T
                kn="ಟೋಕನ್ ಸಾಲದು. ಯಾವ ಟೋಕನ್ ಕೂಡ ಖರ್ಚಾಗಿಲ್ಲ. "
                en="ಟೋಕನ್ ಸಾಲದು. ಯಾವ ಟೋಕನ್ ಕೂಡ ಖರ್ಚಾಗಿಲ್ಲ. "
              />
              <Link href="/buyer/wallet" className={styles.modalShortLink}>
                <T
                  kn="ಟೋಕನ್ ಸೇರಿಸಿ / Not enough tokens — nothing was spent. Add tokens"
                  en="ಟೋಕನ್ ಸೇರಿಸಿ / Not enough tokens — nothing was spent. Add tokens"
                />
              </Link>
            </p>
          )}
          {failure === 'unlock_cost_unavailable' && (
            <p className={styles.modalShort} role="alert">
              <T
                kn="ಬೆಲೆ ಸದ್ಯ ಓದಲಾಗಲಿಲ್ಲ. / The price could not be read — nothing was spent."
                en="ಬೆಲೆ ಸದ್ಯ ಓದಲಾಗಲಿಲ್ಲ. / The price could not be read — nothing was spent."
              />
            </p>
          )}
          {failure === 'listing_not_active' && (
            <p className={styles.modalShort} role="alert">
              <T
                kn="ಈ ಪಟ್ಟಿ ಈಗ ಲಭ್ಯವಿಲ್ಲ. / This listing is no longer available — nothing was spent."
                en="ಈ ಪಟ್ಟಿ ಈಗ ಲಭ್ಯವಿಲ್ಲ. / This listing is no longer available — nothing was spent."
              />
            </p>
          )}
          {failure !== null &&
            failure !== 'insufficient_balance' &&
            failure !== 'unlock_cost_unavailable' &&
            failure !== 'listing_not_active' && (
              <p className={styles.modalShort} role="alert">
                <T
                  kn="ಆಗಲಿಲ್ಲ. ಮತ್ತೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸಿ. / That did not work — nothing was spent."
                  en="ಆಗಲಿಲ್ಲ. ಮತ್ತೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸಿ. / That did not work — nothing was spent."
                />
              </p>
            )}
        </div>

        {/* What PaddyLink is, what to check, and the one refund rule — said
            before the token is spent rather than after. The same three lines
            the wallet carries, rendered from the same source so the two
            screens cannot drift apart. The refund line is the 12-hour promise
            mark_listing_sold() (011) actually keeps, now stating plainly that
            it is the only one. */}
        <PositioningNotice compact />

        <div className={styles.safety}>
          <p className={styles.safetyKn}>
            <T kn="ನೆನಪಿಡಿ: ಪಾವತಿ ಮೊದಲು, ನಂತರ ಭತ್ತ." en="ನೆನಪಿಡಿ: ಪಾವತಿ ಮೊದಲು, ನಂತರ ಭತ್ತ." />
          </p>
          <p className={styles.safetyEn}>
            <T kn="Remember: Payment first, paddy second." en="Remember: Payment first, paddy second." />
          </p>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={styles.cancel}
          >
            <T kn="ರದ್ದು " en="ರದ್ದು " />
            <span className={styles.actionEn}>
              <T kn="/ Cancel" en="/ Cancel" />
            </span>
          </button>
          <button
            type="button"
            ref={confirmRef}
            onClick={onConfirm}
            disabled={!affordable || busy}
            className={`${styles.confirm} ${affordable && !busy ? '' : styles.confirmDisabled}`}
          >
            <T kn={busy ? 'ತೆರೆಯುತ್ತಿದೆ ' : 'ಒಪ್ಪಿಗೆ '} en={busy ? 'ತೆರೆಯುತ್ತಿದೆ ' : 'ಒಪ್ಪಿಗೆ '} />
            <span className={styles.actionEn}>
              <T kn={busy ? '/ Opening…' : '/ Confirm'} en={busy ? '/ Opening…' : '/ Confirm'} />
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
  unlockCost,
  balance: initialBalance,
  signedIn,
  districts,
  varieties,
}: {
  initialListings: BrowseListing[];
  /** config.unlock.cost, read on the server. null means the read failed:
   *  the page shows an error and unlocking is blocked. There is no default. */
  unlockCost: number | null;
  /** Sum of token_ledger.delta for this buyer, read on the server. null when
   *  we cannot tell which buyer this is — shown as such, never as a number. */
  balance: number | null;
  /** Whether this device carries a buyer session. Unlike /buyer/wallet and the
   *  farmer pages, this route does not redirect without one — a buyer can
   *  browse the market signed out — so the sign-out control is conditional
   *  here and offered only when there is something to sign out of. */
  signedIn: boolean;
  districts: RefDistrict[];
  varieties: RefVariety[];
}) {
  const [rows, setRows] = useState<BrowseListing[]>(initialListings);
  /* Unlocks live in their own state, not derived from the current result
     set: filtering a card out must not forget that it was unlocked, or the
     state vanishes the moment a buyer looks at another district. The whole
     ROW is kept, not just the id — once the farmer marks the paddy sold it
     leaves listings_browse for good, and this snapshot is then the only copy
     of what he unlocked. History is never dropped.

     The contact is kept beside the row because it arrives with the unlock
     and lives nowhere else on this page: listings_browse carries no
     identity. A reload empties this map, and the card goes back to masked —
     the buyer opens it again and the server answers already: true, charging
     nothing. He is never charged twice for the same listing. */
  const [unlockedRows, setUnlockedRows] = useState<
    Map<string, { row: BrowseListing; contact: Contact }>
  >(() => new Map());
  /* The ledger's number. Seeded from the server read and only ever REPLACED
     by another server read — never incremented or decremented here. */
  const [balance, setBalance] = useState<number | null>(initialBalance);
  /* Set while an unlock is in flight, and cleared when the server answers. */
  const [unlocking, setUnlocking] = useState(false);
  /* Why the last unlock did not happen. 'insufficient_balance' gets its own
     wording and a way to the wallet; anything else is the generic failure. */
  const [unlockError, setUnlockError] = useState<string | null>(null);
  /* Which of those the farmer has since marked sold. Read from
     public.listings_sold, asked only about ids this buyer already holds. */
  const [soldIds, setSoldIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);
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

  /* Re-checked whenever the market moves or a new unlock is added: a listing
     that has dropped out of the result set may simply not match the filter,
     or the farmer may have marked it sold, and only the database knows
     which. Scoped to this buyer's own unlocked ids — never a sweep of the
     market. */
  const unlockedKey = [...unlockedRows.keys()].sort().join(',');
  useEffect(() => {
    const ids = unlockedKey ? unlockedKey.split(',') : [];
    if (ids.length === 0) return;
    let cancelled = false;
    getSoldIds(ids, supabase)
      .then((next) => {
        if (!cancelled) setSoldIds(next);
      })
      .catch((e) => console.error('[buyer listings] sold check failed', e));
    return () => {
      cancelled = true;
    };
  }, [unlockedKey, rows, supabase]);

  /* An unlocked-and-sold listing is no longer in the query result, so it is
     re-joined from the snapshot. It still answers to the filters — a buyer
     narrowing to one district should not be shown paddy from another — so
     the same four rules are applied to the snapshot row, which carries every
     column they test. Nothing sold and unpaid-for can arrive this way: the
     only ids in the map are ones this buyer unlocked himself. */
  const history: Card[] = useMemo(() => {
    const live = new Set(rows.map((r) => r.id));
    const month = monthFilter ? Number(monthFilter) : 0;
    return [...unlockedRows.values()]
      .filter(({ row: r }) => soldIds.has(r.id) && !live.has(r.id))
      .filter(({ row: r }) => !districtFilter || r.district_en === districtFilter)
      .filter(({ row: r }) => !varietyFilter || r.variety_en === varietyFilter)
      .filter(({ row: r }) => !month || Number(r.harvest_month.slice(5, 7)) === month)
      .filter(({ row: r }) => !qualityOnly || r.quality_checked_at != null)
      .map(({ row: r, contact }) => ({ ...r, unlocked: true, sold: true, contact }));
  }, [rows, unlockedRows, soldIds, districtFilter, varietyFilter, monthFilter, qualityOnly]);

  const filtered: Card[] = useMemo(
    () => [
      ...rows.map((r) => ({
        ...r,
        unlocked: unlockedRows.has(r.id),
        sold: soldIds.has(r.id),
        contact: unlockedRows.get(r.id)?.contact ?? null,
      })),
      ...history,
    ],
    [rows, unlockedRows, soldIds, history],
  );
  /* No price, no unlocking; no known buyer, no unlocking either. The balance
     check only means anything once there is a cost to check it against. */
  const priced = unlockCost !== null;
  const affordable = priced && balance !== null && balance >= unlockCost;

  const clearFilters = useCallback(() => {
    setDistrictFilter('');
    setVarietyFilter('');
    setMonthFilter('');
    setQualityOnly(false);
  }, []);

  const closeModal = useCallback(() => {
    if (unlocking) return;
    setUnlockTarget(null);
    setUnlockError(null);
  }, [unlocking]);

  async function handleUnlockConfirm() {
    if (unlockTarget === null || unlockCost === null || unlocking) return;
    const row = rows.find((r) => r.id === unlockTarget);
    if (!row) return;

    setUnlocking(true);
    setUnlockError(null);
    try {
      /* The listing id and nothing else. The price is not sent — the server
         reads it from config and the function reads it again, so there is no
         amount here for a browser to argue with. */
      const res = await fetch('/api/buyer/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: unlockTarget }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        /* Nothing was spent and nothing is revealed. The balance on screen is
           left exactly as the last server read left it. */
        setUnlockError(typeof body?.error === 'string' ? body.error : `HTTP ${res.status}`);
        setUnlocking(false);
        return;
      }

      /* The row is snapshotted, not just its id: this is the buyer's copy of
         what he unlocked, and it has to outlive the listing leaving the
         market. The contact rides with it. */
      setUnlockedRows((prev) =>
        new Map(prev).set(unlockTarget, {
          row,
          contact: { name: body.farmerName ?? null, mobile: body.farmerMobile ?? null },
        }),
      );
      /* REPLACED, not decremented. This is the figure the server read back
         from the wallet row it updated; on an already-unlocked listing it
         comes back unchanged, which is exactly right. */
      if (typeof body.balance === 'number') setBalance(body.balance);
      setUnlockTarget(null);
    } catch {
      setUnlockError('network');
    }
    setUnlocking(false);
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
              <T
                kn={balance === null ? '— ಟೋಕನ್' : `${balance} ಟೋಕನ್`}
                en={balance === null ? '— ಟೋಕನ್' : `${balance} ಟೋಕನ್`}
              />
            </span>
          </div>
          {/* Now goes somewhere: the wallet, where a pack can be bought. */}
          <Link href="/buyer/wallet" className={styles.addLink}>
            <T kn="+ ಸೇರಿಸಿ " en="+ ಸೇರಿಸಿ " />
            <span className={styles.addLinkEn}>
              <T kn="/ Add" en="/ Add" />
            </span>
          </Link>
          {/* Sign out — the admin chrome's pattern, form-posted to a route
              that clears the cookie and redirects. Wears .addLink, the bar's
              own link treatment, which is already written to sit on a
              <button>; no new class and no new colour. */}
          {signedIn && (
            <form method="post" action="/buyer/logout">
              <button type="submit" className={styles.addLink}>
                <T kn="ಲಾಗ್ ಔಟ್ " en="ಲಾಗ್ ಔಟ್ " />
                <span className={styles.addLinkEn}>
                  <T kn="/ Sign out" en="/ Sign out" />
                </span>
              </button>
            </form>
          )}
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

      {/* FAIL CLOSED — not in the frame. The price of a contact comes from
          config.unlock.cost; if that read failed there is no honest number to
          put on the button, so unlocking stops rather than quoting a guess.
          Browsing is unaffected: the listings themselves are still true. */}
      {!priced && (
        <p className={styles.priceError} role="alert">
          <span className={styles.priceErrorKn}>
            <T
              kn="ಟೋಕನ್ ದರ ಸದ್ಯ ಓದಲಾಗಲಿಲ್ಲ. ಸಂಪರ್ಕ ತೆರೆಯುವುದು ತಾತ್ಕಾಲಿಕವಾಗಿ ನಿಂತಿದೆ."
              en="ಟೋಕನ್ ದರ ಸದ್ಯ ಓದಲಾಗಲಿಲ್ಲ. ಸಂಪರ್ಕ ತೆರೆಯುವುದು ತಾತ್ಕಾಲಿಕವಾಗಿ ನಿಂತಿದೆ."
            />
          </span>
          <span className={styles.priceErrorEn}>
            <T
              kn="/ The token price could not be read, so unlocking is paused. Listings below are unaffected."
              en="/ The token price could not be read, so unlocking is paused. Listings below are unaffected."
            />
          </span>
        </p>
      )}

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
                unlockCost={unlockCost}
                affordable={affordable}
                onUnlockClick={setUnlockTarget}
              />
            ))
          )}
        </div>
      </div>

      {/* unlockCost is re-tested here, not just at the button: the modal
          quotes the price, so it must not exist without one. */}
      {unlockTarget !== null && unlockCost !== null && (
        <UnlockModal
          unlockCost={unlockCost}
          affordable={affordable}
          busy={unlocking}
          failure={unlockError}
          onConfirm={handleUnlockConfirm}
          onCancel={closeModal}
        />
      )}
    </main>
  );
}
