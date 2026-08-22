'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import T from './T';
import styles from './RegisterBuyer.module.css';

/**
 * Buyer registration (KYC) — ported from Figma Make file
 * diIRk922EiLVvRKPPVuMbq (src/App.tsx). Layout, copy and field order are the
 * frame's, verbatim.
 *
 * AWAITING-BACKEND: nothing on this page reaches a server. No registration is
 * created, no KYC record is opened, no document is uploaded and no
 * verification is queued. A chosen file is read for its name, size and type
 * in the browser and is never sent anywhere. Submitting only swaps this
 * component to its success state; every value typed is then discarded.
 *
 * LANGUAGE: the frame prints a Kannada label over a small uppercase English
 * one and has no working toggle. That stack is preserved and the site ಕ|EN
 * control does not flip it, so every <T> carries the same string in both
 * slots.
 *
 * Four CEO-approved deviations from the frame, each marked at its site:
 * - DEV-PALETTE  the frame's stone + amber mapped onto the brand ramp; see
 *                the stylesheet header for the full mapping.
 * - DEV-VALIDATE the frame has no validation at all and gates submit on the
 *                consent box alone, so a completely blank KYC form submits.
 *                Every field is now required and format-checked, with the
 *                error wording supplied by the CEO.
 * - DEV-UPLOAD   the frame's tile promises "max 5 MB" and checks nothing,
 *                and silently drops types its own picker offers. Both now
 *                report in the tile.
 * - DEV-LINK     the frame's success screen has no button or link at all and
 *                strands the buyer. One link home is added.
 */

const KARNATAKA_DISTRICTS = [
  'ಬಾಗಲಕೋಟೆ / Bagalkote',
  'ಬಳ್ಳಾರಿ / Ballari',
  'ಬೆಳಗಾವಿ / Belagavi',
  'ಬೆಂಗಳೂರು ಗ್ರಾಮಾಂತರ / Bengaluru Rural',
  'ಬೆಂಗಳೂರು ನಗರ / Bengaluru Urban',
  'ಬೀದರ್ / Bidar',
  'ವಿಜಯಪುರ / Vijayapura',
  'ಚಾಮರಾಜನಗರ / Chamarajanagara',
  'ಚಿಕ್ಕಬಳ್ಳಾಪುರ / Chikkaballapura',
  'ಚಿಕ್ಕಮಗಳೂರು / Chikkamagaluru',
  'ಚಿತ್ರದುರ್ಗ / Chitradurga',
  'ದಕ್ಷಿಣ ಕನ್ನಡ / Dakshina Kannada',
  'ದಾವಣಗೆರೆ / Davanagere',
  'ಧಾರವಾಡ / Dharwad',
  'ಗದಗ / Gadag',
  'ಹಾಸನ / Hassan',
  'ಹಾವೇರಿ / Haveri',
  'ಕಲಬುರಗಿ / Kalaburagi',
  'ಕೊಡಗು / Kodagu',
  'ಕೋಲಾರ / Kolar',
  'ಕೊಪ್ಪಳ / Koppal',
  'ಮಂಡ್ಯ / Mandya',
  'ಮೈಸೂರು / Mysuru',
  'ರಾಯಚೂರು / Raichur',
  'ರಾಮನಗರ / Ramanagara',
  'ಶಿವಮೊಗ್ಗ / Shivamogga',
  'ತುಮಕೂರು / Tumakuru',
  'ಉಡುಪಿ / Udupi',
  'ಉತ್ತರ ಕನ್ನಡ / Uttara Kannada',
  'ವಿಜಯನಗರ / Vijayanagara',
  'ಯಾದಗಿರಿ / Yadgir',
];

/* DEV-VALIDATE — real formats per ruling, not bare length checks.
   PAN: five letters, four digits, one letter.
   GST: two state digits, a PAN, one entity character, Z, one checksum. */
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const MOBILE_RE = /^[0-9]{10}$/;

/* DEV-UPLOAD — the size the tile advertises, now enforced. */
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

const NEEDED = 'ಈ ವಿವರ ಬೇಕು / This detail is needed';

type Field =
  | 'fullName'
  | 'businessName'
  | 'mobile'
  | 'gst'
  | 'pan'
  | 'district'
  | 'address'
  | 'gstFile';

