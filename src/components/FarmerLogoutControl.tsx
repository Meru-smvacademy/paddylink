'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import shell from './OtpFlow.module.css';
import styles from './FarmerListings.module.css';

/**
 * ಲಾಗ್ ಔಟ್ with a confirm step, for the listing EDIT screen only.
 *
 * WHY ONLY HERE. Every other surface's sign-out is a single tap, and that is
 * right: leaving a list costs nothing. This screen holds unsaved edits, so a
 * mis-tap here throws away work the farmer has already typed — the same
 * reasoning FarmerSoldControl gives for never firing on a single tap. The
 * plain control stays on /farmer/listings and on the buyer surfaces, and the
 * admin control is untouched.
 *
 * NO NEW VISUAL LANGUAGE. The sheet is FarmerSoldControl's, class for class —
 * the same overlay, geometry, title, body and two-button row, which are
 * themselves the buyer unlock modal's — and the trigger keeps the .signOut
 * treatment it already had on this page. Nothing new is defined here; both
 * stylesheets are imported and neither is edited.
 *
 * THE LOGOUT ITSELF IS STILL A PLAIN FORM POST. The confirm button is a real
 * submit inside a real <form> aimed at /farmer/logout, so the browser follows
 * the route's 303 exactly as it does from the one-tap control. There is no
 * fetch here: signing out must not depend on client JS succeeding, and the
 * sheet is the only part of this that needs the browser.
 *
 * NO FAILURE STATE, deliberately. The sold sheet has one because it fetches
 * and can be told no. A form post either navigates or the browser reports it;
 * there is no in-page failure this component could render, and a state that
 * can never fire is a state nobody has tested.
 *
 * KANNADA ONLY, like the screen it sits on and the sheet it borrows: the ಕ|EN
 * toggle leaves it unchanged, so no <T> appears here.
 */

const COPY = {
  control: 'ಲಾಗ್ ಔಟ್',
  title: 'ಲಾಗ್ ಔಟ್ ಮಾಡುವುದೇ?',
  body: 'ಈ ಪುಟದಲ್ಲಿ ಉಳಿಸದ ಬದಲಾವಣೆಗಳು ಹೋಗುತ್ತವೆ.',
  confirm: 'ಹೌದು, ಲಾಗ್ ಔಟ್',
  cancel: 'ರದ್ದು',
} as const;

function ConfirmSheet({
  busy,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  /* The sold sheet's treatment, unchanged: dialog role, Escape, a focus trap
     and a backdrop that listens. */
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
        aria-labelledby="logout-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="logout-confirm-title" className={styles.sheetTitle}>
          {COPY.title}
        </h2>
        <p className={styles.sheetBody}>{COPY.body}</p>

        {/* The confirm is a submit inside the form that carries the POST, so
            the route's redirect is followed by the browser, not by us. */}
        <form
          method="post"
          action="/farmer/logout"
          onSubmit={onSubmit}
          className={styles.sheetActions}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={styles.sheetCancel}
          >
            {COPY.cancel}
          </button>
          <button type="submit" ref={confirmRef} disabled={busy} className={styles.sheetConfirm}>
            {COPY.confirm}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function FarmerLogoutControl() {
  const [open, setOpen] = useState(false);
  /* Set on submit and never cleared: the page is navigating away, and the
     only job left is to stop a second tap starting a second post. */
  const [busy, setBusy] = useState(false);

  const close = useCallback(() => {
    if (busy) return;
    setOpen(false);
  }, [busy]);

  return (
    <>
      <button type="button" className={shell.signOut} onClick={() => setOpen(true)}>
        {COPY.control}
      </button>
      {open && (
        <ConfirmSheet busy={busy} onCancel={close} onSubmit={() => setBusy(true)} />
      )}
    </>
  );
}
