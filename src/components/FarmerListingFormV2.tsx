'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './FarmerListingFormV2.module.css';

/**
 * Farmer listing form, redesigned — ported from Figma Make file
 * RaEviXLLlGJv2UI7Bp7xy3 (src/App.tsx). Field order, copy and layout are the
 * frame's, verbatim.
 *
 * Replaces FarmerListingForm in the /login/farmer flow, in the same slot:
 * after OTP verify, before the success screen. The old component stays in the
 * repo unused, for history.
 *
 * AWAITING-BACKEND: submitting sends nothing anywhere. There is no request,
 * no storage and no upload — a chosen photo is read in the browser for its
 * preview and never leaves it. Submit only advances the flow to the success
 * screen, and every value typed is discarded.
 *
 * DEV-KN-ONLY: this screen carries no English at all, by CEO decision — it is
 * the farmer's screen and speaks his language. The ಕ|EN toggle leaves it
 * unchanged, so no <T> appears here; the strings are Kannada, full stop. The
 * only Latin on the page is the frame's own "JPG, PNG · 10MB ಗರಿಷ್ಠ".
 *
 * CEO-approved deviations, each marked at its site:
 * - DEV-CONSENT  the frame's consent sentence named a different platform
 *                (ಹೊಟ್ಟು) and told the farmer his contact details would be
 *                displayed, which is untrue — contact is masked and released
 *                only when a verified buyer unlocks it. Replaced wholesale
 *                with the CEO's wording.
 * - DEV-PALETTE  the frame's mud-* family and its gadde-50/200/400 steps
 *                mapped by role onto the existing ramp; no new tokens. Full
 *                map in the stylesheet header.
 * - DEV-UPLOAD   the frame promises "10MB ಗರಿಷ್ಠ" and checks nothing, and
 *                accepts image/* while naming only JPG and PNG. The size is
 *                enforced and accept is narrowed to the three extensions.
 * - DEV-A11Y     the month grid was twelve bare buttons with no grouping and
 *                no pressed state; the mic tile looked tappable and was not.
 *
 * Built verbatim per the character-for-character rule, logged for the backend
 * data pass: the district list holds 30 entries and omits ಚಿತ್ರದುರ್ಗ, so a
 * Chitradurga farmer cannot pick his district. The canonical list will come
 * from the database.
 *
 * Also logged as a deliberate divergence: this Make file ships its own
 * success screen ("ಯಶಸ್ವಿಯಾಗಿ ಪಟ್ಟಿ ಆಯಿತು!"), which is NOT built. The flow
 * keeps the existing FarmerSuccess screen, per brief.
 */

const DISTRICTS = [
  'ಬೆಂಗಳೂರು ನಗರ',
  'ಬೆಂಗಳೂರು ಗ್ರಾಮಾಂತರ',
  'ತುಮಕೂರು',
  'ಕೋಲಾರ',
  'ಚಿಕ್ಕಬಳ್ಳಾಪುರ',
  'ರಾಮನಗರ',
  'ಚಾಮರಾಜನಗರ',
  'ಮಂಡ್ಯ',
  'ಮೈಸೂರು',
  'ಹಾಸನ',
  'ಚಿಕ್ಕಮಗಳೂರು',
  'ದಾವಣಗೆರೆ',
  'ಶಿವಮೊಗ್ಗ',
  'ಉಡುಪಿ',
  'ದಕ್ಷಿಣ ಕನ್ನಡ',
  'ಕೊಡಗು',
  'ಉತ್ತರ ಕನ್ನಡ',
  'ಧಾರವಾಡ',
  'ಹಾವೇರಿ',
  'ಗದಗ',
  'ಬಾಗಲಕೋಟೆ',
  'ವಿಜಯಪುರ',
  'ಬೆಳಗಾವಿ',
  'ಬೀದರ್',
  'ಕಲಬುರಗಿ',
  'ಯಾದಗಿರಿ',
  'ರಾಯಚೂರು',
  'ಕೊಪ್ಪಳ',
  'ಬಳ್ಳಾರಿ',
  'ವಿಜಯನಗರ',
];

