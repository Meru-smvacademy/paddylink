'use client';

import { useState } from 'react';
import T from './T';
import styles from './FarmerListingForm.module.css';

/**
 * Farmer listing form — ported from Figma Make file GrgKytpvcZYRwTpZsAM9wa
 * (src/App.tsx, FormScreen, pre-submit branch). Piece 2 of 3; the success
 * screen is piece 3 and is deliberately not built here.
 *
 * AWAITING-BACKEND: submitting sends nothing anywhere. There is no request,
 * no storage and no upload — the photo input is inert exactly as it is in
 * the frame. Submit only reveals the piece-3 stub panel.
 *
 * LANGUAGE: the frame prints a Kannada label over a small English one and
 * has no working toggle. That stack is preserved and the site ಕ|EN control
 * does not flip it, so every <T> carries the same string in both slots.
 *
 * Two departures from the frame, both flagged in the report:
 * - CONSENT-FIX: the frame's custom checkbox carries its own onClick while
 *   also sitting inside a <label> wrapping the real input, so every click
 *   toggled twice and the box never changed. Wired here as a single toggle,
 *   because consent gates submit and the frame's version cannot be ticked.
 * - VALIDATION-ADDED: the frame has no per-field validation of any kind.
 *   Per brief, required fields flag on blur using the kemmannu-600 error
 *   treatment from the OTP screen in this same file. The frame supplies no
 *   error copy, so this shows the error border and aria-invalid only — no
 *   invented Kannada sentences.
 */

const TALUKS: Record<string, string[]> = {
  ರಾಯಚೂರು: ['ರಾಯಚೂರು', 'ಮಾನ್ವಿ', 'ಲಿಂಗಸೂಗೂರು', 'ದೇವದುರ್ಗ', 'ಸಿಂಧನೂರು'],
  ಕೊಪ್ಪಳ: ['ಕೊಪ್ಪಳ', 'ಗಂಗಾವತಿ', 'ಕುಷ್ಟಗಿ', 'ಯಲಬುರ್ಗ'],
  ಯಾದಗಿರಿ: ['ಯಾದಗಿರಿ', 'ಶಹಾಪುರ', 'ಸುರಪುರ', 'ಗುರುಮಠಕಲ್'],
};

const VARIETIES = [
  { value: 'sona', label: 'ಸೋನಾ ಮಸೂರಿ' },
  { value: 'rnr', label: 'RNR 15048' },
  { value: 'bpt', label: 'BPT 5204' },
  { value: 'ganga', label: 'ಗಂಗಾ ಕಾವೇರಿ' },
  { value: 'other', label: 'ಇತರೆ / Other' },
];

type Field = 'name' | 'variety' | 'quantity' | 'district' | 'taluk' | 'harvestMonth';