const MESSAGES: Record<Field, string> = {
  fullName: NEEDED,
  businessName: NEEDED,
  mobile: 'ಸರಿಯಾದ 10 ಅಂಕಿ ನಂಬರ್ ಹಾಕಿ / Enter a valid 10-digit number',
  gst: 'ಸರಿಯಾದ GST ನಂಬರ್ ಹಾಕಿ (15 ಅಕ್ಷರ) / Enter a valid 15-character GST number',
  pan: 'ಸರಿಯಾದ PAN ನಂಬರ್ ಹಾಕಿ (10 ಅಕ್ಷರ) / Enter a valid 10-character PAN number',
  district: 'ಜಿಲ್ಲೆ ಆಯ್ಕೆ ಮಾಡಿ / Select your district',
  address: NEEDED,
  gstFile: 'GST ಪ್ರಮಾಣಪತ್ರ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ / Upload the GST certificate',
};

const TOO_BIG = 'ಫೈಲ್ 5 MB ಗಿಂತ ಚಿಕ್ಕದಿರಬೇಕು / File must be under 5 MB';
const WRONG_TYPE = 'PDF, JPG ಅಥವಾ PNG ಮಾತ್ರ / PDF, JPG or PNG only';

export default function RegisterBuyer() {
  const [form, setForm] = useState({
    fullName: '',
    businessName: '',
    mobile: '',
    gst: '',
    pan: '',
    district: '',
    address: '',
    consent: false,
  });
  const [gstFile, setGstFile] = useState<File | null>(null);
  const [fileReject, setFileReject] = useState<string | null>(null);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [dragOver, setDragOver] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const blur = (f: Field) => setTouched((t) => ({ ...t, [f]: true }));

  /* AWAITING-BACKEND: the file is inspected locally and kept in component
     state only. Nothing is uploaded, stored or transmitted. */
  function handleFile(file: File | null) {
    setTouched((t) => ({ ...t, gstFile: true }));
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setGstFile(null);
      setFileReject(WRONG_TYPE);
      return;
    }
    if (file.size > MAX_BYTES) {
      setGstFile(null);
      setFileReject(TOO_BIG);
      return;
    }
    setFileReject(null);
    setGstFile(file);
  }

  function clearFile() {
    setGstFile(null);
    setFileReject(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const invalid: Record<Field, boolean> = {
    fullName: form.fullName.trim() === '',
    businessName: form.businessName.trim() === '',
    mobile: !MOBILE_RE.test(form.mobile),
    gst: !GST_RE.test(form.gst),
    pan: !PAN_RE.test(form.pan),
    district: form.district === '',
    address: form.address.trim() === '',
    gstFile: gstFile === null,
  };

  const showError = (f: Field) => Boolean(touched[f]) && invalid[f];

  /* DEV-VALIDATE: the frame's canSubmit was `form.consent` alone. */
  const canSubmit = !Object.values(invalid).some(Boolean) && form.consent;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // AWAITING-BACKEND: this is where the registration request goes.
    if (!canSubmit) return;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className={styles.page}>
        <div className={styles.wrap}>
          <div className={styles.successCard} role="status">
            <div className={styles.successRing}>
              <svg
                viewBox="0 0 40 40"
                width="40"
                height="40"
                fill="none"
                stroke="var(--bhatta-600)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="20" cy="20" r="17" stroke="var(--bhatta-400)" strokeWidth="2" />
                <polyline points="11,21 17,27 29,13" />
              </svg>
            </div>

            <div>
              <p className={styles.successKn}>
                <T kn="ಅರ್ಜಿ ಸ್ವೀಕೃತವಾಗಿದೆ!" en="ಅರ್ಜಿ ಸ್ವೀಕೃತವಾಗಿದೆ!" />
              </p>
              <p className={styles.successEn}>
                <T kn="Application received!" en="Application received!" />
              </p>
            </div>

            <p className={styles.successBodyKn}>
              <T kn="ಪರಿಶೀಲನೆ ನಂತರ ಕರೆ ಮಾಡುತ್ತೇವೆ" en="ಪರಿಶೀಲನೆ ನಂತರ ಕರೆ ಮಾಡುತ್ತೇವೆ" />
            </p>
            <p className={styles.successBodyEn}>
              <T kn="We will call after verification." en="We will call after verification." />
            </p>

            {/* DEV-LINK — the frame offers nothing here. */}
            <Link href="/" className={styles.homeLink}>
              <T kn="ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ / Back to home" en="ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ / Back to home" />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <div className={styles.card}>
          {/* Accent pill header */}
          <div className={styles.pillRow}>
            <div className={styles.pill}>
              <span className={styles.pillKn}>
                <T kn="ಖರೀದಿದಾರ ನೋಂದಣಿ" en="ಖರೀದಿದಾರ ನೋಂದಣಿ" />
              </span>
              <span className={styles.pillDiv} aria-hidden="true" />
              <span className={styles.pillEn}>
                <T kn="Buyer Registration" en="Buyer Registration" />
              </span>
            </div>
          </div>

          {/* Intro */}
          <div className={styles.intro}>
            <p className={styles.introKn}>
              <T kn="ಪರಿಶೀಲನೆಗೆ ಈ ವಿವರ ಬೇಕು — " en="ಪರಿಶೀಲನೆಗೆ ಈ ವಿವರ ಬೇಕು — " />
              <span className={styles.introAccent}>
                <T kn="ಒಮ್ಮೆ ಮಾತ್ರ" en="ಒಮ್ಮೆ ಮಾತ್ರ" />
              </span>
            </p>
            <p className={styles.introEn}>
              <T kn="We verify every buyer — " en="We verify every buyer — " />
              <span className={styles.introAccent}>
                <T kn="one time only." en="one time only." />
              </span>
            </p>
          </div>

          <div className={styles.rule} />

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            {/* 1 + 2. Name and business name */}
            <div className={styles.grid2}>
              <div>
                <label className={styles.label} htmlFor="rb-name">
                  <span className={styles.labelKn}>
                    <T kn="ಹೆಸರು" en="ಹೆಸರು" />
                  </span>
                  <span className={styles.labelEn}>
                    <T kn="Full Name" en="Full Name" />
                  </span>
                </label>
                <input
                  id="rb-name"
                  type="text"
                  placeholder="Raju Kumar"
                  value={form.fullName}
                  onChange={(e) => set('fullName', e.target.value)}
                  onBlur={() => blur('fullName')}
                  aria-invalid={showError('fullName')}
                  className={`${styles.control} ${showError('fullName') ? styles.controlError : ''}`}
                />
                {showError('fullName') && (
                  <p className={styles.error}>
                    <T kn={MESSAGES.fullName} en={MESSAGES.fullName} />
                  </p>
                )}
              </div>

              <div>
                <label className={styles.label} htmlFor="rb-business">
                  <span className={styles.labelKn}>
                    <T kn="ಸಂಸ್ಥೆ ಹೆಸರು" en="ಸಂಸ್ಥೆ ಹೆಸರು" />
                  </span>
                  <span className={styles.labelEn}>
                    <T kn="Business Name" en="Business Name" />
                  </span>
                </label>
                <input
                  id="rb-business"
                  type="text"
                  placeholder="Sri Raghavendra Traders"
                  value={form.businessName}
                  onChange={(e) => set('businessName', e.target.value)}
                  onBlur={() => blur('businessName')}
                  aria-invalid={showError('businessName')}
                  className={`${styles.control} ${
                    showError('businessName') ? styles.controlError : ''
                  }`}
                />
                {showError('businessName') && (
                  <p className={styles.error}>
                    <T kn={MESSAGES.businessName} en={MESSAGES.businessName} />
                  </p>
                )}
              </div>
            </div>

            {/* 3. Mobile */}
            <div>
              <label className={styles.label} htmlFor="rb-mobile">
                <span className={styles.labelKn}>
                  <T kn="ಮೊಬೈಲ್ ನಂಬರ್" en="ಮೊಬೈಲ್ ನಂಬರ್" />
                </span>
                <span className={styles.labelEn}>
                  <T kn="Mobile Number" en="Mobile Number" />
                </span>
              </label>
              <div className={styles.mobileRow}>
                <span className={styles.prefix}>+91</span>
                <input
                  id="rb-mobile"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  placeholder="9876543210"
                  value={form.mobile}
                  onChange={(e) => set('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onBlur={() => blur('mobile')}
                  aria-invalid={showError('mobile')}
                  className={`${styles.control} ${styles.mobileInput} ${
                    showError('mobile') ? styles.controlError : ''
                  }`}
                />
              </div>
              {showError('mobile') && (
                <p className={styles.error}>
                  <T kn={MESSAGES.mobile} en={MESSAGES.mobile} />
                </p>
              )}
            </div>

            {/* 4 + 5. GST and PAN */}
            <div className={styles.grid2}>
              <div>
                <label className={styles.label} htmlFor="rb-gst">
                  <span className={styles.labelKn}>
                    <T kn="GST ನಂಬರ್" en="GST ನಂಬರ್" />
                  </span>
                  <span className={styles.labelEn}>
                    <T kn="GST Number" en="GST Number" />
                  </span>
                </label>
                <input
                  id="rb-gst"
                  type="text"
                  placeholder="29AABCU9603R1ZX"
                  maxLength={15}
                  value={form.gst}
                  onChange={(e) => set('gst', e.target.value.toUpperCase().slice(0, 15))}
                  onBlur={() => blur('gst')}
                  aria-invalid={showError('gst')}
                  className={`${styles.control} ${showError('gst') ? styles.controlError : ''}`}
                />
                <p className={styles.hint}>15 characters • e.g. 29AABCU9603R1ZX</p>
                {showError('gst') && (
                  <p className={styles.error}>
                    <T kn={MESSAGES.gst} en={MESSAGES.gst} />
                  </p>
                )}
              </div>

              <div>
                <label className={styles.label} htmlFor="rb-pan">
                  <span className={styles.labelKn}>
                    <T kn="PAN ನಂಬರ್" en="PAN ನಂಬರ್" />
                  </span>
                  <span className={styles.labelEn}>
                    <T kn="PAN Number" en="PAN Number" />
                  </span>
                </label>
                <input
                  id="rb-pan"
                  type="text"
                  placeholder="AABCU9603R"
                  maxLength={10}
                  value={form.pan}
                  onChange={(e) => set('pan', e.target.value.toUpperCase().slice(0, 10))}
                  onBlur={() => blur('pan')}
                  aria-invalid={showError('pan')}
                  className={`${styles.control} ${showError('pan') ? styles.controlError : ''}`}
                />
                <p className={styles.hint}>10 characters • e.g. AABCU9603R</p>
                {showError('pan') && (
                  <p className={styles.error}>
                    <T kn={MESSAGES.pan} en={MESSAGES.pan} />
                  </p>
                )}
              </div>
            </div>

            {/* 6. District */}
            <div>
              <label className={styles.label} htmlFor="rb-district">
                <span className={styles.labelKn}>
                  <T kn="ಜಿಲ್ಲೆ" en="ಜಿಲ್ಲೆ" />
                </span>
                <span className={styles.labelEn}>
                  <T kn="District" en="District" />
                </span>
              </label>
              <div className={styles.selectWrap}>
                <select
                  id="rb-district"
                  value={form.district}
                  onChange={(e) => set('district', e.target.value)}
                  onBlur={() => blur('district')}
                  aria-invalid={showError('district')}
                  className={`${styles.control} ${styles.select} ${
                    showError('district') ? styles.controlError : ''
                  }`}
                >
                  <option value="" disabled>
                    ಜಿಲ್ಲೆ ಆಯ್ಕೆ ಮಾಡಿ / Select district
                  </option>
                  {KARNATAKA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <svg
                  className={styles.chevron}
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="4,6 8,10 12,6" />
                </svg>
              </div>
              {showError('district') && (
                <p className={styles.error}>
                  <T kn={MESSAGES.district} en={MESSAGES.district} />
                </p>
              )}
            </div>

            {/* 7. Business address */}
            <div>
              <label className={styles.label} htmlFor="rb-address">
                <span className={styles.labelKn}>
                  <T kn="ವ್ಯವಹಾರದ ಸ್ಥಳ" en="ವ್ಯವಹಾರದ ಸ್ಥಳ" />
                </span>
                <span className={styles.labelEn}>
                  <T kn="Business Address" en="Business Address" />
                </span>
              </label>
              <textarea
                id="rb-address"
                placeholder="ದಾರಿ ಮತ್ತು ತಾಲ್ಲೂಕು / Street, Taluk, Pincode"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                onBlur={() => blur('address')}
                aria-invalid={showError('address')}
                className={`${styles.control} ${styles.textarea} ${
                  showError('address') ? styles.controlError : ''
                }`}
              />
              {showError('address') && (
                <p className={styles.error}>
                  <T kn={MESSAGES.address} en={MESSAGES.address} />
                </p>
              )}
            </div>

            {/* 8. GST certificate upload */}
            <div>
              <label className={styles.label} htmlFor="rb-file">
                <span className={styles.labelKn}>
                  <T kn="GST ಪ್ರಮಾಣಪತ್ರ" en="GST ಪ್ರಮಾಣಪತ್ರ" />
                </span>
                <span className={styles.labelEn}>
                  <T kn="GST Certificate" en="GST Certificate" />
                </span>
              </label>

              <div
                className={[
                  styles.drop,
                  dragOver ? styles.dropOver : '',
                  gstFile ? styles.dropFilled : '',
                  showError('gstFile') || fileReject ? styles.dropError : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFile(e.dataTransfer.files[0] ?? null);
                }}
              >
                {/* DEV-UPLOAD: the frame drove this with a hidden input and a
                    click handler on the tile, which leaves it unreachable by
                    keyboard. The input is labelled and focusable instead, and
                    the tile is its label. */}
                <input
                  id="rb-file"
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className={styles.srOnly}
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                  onBlur={() => blur('gstFile')}
                  aria-invalid={showError('gstFile')}
                />
                <label htmlFor="rb-file" className={styles.dropBody}>
                  {gstFile ? (
                    <>
                      <span className={`${styles.dropIcon} ${styles.dropIconFilled}`}>
                        <svg
                          viewBox="0 0 20 20"
                          width="20"
                          height="20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          aria-hidden="true"
                        >
                          <polyline
                            points="4,10 8,14 16,6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <p className={styles.fileName}>{gstFile.name}</p>
                      <p className={styles.fileMeta}>
                        {(gstFile.size / 1024).toFixed(0)} KB •{' '}
                        <button
                          type="button"
                          className={styles.change}
                          onClick={(e) => {
                            e.preventDefault();
                            clearFile();
                          }}
                        >
                          <T kn="ಬದಲಿಸಿ / Change" en="ಬದಲಿಸಿ / Change" />
                        </button>
                      </p>
                    </>
                  ) : (
                    <>
                      <span className={styles.dropIcon}>
                        <svg
                          viewBox="0 0 20 20"
                          width="20"
                          height="20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          aria-hidden="true"
                        >
                          <path
                            d="M10 13V4m0 0L7 7m3-3 3 3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2" strokeLinecap="round" />
                        </svg>
                      </span>
                      <span>
                        <p className={styles.dropKn}>
                          <T kn="ಫೈಲ್ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ" en="ಫೈಲ್ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ" />
                        </p>
                        <p className={styles.dropEn}>
                          <T kn="Tap to upload or drag & drop" en="Tap to upload or drag & drop" />
                        </p>
                      </span>
                      <p className={styles.dropRules}>PDF, JPG, PNG • max 5 MB</p>
                    </>
                  )}

                  {/* DEV-UPLOAD: the frame rejected these in silence. */}
                  {fileReject && (
                    <p className={styles.dropReject}>
                      <T kn={fileReject} en={fileReject} />
                    </p>
                  )}
                  {!fileReject && showError('gstFile') && (
                    <p className={styles.dropReject}>
                      <T kn={MESSAGES.gstFile} en={MESSAGES.gstFile} />
                    </p>
                  )}
                </label>
              </div>
            </div>

            {/* Consent — the Fair Dealing Code, verbatim. */}
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
                        viewBox="0 0 12 12"
                        width="12"
                        height="12"
                        fill="none"
                        stroke="var(--hottu-50)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="2,6 5,9 10,3" />
                      </svg>
                    )}
                  </span>
                </span>
                <span>
                  <p className={styles.consentKn}>
                    <T
                      kn="ನ್ಯಾಯಯುತ ವ್ಯವಹಾರ ನಿಯಮಗಳನ್ನು ಒಪ್ಪುತ್ತೇನೆ — "
                      en="ನ್ಯಾಯಯುತ ವ್ಯವಹಾರ ನಿಯಮಗಳನ್ನು ಒಪ್ಪುತ್ತೇನೆ — "
                    />
                    <span className={styles.consentAccent}>
                      <T kn="ಪಾವತಿ ಮೊದಲು, ನಂತರ ಭತ್ತ" en="ಪಾವತಿ ಮೊದಲು, ನಂತರ ಭತ್ತ" />
                    </span>
                  </p>
                  <p className={styles.consentEn}>
                    <T kn="I accept the Fair Dealing rules — " en="I accept the Fair Dealing rules — " />
                    <span className={styles.consentAccentEn}>
                      <T kn="payment first, then paddy." en="payment first, then paddy." />
                    </span>
                  </p>
                </span>
              </label>
            </div>

            {/* Submit */}
            <div className={styles.submitWrap}>
              <button
                type="submit"
                disabled={!canSubmit}
                className={`${styles.submit} ${canSubmit ? styles.submitReady : ''}`}
              >
                <T kn="ನೋಂದಣಿ ಸಲ್ಲಿಸಿ" en="ನೋಂದಣಿ ಸಲ್ಲಿಸಿ" />
                <span className={styles.submitEn}>
                  <T kn="Submit Registration" en="Submit Registration" />
                </span>
              </button>
              <p className={styles.note}>
                <span className={styles.noteKn}>
                  <T kn="ಪರಿಶೀಲನೆ 24–48 ಗಂಟೆ" en="ಪರಿಶೀಲನೆ 24–48 ಗಂಟೆ" />
                </span>{' '}
                <T kn="/ Verification takes 24–48 hours." en="/ Verification takes 24–48 hours." />
              </p>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