const HARVEST_MONTHS = [
  'ಜನವರಿ',
  'ಫೆಬ್ರವರಿ',
  'ಮಾರ್ಚ್',
  'ಏಪ್ರಿಲ್',
  'ಮೇ',
  'ಜೂನ್',
  'ಜುಲೈ',
  'ಆಗಸ್ಟ್',
  'ಸೆಪ್ಟೆಂಬರ್',
  'ಅಕ್ಟೋಬರ್',
  'ನವೆಂಬರ್',
  'ಡಿಸೆಂಬರ್',
];

/* DEV-UPLOAD: the size the tile promises, now enforced. */
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const TOO_BIG = 'ಫೋಟೋ 10MB ಗಿಂತ ಚಿಕ್ಕದಿರಬೇಕು';

const MAX_QUINTALS = 10000;

type Field = 'name' | 'district' | 'taluk' | 'village' | 'variety' | 'quintals' | 'harvestMonth';

export default function FarmerListingFormV2({ onSubmitted }: { onSubmitted: () => void }) {
  const [form, setForm] = useState({
    name: '',
    district: '',
    taluk: '',
    village: '',
    variety: '',
    quintals: '',
    harvestMonth: '',
    consent: false,
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoReject, setPhotoReject] = useState<'size' | 'type' | null>(null);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const blur = (f: Field) => setTouched((t) => ({ ...t, [f]: true }));

  /* Revoke the object URL so previews do not leak between selections. */
  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview],
  );

  /* AWAITING-BACKEND: the photo is previewed locally and never uploaded. */
  function handlePhoto(file: File | null) {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    if (!file) {
      setPhoto(null);
      setPhotoPreview(null);
      setPhotoReject(null);
      return;
    }
    // DEV-UPLOAD
    if (!ALLOWED_TYPES.includes(file.type)) {
      setPhoto(null);
      setPhotoPreview(null);
      setPhotoReject('type');
      return;
    }
    if (file.size > MAX_BYTES) {
      setPhoto(null);
      setPhotoPreview(null);
      setPhotoReject('size');
      return;
    }
    setPhotoReject(null);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function clearPhoto() {
    handlePhoto(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const quintalsNum = Number(form.quintals);
  const quintalsValid =
    form.quintals !== '' && Number.isFinite(quintalsNum) && quintalsNum >= 1 && quintalsNum <= MAX_QUINTALS;

  const invalid: Record<Field, boolean> = {
    name: form.name.trim() === '',
    district: form.district === '',
    taluk: form.taluk.trim() === '',
    village: form.village.trim() === '',
    variety: form.variety.trim() === '',
    quintals: !quintalsValid,
    harvestMonth: form.harvestMonth === '',
  };

  const showError = (f: Field) => Boolean(touched[f]) && invalid[f];

  /* The frame gated submit on consent alone. As on the previous form, every
     required field must also be valid. */
  const canSubmit = !Object.values(invalid).some(Boolean) && form.consent;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // AWAITING-BACKEND: this is where the create-listing request goes.
    if (!canSubmit) return;
    onSubmitted();
  }

  return (
    <div className={styles.shell}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.head}>
          <span className={styles.pill}>
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
            </svg>
            ರೈತ
          </span>
          <h1 className={styles.title}>ನಿಮ್ಮ ಭತ್ತ ಪಟ್ಟಿ ಮಾಡಿ</h1>
          <p className={styles.subLine}>ಕೇವಲ ೨ ನಿಮಿಷದಲ್ಲಿ ಮುಗಿಸಿ · ಉಚಿತ · ಯಾವ ಕಮಿಷನ್ ಇಲ್ಲ</p>
        </div>

        {/* Mic tile — DEV-A11Y: keeps the designed look, but is marked
            disabled and does not present itself as tappable. */}
        <button type="button" className={styles.mic} aria-disabled="true" aria-label="ಧ್ವನಿಯಿಂದ ಪಟ್ಟಿ ಮಾಡಿ">
          <span className={styles.micGlow} aria-hidden="true" />
          <span className={styles.micIcon}>
            <svg
              width="36"
              height="36"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" stroke="none" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10a7 7 0 0014 0M12 19v3M8 22h8" />
            </svg>
          </span>
          <span className={styles.micBody}>
            <span className={styles.micTitleRow}>
              <span className={styles.micTitle}>ಧ್ವನಿಯಿಂದ ಪಟ್ಟಿ ಮಾಡಿ</span>
              <span className={styles.micBadge}>ಶೀಘ್ರದಲ್ಲಿ</span>
            </span>
            <span className={styles.micSub}>ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಮಾತಾಡಿ — ನಾವು ತಕ್ಷಣ ದಾಖಲಿಸುತ್ತೇವೆ</span>
          </span>
          <svg
            className={styles.micChevron}
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Divider */}
        <div className={styles.divider}>
          <span className={styles.dividerLine} aria-hidden="true" />
          <span className={styles.dividerText}>ಅಥವಾ ಕೆಳಗೆ ಬರೆಯಿರಿ</span>
          <span className={styles.dividerLine} aria-hidden="true" />
        </div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {/* 1. Name */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="fl-name">
              ನಿಮ್ಮ ಹೆಸರು<span className={styles.req}>*</span>
            </label>
            <input
              id="fl-name"
              type="text"
              placeholder="ಉದಾ: ರಮೇಶ್ ಕುಮಾರ್"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              onBlur={() => blur('name')}
              aria-invalid={showError('name')}
              className={`${styles.control} ${showError('name') ? styles.controlError : ''}`}
            />
          </div>

          {/* 2 + 3. District and taluk. The frame makes taluk a free-text
              box and carries no taluk data, so there is no dependency. */}
          <div className={styles.pair}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="fl-district">
                ಜಿಲ್ಲೆ<span className={styles.req}>*</span>
              </label>
              <select
                id="fl-district"
                value={form.district}
                onChange={(e) => set('district', e.target.value)}
                onBlur={() => blur('district')}
                aria-invalid={showError('district')}
                className={`${styles.control} ${showError('district') ? styles.controlError : ''}`}
              >
                <option value="">ಆಯ್ಕೆ ಮಾಡಿ</option>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="fl-taluk">
                ತಾಲೂಕು<span className={styles.req}>*</span>
              </label>
              <input
                id="fl-taluk"
                type="text"
                placeholder="ತಾಲೂಕು ಹೆಸರು"
                value={form.taluk}
                onChange={(e) => set('taluk', e.target.value)}
                onBlur={() => blur('taluk')}
                aria-invalid={showError('taluk')}
                className={`${styles.control} ${showError('taluk') ? styles.controlError : ''}`}
              />
            </div>
          </div>

          {/* 4. Village */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="fl-village">
              ಗ್ರಾಮ / ಊರು<span className={styles.req}>*</span>
            </label>
            <input
              id="fl-village"
              type="text"
              placeholder="ನಿಮ್ಮ ಗ್ರಾಮದ ಹೆಸರು"
              value={form.village}
              onChange={(e) => set('village', e.target.value)}
              onBlur={() => blur('village')}
              aria-invalid={showError('village')}
              className={`${styles.control} ${showError('village') ? styles.controlError : ''}`}
            />
          </div>

          {/* 5. Variety */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="fl-variety">
              ಭತ್ತದ ತಳಿ<span className={styles.req}>*</span>
            </label>
            <input
              id="fl-variety"
              type="text"
              placeholder="ಉದಾ: ಸೋನ ಮಸೂರಿ, ಜ್ಯೋತಿ, ಸಾಂಬಾ..."
              value={form.variety}
              onChange={(e) => set('variety', e.target.value)}
              onBlur={() => blur('variety')}
              aria-invalid={showError('variety')}
              className={`${styles.control} ${showError('variety') ? styles.controlError : ''}`}
            />
          </div>

          {/* 6. Quintals */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="fl-quintals">
              ಎಷ್ಟು ಕ್ವಿಂಟಾಲ್ ಇದೆ?<span className={styles.req}>*</span>
            </label>
            <div className={styles.qtyWrap}>
              <input
                id="fl-quintals"
                type="number"
                inputMode="numeric"
                min="1"
                max={MAX_QUINTALS}
                placeholder="0"
                value={form.quintals}
                onChange={(e) => set('quintals', e.target.value)}
                onBlur={() => blur('quintals')}
                aria-invalid={showError('quintals')}
                className={`${styles.control} ${styles.qtyInput} ${
                  showError('quintals') ? styles.controlError : ''
                }`}
              />
              <span className={styles.qtyUnit} aria-hidden="true">
                ಕ್ವಿಂಟಾಲ್
              </span>
            </div>
          </div>

          {/* 7. Harvest month — DEV-A11Y: grouped and labelled, with a
              pressed state on each button. */}
          <div className={styles.field}>
            <span className={styles.label} id="fl-month-label">
              ಕೊಯ್ಲು ತಿಂಗಳು<span className={styles.req}>*</span>
            </span>
            <div className={styles.months} role="group" aria-labelledby="fl-month-label">
              {HARVEST_MONTHS.map((m) => {
                const on = form.harvestMonth === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      set('harvestMonth', m);
                      blur('harvestMonth');
                    }}
                    aria-pressed={on}
                    className={[
                      styles.month,
                      on ? styles.monthOn : '',
                      showError('harvestMonth') ? styles.monthsError : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 8. Photo — optional */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="fl-photo">
              ಭತ್ತದ ಫೋಟೋ (ಐಚ್ಛಿಕ)
            </label>
            <label className={`${styles.drop} ${photoPreview ? styles.dropFilled : ''}`}>
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="ಭತ್ತದ ಫೋಟೋ" className={styles.preview} />
              ) : (
                <>
                  <span className={styles.dropIcon}>
                    <svg
                      width="20"
                      height="20"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                      />
                    </svg>
                  </span>
                  <span>
                    <span className={styles.dropKn}>ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ</span>
                    {/* DEV-UPLOAD: a rejected type turns the frame's own rule
                        line kemmannu rather than inventing new copy. */}
                    <span
                      className={`${styles.dropRules} ${
                        photoReject === 'type' ? styles.dropRulesError : ''
                      }`}
                    >
                      JPG, PNG · 10MB ಗರಿಷ್ಠ
                    </span>
                  </span>
                </>
              )}
              {photoReject === 'size' && <span className={styles.dropReject}>{TOO_BIG}</span>}
              {/* AWAITING-BACKEND: nothing reads this file beyond the preview. */}
              <input
                id="fl-photo"
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                className={styles.srOnly}
                onChange={(e) => handlePhoto(e.target.files?.[0] ?? null)}
              />
            </label>
            {photoPreview && (
              <button type="button" onClick={clearPhoto} className={styles.removePhoto}>
                ಫೋಟೋ ತೆಗೆಯಿರಿ
              </button>
            )}
          </div>

          {/* Consent — DEV-CONSENT: the frame's sentence named a different
              platform and misdescribed what is shown. CEO's wording. */}
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
                    <svg
                      width="12"
                      height="12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="var(--hottu-50)"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
              </span>
              <p className={styles.consentText}>
                ನನ್ನ ಭತ್ತದ ವಿವರವನ್ನು <span className={styles.brand}>ಪ್ಯಾಡಿಲಿಂಕ್</span>‌ನಲ್ಲಿ ತೋರಿಸಲು
                ಒಪ್ಪುತ್ತೇನೆ. ಪರಿಶೀಲಿತ ಖರೀದಿದಾರ ಸಂಪರ್ಕ ತೆರೆದಾಗ ಮಾತ್ರ ನನ್ನ ಹೆಸರು ಮತ್ತು ನಂಬರ್ ಅವರಿಗೆ
                ಸಿಗುತ್ತದೆ.
              </p>
            </label>
          </div>

          {/* Submit — the frame places nothing beneath it. */}
          <div className={styles.submitWrap}>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`${styles.submit} ${canSubmit ? styles.submitReady : ''}`}
            >
              ಪಟ್ಟಿ ಮಾಡಿ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
