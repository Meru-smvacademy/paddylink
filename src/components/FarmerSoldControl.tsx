'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './FarmerListings.module.css';

/**
 * The ಮಾರಾಟವಾಗಿದೆ control on a farmer's own listing card, and its confirm
 * step. The only interactive thing on /farmer/listings, so it is the only
 * client component the page loads.
 *
 * NO NEW VISUAL LANGUAGE. The control is the frame's own row-action
 * treatment, the one ಎಡಿಟ್ already uses — same family, size, weight and
 * green — with a real handler behind it instead of aria-disabled. The
 * confirm sheet reuses the site's established modal geometry from the buyer
 * unlock modal (gadde-950 at 55% overlay, hottu-50 sheet, 1rem radius,
 * hottu-200 border, 24rem cap) and the accessibility work that was added
 * there. No new token, no new colour.
 *
 * NEVER ON A SINGLE TAP. Both directions go through the sheet. A farmer's
 * phone lives in a pocket and a mis-tap here takes his paddy off the market
 * or puts it back on it.
 *
 * KANNADA ONLY, like the page it sits on: the ಕ|EN toggle leaves it
 * unchanged, so no <T> appears here.
 *
 * The word ಟೋಕನ್ does not appear anywhere in this file, and must not. The
 * 12-hour re-credit is the buyer's side of the same event and is disclosed on
 * the buyer's unlock confirm screen. A farmer is never told, and never shown,
 * what his sale costs the platform in tokens.
 *
 * NO DELETE. This control has exactly two destinations, 'active' and 'sold',
 * and both keep the row. There is no remove path here.
 */

/** New copy, and the only new copy in this diff: requirement 4 needs a label
 *  for the way back, and the frame has no frame for it. Written in the
 *  page's own register — plain imperative Kannada, no English twin. */
const COPY = {
  sold: {
    control: 'ಮಾರಾಟವಾಗಿದೆ',
    title: 'ಈ ಪಟ್ಟಿ ಮಾರಾಟವಾಗಿದೆಯೇ?',
    body: 'ಖರೀದಿದಾರರಿಗೆ ಇದು ಇನ್ನು ಕಾಣಿಸುವುದಿಲ್ಲ. ನಿಮ್ಮ ಪಟ್ಟಿಯಲ್ಲಿ ಹಾಗೆಯೇ ಉಳಿಯುತ್ತದೆ.',
    confirm: 'ಹೌದು, ಮಾರಾಟವಾಗಿದೆ',
  },
  active: {
    control: 'ಮತ್ತೆ ಸಕ್ರಿಯಗೊಳಿಸಿ',
    title: 'ಮತ್ತೆ ಸಕ್ರಿಯಗೊಳಿಸುವುದೇ?',
    body: 'ಖರೀದಿದಾರರಿಗೆ ಇದು ಮತ್ತೆ ಕಾಣಿಸುತ್ತದೆ.',
    confirm: 'ಹೌದು, ಸಕ್ರಿಯಗೊಳಿಸಿ',
  },
} as const;

const CANCEL = 'ರದ್ದು';
const FAILED = 'ಆಗಲಿಲ್ಲ. ಮತ್ತೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸಿ.';

function ConfirmSheet({
  copy,
  busy,
  failed,
  onConfirm,
  onCancel,
}: {
  copy: (typeof COPY)[keyof typeof COPY];
  busy: boolean;
  failed: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  /* Same treatment the buyer unlock modal got: dialog role, Escape, a focus
     trap and a backdrop that listens. */
  useEffect(() => {
    confirmRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }
      if (e.key !== 'Tab' || !sheetRef.current) return;
      const items = sheetRef.current.querySelectorAll<HTMLElement>('button:not([disabled])');
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

  return (
    <div className={styles.overlay} onClick={onCancel} role="presentation">
      <div
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sold-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="sold-confirm-title" className={styles.sheetTitle}>
          {copy.title}
        </h2>
        <p className={styles.sheetBody}>{copy.body}</p>

        {failed && (
          <p className={styles.sheetError} role="alert">
            {FAILED}
          </p>
        )}

        <div className={styles.sheetActions}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={styles.sheetCancel}
          >
            {CANCEL}
          </button>
          <button
            type="button"
            ref={confirmRef}
            onClick={onConfirm}
            disabled={busy}
            className={styles.sheetConfirm}
          >
            {copy.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FarmerSoldControl({
  listingId,
  status,
}: {
  listingId: string;
  /** Where the listing is now. The control offers the other one. */
  status: 'active' | 'sold';
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  /* An active listing is being marked sold; a sold one is going back. */
  const target = status === 'active' ? 'sold' : 'active';
  const copy = COPY[target];

  const close = useCallback(() => {
    if (busy) return;
    setOpen(false);
    setFailed(false);
  }, [busy]);

  async function confirm() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch('/api/farmer/listings/sold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        /* The listing id and the direction. Nothing that identifies the
           farmer — the route takes that from the httpOnly cookie, and a
           number sent from here would not be believed anyway. */
        body: JSON.stringify({ listing_id: listingId, sold: target === 'sold' }),
      });
      if (!res.ok) {
        setBusy(false);
        setFailed(true);
        return;
      }
      setOpen(false);
      /* The card is server-rendered from the database, so the truth comes
         back from there rather than from optimistic local state. */
      router.refresh();
    } catch {
      setBusy(false);
      setFailed(true);
      return;
    }
    setBusy(false);
  }

  return (
    <>
      <button type="button" className={styles.soldBtn} onClick={() => setOpen(true)}>
        {copy.control}
      </button>
      {open && (
        <ConfirmSheet
          copy={copy}
          busy={busy}
          failed={failed}
          onConfirm={confirm}
          onCancel={close}
        />
      )}
    </>
  );
}