export default function FarmerListingForm() {
  const [form, setForm] = useState({
    name: '',
    variety: '',
    quantity: '',
    district: '',
    taluk: '',
    harvestMonth: '',
    consent: false,
  });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  function set(key: string, val: string | boolean) {
    setForm((f) => ({
      ...f,
      [key]: val,
      // Changing district clears the dependent taluk, as the frame does.
      ...(key === 'district' ? { taluk: '' } : {}),
    }));
  }

  const quantityValid = form.quantity !== '' && Number(form.quantity) >= 1;

  const invalid: Record<Field, boolean> = {
    name: form.name.trim() === '',
    variety: form.variety === '',
    quantity: !quantityValid,
    district: form.district === '',
    taluk: form.taluk === '',
    harvestMonth: form.harvestMonth === '',
  };

  const showError = (f: Field) => Boolean(touched[f]) && invalid[f];
  const blur = (f: Field) => setTouched((t) => ({ ...t, [f]: true }));

  const canSubmit = !Object.values(invalid).some(Boolean) && form.consent;
  const taluks = form.district ? TALUKS[form.district] ?? [] : [];

  return (
    <div className={styles.shell}>
      <div className={styles.head}>
        <h1 className={styles.headKn}>
          <T kn="ನಿಮ್ಮ ಭತ್ತ ಪಟ್ಟಿ ಮಾಡಿ" en="ನಿಮ್ಮ ಭತ್ತ ಪಟ್ಟಿ ಮಾಡಿ" />
        </h1>
        <p className={styles.headEn}>
          <T kn="List your paddy" en="List your paddy" />
        </p>
        <div className={styles.headRule} />
      </div>

      {/* Voice — rendered as designed, deliberately non-functional. */}
      <div className={styles.voice}>
        <button
          type="button"
          className={styles.voiceBtn}
          aria-label="Voice input"
          aria-disabled="true"
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <rect x="15" y="6" width="10" height="18" rx="5" fill="var(--gadde-950)" />
            <path
              d="M8 20 C8 27.18 13.37 33 20 33 C26.63 33 32 27.18 32 20"
              stroke="var(--gadde-950)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line x1="20" y1="33" x2="20" y2="38" stroke="var(--gadde-950)" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="14" y1="38" x2="26" y2="38" stroke="var(--gadde-950)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
        <div className={styles.voiceBody}>
          <p className={styles.voiceKn}>
            <T kn="ಧ್ವನಿಯಲ್ಲಿ ಹೇಳಿ, ನಾವು ಬರೆಯುತ್ತೇವೆ" en="ಧ್ವನಿಯಲ್ಲಿ ಹೇಳಿ, ನಾವು ಬರೆಯುತ್ತೇವೆ" />
          </p>
          <p className={styles.voiceEn}>
            <T kn="Speak, we fill the form" en="Speak, we fill the form" />
          </p>
          <span className={styles.voiceBadge}>
            <T kn="ಶೀಘ್ರದಲ್ಲಿ / Coming soon" en="ಶೀಘ್ರದಲ್ಲಿ / Coming soon" />
          </span>
        </div>
      </div>

      <div className={styles.fields}>
        {/* 1. Name */}
        <div>
          <label className={styles.label} htmlFor="f-name">
            <T kn="ಹೆಸರು" en="ಹೆಸರು" /> <span className={styles.req}>*</span>
          </label>
          <span className={styles.subLabel}>
            <T kn="Your name" en="Your name" />
          </span>
          <input
            id="f-name"
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            onBlur={() => blur('name')}
            placeholder="ನಿಮ್ಮ ಹೆಸರು ನಮೂದಿಸಿ"
            aria-invalid={showError('name')}
            className={`${styles.control} ${showError('name') ? styles.controlError : ''}`}
          />
        </div>

        {/* 2. Variety */}
        <div>
          <label className={styles.label} htmlFor="f-variety">
            <T kn="ತಳಿ" en="ತಳಿ" /> <span className={styles.req}>*</span>
          </label>
          <span className={styles.subLabel}>
            <T kn="Variety" en="Variety" />
          </span>
          <select
            id="f-variety"
            value={form.variety}
            onChange={(e) => set('variety', e.target.value)}
            onBlur={() => blur('variety')}
            aria-invalid={showError('variety')}
            className={`${styles.control} ${showError('variety') ? styles.controlError : ''}`}
          >
            <option value="">ತಳಿ ಆರಿಸಿ / Select variety</option>
            {VARIETIES.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Quantity */}
        <div>
          <label className={styles.label} htmlFor="f-qty">
            <T kn="ಪ್ರಮಾಣ" en="ಪ್ರಮಾಣ" /> <span className={styles.req}>*</span>
          </label>
          <span className={styles.subLabel}>
            <T kn="Quantity" en="Quantity" />
          </span>
          <div className={`${styles.qtyRow} ${showError('quantity') ? styles.qtyRowError : ''}`}>
            <input
              id="f-qty"
              type="number"
              inputMode="numeric"
              min="1"
              value={form.quantity}
              onChange={(e) => set('quantity', e.target.value)}
              onBlur={() => blur('quantity')}
              placeholder="0"
              aria-invalid={showError('quantity')}
              className={styles.qtyInput}
            />
            <span className={styles.qtyUnit}>ಕ್ವಿಂಟಾಲ್</span>
          </div>
        </div>

        {/* 4 + 5. District and dependent taluk */}
        <div className={styles.rowTwo}>
          <div>
            <label className={styles.label} htmlFor="f-district">
              <T kn="ಜಿಲ್ಲೆ" en="ಜಿಲ್ಲೆ" /> <span className={styles.req}>*</span>
            </label>
            <span className={styles.subLabel}>
              <T kn="District" en="District" />
            </span>
            <select
              id="f-district"
              value={form.district}
              onChange={(e) => set('district', e.target.value)}
              onBlur={() => blur('district')}
              aria-invalid={showError('district')}
              className={`${styles.control} ${showError('district') ? styles.controlError : ''}`}
            >
              <option value="">ಜಿಲ್ಲೆ ಆರಿಸಿ</option>
              {Object.keys(TALUKS).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={styles.label} htmlFor="f-taluk">
              <T kn="ತಾಲ್ಲೂಕು" en="ತಾಲ್ಲೂಕು" /> <span className={styles.req}>*</span>
            </label>
            <span className={styles.subLabel}>
              <T kn="Taluk" en="Taluk" />
            </span>
            <select
              id="f-taluk"
              value={form.taluk}
              onChange={(e) => set('taluk', e.target.value)}
              onBlur={() => blur('taluk')}
              disabled={!form.district}
              aria-invalid={showError('taluk')}
              className={`${styles.control} ${showError('taluk') ? styles.controlError : ''}`}
            >
              <option value="">ತಾಲ್ಲೂಕು ಆರಿಸಿ</option>
              {taluks.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 6. Harvest month */}
        <div>
          <label className={styles.label} htmlFor="f-month">
            <T kn="ಕಟಾವು ತಿಂಗಳು" en="ಕಟಾವು ತಿಂಗಳು" /> <span className={styles.req}>*</span>
          </label>
          <span className={styles.subLabel}>
            <T kn="Harvest month" en="Harvest month" />
          </span>
          <input
            id="f-month"
            type="month"
            value={form.harvestMonth}
            onChange={(e) => set('harvestMonth', e.target.value)}
            onBlur={() => blur('harvestMonth')}
            aria-invalid={showError('harvestMonth')}
            className={`${styles.control} ${showError('harvestMonth') ? styles.controlError : ''}`}
          />
        </div>

        {/* 7. Photo — optional, and inert exactly as the frame has it. */}
        <div>
          <span className={styles.label}>
            <T kn="ಫೋಟೋ" en="ಫೋಟೋ" />
            <span className={styles.optional}>
              <T kn="(ಐಚ್ಛಿಕ / Optional)" en="(ಐಚ್ಛಿಕ / Optional)" />
            </span>
          </span>
          <span className={styles.subLabel}>
            <T kn="Photo" en="Photo" />
          </span>
          <label className={styles.drop}>
            <span className={styles.dropIcon}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                <path
                  d="M4 20V8a2 2 0 012-2h2l2-3h8l2 3h2a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2z"
                  stroke="var(--gadde-600)"
                  strokeWidth="1.8"
                />
                <circle cx="14" cy="14" r="3.5" stroke="var(--gadde-600)" strokeWidth="1.8" />
              </svg>
            </span>
            <p className={styles.dropKn}>
              <T kn="ಫೋಟೋ ಅಪ್ಲೋಡ್ ಮಾಡಿ" en="ಫೋಟೋ ಅಪ್ಲೋಡ್ ಮಾಡಿ" />
            </p>
            <p className={styles.dropEn}>
              <T kn="Click to upload" en="Click to upload" />
            </p>
            {/* AWAITING-BACKEND: nothing reads this file, as in the frame. */}
            <input type="file" accept="image/*" className={styles.srOnly} />
          </label>
        </div>

        {/* Consent — CONSENT-FIX: single toggle, see header note. */}
        <div className={styles.consent}>
          <label className={styles.consentLabel}>
            <span className={styles.consentBoxWrap}>
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) => set('consent', e.target.checked)}
                className={`${styles.srOnly} ${styles.consentInput}`}
              />
              <span
                className={`${styles.consentBox} ${form.consent ? styles.consentBoxOn : ''}`}
                aria-hidden="true"
              >
                {form.consent && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M2.5 7L5.5 10L11.5 4"
                      stroke="var(--bhatta-200)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
            </span>
            <span>
              <p className={styles.consentKn}>
                <T
                  kn="ಖರೀದಿದಾರರು ಸಂಪರ್ಕ ತೆರೆದಾಗ ನನ್ನ ಹೆಸರು ಮತ್ತು ಫೋನ್ ನಂಬರ್ ಹಂಚಿಕೊಳ್ಳಲು ಒಪ್ಪುತ್ತೇನೆ"
                  en="ಖರೀದಿದಾರರು ಸಂಪರ್ಕ ತೆರೆದಾಗ ನನ್ನ ಹೆಸರು ಮತ್ತು ಫೋನ್ ನಂಬರ್ ಹಂಚಿಕೊಳ್ಳಲು ಒಪ್ಪುತ್ತೇನೆ"
                />
              </p>
              <p className={styles.consentEn}>
                <T
                  kn="I agree to share my name and phone number when a verified buyer unlocks my contact."
                  en="I agree to share my name and phone number when a verified buyer unlocks my contact."
                />
              </p>
            </span>
          </label>
        </div>

        {/* Submit — AWAITING-BACKEND: reveals the piece-3 stub only. */}
        <button
          type="button"
          onClick={() => canSubmit && setSubmitted(true)}
          disabled={!canSubmit}
          className={`${styles.submit} ${canSubmit ? styles.submitReady : ''}`}
        >
          <T kn="ಪಟ್ಟಿ ಮಾಡಿ" en="ಪಟ್ಟಿ ಮಾಡಿ" />
          <span className={styles.submitEn}>
            <T kn="/ List it" en="/ List it" />
          </span>
        </button>

        {submitted && (
          <div className={styles.stub} role="status">
            <p className={styles.stubKn}>
              <T kn="ಯಶಸ್ಸು ಶೀಘ್ರದಲ್ಲಿ" en="ಯಶಸ್ಸು ಶೀಘ್ರದಲ್ಲಿ" />
            </p>
            <p className={styles.stubEn}>
              <T kn="Success screen coming soon" en="Success screen coming soon" />
            </p>
          </div>
        )}

        <div className={styles.tail} />
      </div>
    </div>
  );
}
