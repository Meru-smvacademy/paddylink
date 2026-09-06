'use client';

import { useEffect, useRef, useState } from 'react';
import { OTHER_VARIETY_EN, type ReferenceData } from '@/lib/reference';
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
 * WIRED. Submitting posts to /api/farmer/listings, which validates every
 * field server-side, upserts the farmer by mobile and inserts the listing.
 * The photo goes to the private listing-photos bucket. Nothing typed here is
 * discarded any more.
 *
 * The district, taluk and variety options come from the database (migration
 * 005's reference views), so the spellings are canonical and the district
 * list is the one PaddyLink actually operates in.
 *
 * TEMP-PRE-AUTH: the mobile number arrives from the OTP step in component
 * state, not from a verified session — real OTP is not live yet. The route
 * says the same at its own boundary.
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
 * The frame's 30 hardcoded districts are gone, replaced by the three the
 * database serves. CEO ruling: this screen promises
 * "ಕಟಾವಿನ ಸಮಯದಲ್ಲಿ ನಮ್ಮ ತಂಡ ಬರುತ್ತದೆ", a promise we can only keep where we
 * operate, so the dropdown serves reality and grows with operations.
 *
 * Also logged as a deliberate divergence: this Make file ships its own
 * success screen ("ಯಶಸ್ವಿಯಾಗಿ ಪಟ್ಟಿ ಆಯಿತು!"), which is NOT built. The flow
 * keeps the existing FarmerSuccess screen, per brief.
 *
 * EDIT MODE. The same component, the same fields, the same order, the same
 * validation — the farmer edit screen at /farmer/listings/[id]/edit passes an
 * `edit` target and this renders pre-filled. There is no second form, because
 * a second form is how two screens start disagreeing about what a listing is.
 *
 * What edit mode changes, and nothing else:
 * - the mic tile and its "ಅಥವಾ ಕೆಳಗೆ ಬರೆಯಿರಿ" divider are hidden. Both belong
 *   to making a new listing; neither means anything when correcting one.
 * - the mobile number is rendered, read-only. It is the only thing on this
 *   screen a farmer cannot change: it is his identity, not a field. It is not
 *   an input, it is not submitted, and the route never reads one.
 * - consent is hidden and not required. It was given when the listing was
 *   created and contact_share_consent_at records that moment; asking again
 *   would either overwrite that record or ask for something already held.
 * - a warning appears above the button when saving would drop a quality
 *   check, so the farmer is told before he saves, not after.
 * - the heading and the button say what the screen does.
 *
 * No new field, no new colour, no reordering. The one thing edit mode adds to
 * the frame is the read-only mobile row, which the brief requires.
 */

/** Everything the edit screen pre-fills from the database. */
export interface ListingEditTarget {
  id: string;
  /** Read-only on the form. Never submitted. */
  mobile: string;
  name: string;
  districtId: string;
  talukId: string;
  village: string;
  varietyId: string;
  varietyOther: string;
  quintals: string;
  /** 1-12. */
  harvestMonth: number;
  photoUrl: string | null;
  qualityChecked: boolean;
  status: string;
}

/* Districts, taluks and varieties now come from the database (migration 005's
   reference views), not from a list in this file. That is what fixes the
   spellings and keeps the options honest: they are the districts PaddyLink
   actually operates in, and they grow with operations. */

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

type Field =
  | 'name'
  | 'district'
  | 'taluk'
  | 'village'
  | 'variety'
  | 'varietyOther'
  | 'quintals'
  | 'harvestMonth';

export interface CreatedListing {
  id: string;
  quantity_quintals: number;
  harvest_month: string;
  expires_at: string;
  variety_kn: string | null;
  photo_stored: boolean;
}

export default function FarmerListingFormV2({
  reference,
  mobile,
  onSubmitted,
  edit,
  onSaved,
}: {
  reference: ReferenceData;
  /** TEMP-PRE-AUTH: carried from the OTP step in component state, not a
      verified session. The server route re-validates the shape but cannot
      yet prove the number belongs to whoever is typing. In edit mode it is
      the stored number, shown read-only and never submitted. */
  mobile: string;
  onSubmitted?: (listing: CreatedListing) => void;
  /** Present only on the edit screen. Its presence is what switches modes. */
  edit?: ListingEditTarget;
  onSaved?: () => void;
}) {
  const editing = edit !== undefined;

  const [form, setForm] = useState({
    name: edit?.name ?? '',
    district: edit?.districtId ?? '',
    taluk: edit?.talukId ?? '',
    village: edit?.village ?? '',
    variety: edit?.varietyId ?? '',
    varietyOther: edit?.varietyOther ?? '',
    quintals: edit?.quintals ?? '',
    harvestMonth: edit ? (HARVEST_MONTHS[edit.harvestMonth - 1] ?? '') : '',
    // Recorded at creation and not re-asked on a correction. Pre-set so the
    // shared submit gate below passes; the edit route never reads it.
    consent: editing,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoReject, setPhotoReject] = useState<'size' | 'type' | null>(null);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((f) => ({
      ...f,
      [key]: value,
      // Changing district invalidates the taluk beneath it.
      ...(key === 'district' ? { taluk: '' } : {}),
      // Leaving ಇತರೆ / Other drops the free-text name with it.
      ...(key === 'variety' && !isOtherVariety(value as string) ? { varietyOther: '' } : {}),
    }));

  function isOtherVariety(id: string) {
    return reference.varieties.find((v) => String(v.id) === id)?.name_en === OTHER_VARIETY_EN;
  }

  const blur = (f: Field) => setTouched((t) => ({ ...t, [f]: true }));

  /* Revoke the object URL so previews do not leak between selections. */
  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview],
  );

  /* Previewed locally here; uploaded by the server route on submit. */
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

  const otherChosen = isOtherVariety(form.variety);
  const taluksHere = reference.taluks.filter((t) => String(t.district_id) === form.district);

  const invalid: Record<Field, boolean> = {
    name: form.name.trim() === '',
    district: form.district === '',
    taluk: form.taluk === '',
    village: form.village.trim() === '',
    variety: form.variety === '',
    // Only required when ಇತರೆ / Other is the choice — the rule the server
    // route enforces too.
    varietyOther: otherChosen && form.varietyOther.trim() === '',
    quintals: !quintalsValid,
    harvestMonth: form.harvestMonth === '',
  };

  const showError = (f: Field) => Boolean(touched[f]) && invalid[f];

  /* The frame gated submit on consent alone. As on the previous form, every
     required field must also be valid. */
  const canSubmit = !Object.values(invalid).some(Boolean) && form.consent;

  /* Will saving drop this listing's quality check? The same rule the route
     applies, computed here only so the farmer is warned BEFORE he saves —
     the route decides, this just tells the truth about what it will decide.
     Narrow on purpose: correcting a village or a harvest month does not
     change which crop was checked, so a valid check survives that. */
  const qualityWillReset =
    edit !== undefined &&
    edit.qualityChecked &&
    (form.variety !== edit.varietyId ||
      (otherChosen ? form.varietyOther.trim() : '') !== edit.varietyOther ||
      Number(form.quintals) !== Number(edit.quintals));

  /* Existing photo until a new file is chosen. Choosing one replaces it;
     nothing here removes a stored photo. */
  const shownPreview = photoPreview ?? edit?.photoUrl ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setSubmitFailed(false);

    const body = new FormData();
    // Create only. In edit mode the farmer comes from the httpOnly cookie and
    // the route reads no mobile at all — sending one would change nothing.
    if (!editing) body.set('mobile', mobile);
    if (edit) body.set('listing_id', edit.id);
    body.set('name', form.name.trim());
    body.set('village', form.village.trim());
    body.set('district_id', form.district);
    body.set('taluk_id', form.taluk);
    body.set('variety_id', form.variety);
    if (otherChosen) body.set('variety_other', form.varietyOther.trim());
    body.set('quantity_quintals', form.quintals);
    // The grid is ordered January-first, so its index is the month number.
    body.set('harvest_month', String(HARVEST_MONTHS.indexOf(form.harvestMonth) + 1));
    if (!editing) body.set('consent', String(form.consent));
    if (photo) body.set('photo', photo);

    try {
      const res = await fetch(
        editing ? '/api/farmer/listings/edit' : '/api/farmer/listings',
        { method: 'POST', body },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { listing } = await res.json();
      if (editing) onSaved?.();
      else onSubmitted?.(listing);
    } catch (err) {
      console.error(`[listing form] ${editing ? 'save' : 'submit'} failed`, err);
      setSubmitFailed(true);
      setSubmitting(false);
    }
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
          <h1 className={styles.title}>{editing ? 'ಪಟ್ಟಿ ಸರಿಪಡಿಸಿ' : 'ನಿಮ್ಮ ಭತ್ತ ಪಟ್ಟಿ ಮಾಡಿ'}</h1>
          {/* The sub-line is a pitch for making a listing. It has nothing to
              say to a farmer correcting one he already made. */}
          {!editing && (
            <p className={styles.subLine}>ಕೇವಲ ೨ ನಿಮಿಷದಲ್ಲಿ ಮುಗಿಸಿ · ಉಚಿತ · ಯಾವ ಕಮಿಷನ್ ಇಲ್ಲ</p>
          )}
        </div>

        {/* Mic tile — DEV-A11Y: keeps the designed look, but is marked
            disabled and does not present itself as tappable. Create only:
            "ಧ್ವನಿಯಿಂದ ಪಟ್ಟಿ ಮಾಡಿ" is an offer to make a listing. */}
        {!editing && (
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
        )}

        {/* Divider — belongs to the mic tile above it. */}
        {!editing && (
          <div className={styles.divider}>
            <span className={styles.dividerLine} aria-hidden="true" />
            <span className={styles.dividerText}>ಅಥವಾ ಕೆಳಗೆ ಬರೆಯಿರಿ</span>
            <span className={styles.dividerLine} aria-hidden="true" />
          </div>
        )}

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

          {/* 1b. Mobile — EDIT ONLY, and read-only by requirement. This is
              the farmer's identity, not a field: it is rendered so he can see
              whose listing he is correcting, it is not an <input>, it is not
              in the submitted body, and the route reads no mobile from a
              request at all. The only addition edit mode makes to the frame. */}
          {editing && (
            <div className={styles.field}>
              <span className={styles.label} id="fl-mobile-label">
                ಮೊಬೈಲ್ ನಂಬರ್
              </span>
              <p className={styles.controlReadonly} aria-labelledby="fl-mobile-label">
                {edit.mobile}
              </p>
              <p className={styles.readonlyHint}>ಈ ನಂಬರ್ ಬದಲಾಯಿಸಲು ಆಗುವುದಿಲ್ಲ</p>
            </div>
          )}

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
                {/* Operational only: this screen promises a harvest visit. */}
                {reference.districts.filter((d) => d.is_operational).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name_kn}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="fl-taluk">
                ತಾಲೂಕು<span className={styles.req}>*</span>
              </label>
              {/* Dependent on district, from reference.taluks. The frame made
                  this free text because it had no taluk data; the database
                  has all 19 for the districts we operate in. */}
              <select
                id="fl-taluk"
                value={form.taluk}
                onChange={(e) => set('taluk', e.target.value)}
                onBlur={() => blur('taluk')}
                disabled={form.district === ''}
                aria-invalid={showError('taluk')}
                className={`${styles.control} ${showError('taluk') ? styles.controlError : ''}`}
              >
                <option value="">ಆಯ್ಕೆ ಮಾಡಿ</option>
                {taluksHere.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name_kn}
                  </option>
                ))}
              </select>
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
            {/* From reference.varieties, with ಇತರೆ / Other pinned last by
                the server helper — it is no longer the highest id, since
                migration 006 seeded ಜ್ಯೋತಿ after it. */}
            <select
              id="fl-variety"
              value={form.variety}
              onChange={(e) => set('variety', e.target.value)}
              onBlur={() => blur('variety')}
              aria-invalid={showError('variety')}
              className={`${styles.control} ${showError('variety') ? styles.controlError : ''}`}
            >
              <option value="">ಆಯ್ಕೆ ಮಾಡಿ</option>
              {reference.varieties.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name_kn}
                </option>
              ))}
            </select>

            {/* Only alongside ಇತರೆ / Other, and stored in listings.variety_other. */}
            {otherChosen && (
              <input
                id="fl-variety-other"
                type="text"
                maxLength={60}
                placeholder="ತಳಿ ಹೆಸರು"
                value={form.varietyOther}
                onChange={(e) => set('varietyOther', e.target.value)}
                onBlur={() => blur('varietyOther')}
                aria-label="ತಳಿ ಹೆಸರು"
                aria-invalid={showError('varietyOther')}
                className={`${styles.control} ${
                  showError('varietyOther') ? styles.controlError : ''
                }`}
              />
            )}
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
            <label className={`${styles.drop} ${shownPreview ? styles.dropFilled : ''}`}>
              {shownPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shownPreview} alt="ಭತ್ತದ ಫೋಟೋ" className={styles.preview} />
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
            {/* Cancels a newly chosen file only. In edit mode that reverts to
                the stored photo — there is deliberately no control here that
                removes a stored photo, and no route that would accept one. */}
            {photoPreview && (
              <button type="button" onClick={clearPhoto} className={styles.removePhoto}>
                {editing ? 'ಈ ಆಯ್ಕೆ ರದ್ದು' : 'ಫೋಟೋ ತೆಗೆಯಿರಿ'}
              </button>
            )}
          </div>

          {/* Consent — DEV-CONSENT: the frame's sentence named a different
              platform and misdescribed what is shown. CEO's wording.
              Create only: consent is recorded once, at creation, and
              contact_share_consent_at is the record of that moment. */}
          {!editing && (
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
          )}

          {/* QUALITY RESET WARNING — edit only, and shown before the button
              rather than after the save. Changing which crop this is, or how
              much of it there is, makes the recorded moisture reading a
              measurement of something else, so it is cleared and the badge
              honestly returns to ಪರಿಶೀಲನೆ ಬಾಕಿ. The sentence reuses the
              badge's own promise rather than inventing new copy. */}
          {qualityWillReset && (
            <div className={styles.qualityWarn} role="status">
              <span className={styles.qualityWarnIcon} aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 3.2 2.6 16a1 1 0 0 0 .87 1.5h13.06A1 1 0 0 0 17.4 16L10 3.2Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path d="M10 8v3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <circle cx="10" cy="14.2" r="0.9" fill="currentColor" />
                </svg>
              </span>
              <p className={styles.qualityWarnText}>
                ತಳಿ ಅಥವಾ ಪ್ರಮಾಣ ಬದಲಾಗಿದೆ. ಉಳಿಸಿದರೆ ಈ ಪಟ್ಟಿಯ ಗುಣಮಟ್ಟ ಪರಿಶೀಲನೆ ರದ್ದಾಗುತ್ತದೆ —
                ಕೊಯ್ಲಿನ ಸಮಯದಲ್ಲಿ ನಮ್ಮ ತಂಡ ಮತ್ತೆ ಬಂದು ಪರಿಶೀಲಿಸುತ್ತದೆ.
              </p>
            </div>
          )}

          {/* Submit — the frame places nothing beneath it. */}
          <div className={styles.submitWrap}>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className={`${styles.submit} ${canSubmit && !submitting ? styles.submitReady : ''}`}
            >
              {editing ? 'ಉಳಿಸಿ' : 'ಪಟ್ಟಿ ಮಾಡಿ'}
            </button>
            {/* The frame has no failure state. "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ" is reused
                verbatim from the OTP screen's error in the same flow, rather
                than inventing a new sentence. */}
            {submitFailed && (
              <p className={styles.submitError} role="alert">
                ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
