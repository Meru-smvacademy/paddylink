'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import T from './T';
import styles from './HowItWorks.module.css';

/**
 * How It Works — ported from Figma Make file ggE1oxd0J45ec9RUdrAWFi (src/App.tsx).
 *
 * Every string below is copied character-for-character from that source,
 * including the Kannada numerals ೦೧–೦೭ and ೧–೪, the "✓" inside step ೦೨'s
 * body, and the ASCII quotes the frame uses around
 * "ಗುಣಮಟ್ಟ ಪರಿಶೀಲಿತ ✓" / "Quality Checked ✓".
 *
 * LANGUAGE: this page is bilingual-always, exactly as the frame. Kannada is
 * the large primary line and English the small secondary line, and the ಕ|EN
 * toggle does NOT flip that hierarchy here — both toggle states render the
 * identical stack. Following the Hero.tsx precedent, each slot still goes
 * through <T> with the same string in both slots, so the "does not vary by
 * language" intent is explicit and greppable at every site rather than
 * implied by the absence of <T>.
 *
 * The two English sentences that carry the brand name set it in Latin
 * ("PaddyLink") rather than the frame's ಪ್ಯಾಡಿಲಿಂಕ್ — the agreed
 * Latin-brand-name treatment. Marked LATIN-BRAND below.
 *
 * The frame's own header and footer are ignored; this mounts between the
 * approved site header and footer.
 */

type ImageKey =
  | 'planting'
  | 'agent'
  | 'harvest'
  | 'call'
  | 'buyers'
  | 'payment-panel'
  | 'lorry';

type Step = {
  num: string;
  kn: string;
  en: string;
  body: string;
  bodyEn: string;
  image: ImageKey;
  /** Step ೦೨ only. One bilingual string, joined by " / " in the frame. */
  footnote?: string;
};

const steps: Step[] = [
  {
    num: '೦೧',
    kn: 'ಬೆಳೆಯುವಾಗಲೇ ಪಟ್ಟಿ ಮಾಡಿ',
    en: 'List while your crop grows',
    body: 'ಮೊಬೈಲ್ ನಂಬರ್ + OTP, ಎರಡು ನಿಮಿಷ, ಸಂಪೂರ್ಣ ಉಚಿತ — ತಳಿ, ಪ್ರಮಾಣ, ಕಟಾವು ತಿಂಗಳು ತಿಳಿಸಿ',
    bodyEn:
      'Mobile + OTP, two minutes, completely free — declare variety, quantity, harvest month',
    image: 'planting',
  },
  {
    num: '೦೨',
    kn: 'ಕಟಾವಿನ ಸಮಯದಲ್ಲಿ ಗುಣಮಟ್ಟ ಪರಿಶೀಲನೆ — ಉಚಿತ',
    en: 'At harvest time, free quality check',
    body: 'ಪ್ಯಾಡಿಲಿಂಕ್ ತಂಡ ನಿಮ್ಮ ಸ್ಥಳಕ್ಕೆ ಬಂದು ತೇವಾಂಶ ಪರಿಶೀಲಿಸುತ್ತದೆ — ನಿಮ್ಮ ಪಟ್ಟಿಗೆ "ಗುಣಮಟ್ಟ ಪರಿಶೀಲಿತ ✓" ಬ್ಯಾಡ್ಜ್ ಮತ್ತು ಮೌಲ್ಯ ಸೇರುತ್ತದೆ',
    bodyEn:
      'Our team visits your field, measures moisture — your listing earns the "Quality Checked ✓" badge with the value',
    image: 'agent',
    footnote:
      'ಪರಿಶೀಲನೆ ದಿನಾಂಕದ ಮೌಲ್ಯ — ಸಂಗ್ರಹದಿಂದ ಬದಲಾಗಬಹುದು / Measured at check date; changes with storage',
  },
  {
    num: '೦೩',
    kn: 'ಪರಿಶೀಲಿತ ಖರೀದಿದಾರರು ನೋಡುತ್ತಾರೆ',
    en: 'Verified buyers see your listing',
    body: 'ಪ್ರತಿ ಖರೀದಿದಾರರ GST ಮತ್ತು PAN ನಮ್ಮ ತಂಡ ಪರಿಶೀಲಿಸಿದೆ — ಅವರು ನಿಮ್ಮ ಗುಣಮಟ್ಟವನ್ನೂ ನೋಡುತ್ತಾರೆ',
    bodyEn:
      "Every buyer's GST & PAN checked by our team — and they see your quality value too",
    image: 'harvest',
  },
  {
    num: '೦೪',
    kn: 'ಖರೀದಿದಾರ ಸಂಪರ್ಕ ಪಡೆದು ನಿಮಗೆ ಕರೆ',
    en: 'Buyer unlocks your contact and calls you',
    body: 'ನಿಮಗೆ WhatsApp ಸಂದೇಶ ಬರುತ್ತದೆ — ಖರೀದಿದಾರರ ಹೆಸರು ಮತ್ತು ತಾಲ್ಲೂಕು ಸಹಿತ',
    bodyEn: "You get a WhatsApp alert with the buyer's name and taluk",
    image: 'call',
  },
  {
    num: '೦೫',
    kn: 'ಖರೀದಿದಾರ ಸ್ಥಳಕ್ಕೆ ಬಂದು ನೋಡುತ್ತಾರೆ',
    en: 'Buyer visits your place',
    body: 'ಭತ್ತವನ್ನು ಖುದ್ದಾಗಿ ನೋಡಿ, ಬೆಲೆ ಮತ್ತು ಪ್ರಮಾಣ ಮುಖಾಮುಖಿ ಒಪ್ಪಿಗೆ — ತೂಕ ನಿಮ್ಮ ಎದುರಿಗೆ',
    bodyEn:
      'He inspects the paddy in person; price and quantity agreed face to face — weighing in front of you',
    image: 'buyers',
  },
  {
    num: '೦೬',
    kn: 'ಪಾವತಿ ಮೊದಲು',
    en: 'Payment first',
    body: 'ಹಣ ನಿಮ್ಮ ಖಾತೆಗೆ ಬಂದ ಮೇಲೆ ಅಥವಾ ಕೈಯಲ್ಲಿ ಸಿಕ್ಕ ಮೇಲೆ ಮಾತ್ರ ಭತ್ತ ಬಿಡಿ',
    bodyEn:
      'Release your paddy only after the money is in your account or cash in your hand',
    image: 'payment-panel',
  },
  {
    num: '೦೭',
    kn: 'ನಂತರ ಭತ್ತ ಹಸ್ತಾಂತರ',
    en: 'Then hand over the paddy',
    body: 'ಸಾಗಣೆ ನಿಮ್ಮ ಮತ್ತು ಖರೀದಿದಾರರ ನಡುವೆ',
    bodyEn: 'Transport arranged between you and the buyer',
    image: 'lorry',
  },
];

/* Photo file, alt and framing per step, carrying the frame's objectPosition
   and its 1.05 -> 1 entry zoom on the two rows that have one. */
const PHOTOS: Record<
  ImageKey,
  { file: string; alt: string; focus: string; zoom?: boolean }
> = {
  planting: {
    file: 'step-01-planting.webp',
    alt: 'Farmers planting rice seedlings in flooded paddy field',
    focus: 'center center',
    zoom: true,
  },
  agent: {
    file: 'step-02-quality-check.webp',
    // LATIN-BRAND: frame reads "ಪ್ಯಾಡಿಲಿಂಕ್ agent checking moisture…".
    alt: 'PaddyLink agent checking moisture of paddy with farmer',
    focus: 'center 30%',
  },
  harvest: {
    file: 'step-03-verified-listing.webp',
    alt: 'Verified buyers viewing paddy listing on screen',
    focus: 'center 40%',
    zoom: true,
  },
  call: {
    file: 'step-04-buyer-call.webp',
    alt: 'Farmer receiving buyer call on mobile',
    focus: 'center 30%',
  },
  buyers: {
    file: 'step-05-buyer-visit.webp',
    alt: 'Buyers gathered around farmer inspecting paddy',
    focus: 'center 30%',
  },
  'payment-panel': {
    file: 'step-06-payment-first.webp',
    alt: 'Payment received confirmation on mobile — payment first',
    focus: 'center center',
  },
  lorry: {
    file: 'step-07-lorry.webp',
    alt: 'Karnataka decorated TATA lorry loaded with paddy',
    focus: 'center 55%',
  },
};

const points = [
  {
    n: '೧',
    kn: 'ಬೆಲೆ ಮತ್ತು ಪ್ರಮಾಣ ಮೊದಲು ಒಪ್ಪಿಗೆ',
    en: 'Agree price & quantity first',
  },
  { n: '೨', kn: 'ತೂಕ ನಿಮ್ಮ ಎದುರಿಗೆ', en: 'Weighing in front of you' },
  { n: '೩', kn: 'ಪಾವತಿ ಮೊದಲು, ನಂತರ ಭತ್ತ', en: 'Payment first, then paddy' },
  {
    n: '೪',
    kn: 'ಸಮಸ್ಯೆ ಇದ್ದರೆ ತಿಳಿಸಿ — WhatsApp +91 91085 40960; ಸಂಹಿತೆ ಮುರಿದ ಖರೀದಿದಾರರ ಪರಿಶೀಲನೆ ರದ್ದು',
    en: 'Any problem, tell us — buyers who break the code lose their PaddyLink verification',
  },
];

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, inView };
}

function StepRow({
  step,
  index,
  hasPhoto,
}: {
  step: Step;
  index: number;
  hasPhoto: boolean;
}) {
  const { ref, inView } = useInView();
  const isEven = index % 2 === 0;
  const photo = PHOTOS[step.image];

  /* The frame cycles the text panel through hottu 50 / 100 / 200. */
  const stepBg = ['var(--hottu-50)', 'var(--hottu-100)', 'var(--hottu-200)'][
    index % 3
  ];

  return (
    <div
      ref={ref}
      className={[
        isEven ? styles.row : `${styles.row} ${styles.rowReverse}`,
        styles.reveal,
        inView ? styles.revealIn : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Image side */}
      <div className={styles.media}>
        {hasPhoto && (
          <Image
            src={`/how-it-works/${photo.file}`}
            alt={photo.alt}
            fill
            sizes="(max-width: 1023px) 100vw, 55vw"
            priority={index === 0}
            className={[
              styles.photo,
              photo.zoom ? styles.photoZoom : '',
              photo.zoom && inView ? styles.photoZoomIn : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ '--focus': photo.focus } as React.CSSProperties}
          />
        )}

        <div className={styles.vignette} />

        <div className={styles.ghostNum}>{step.num}</div>

        {/* Step ೦೬ caption overlay, anchored to the bottom of the photo. */}
        {step.image === 'payment-panel' && (
          <div className={styles.payOverlay}>
            <p className={styles.payLine}>
              <T kn="ಹಣ ಮೊದಲು." en="ಹಣ ಮೊದಲು." />{' '}
              <span className={styles.payAccent}>
                <T kn="ಭತ್ತ ನಂತರ." en="ಭತ್ತ ನಂತರ." />
              </span>
            </p>
            <p className={styles.paySub}>
              <T
                kn="Money first. Paddy after."
                en="Money first. Paddy after."
              />
            </p>
          </div>
        )}
      </div>

      {/* Text side — Kannada primary, English secondary, in both toggle states. */}
      <div className={styles.copy} style={{ '--step-bg': stepBg } as React.CSSProperties}>
        <div className={styles.stepNum}>{step.num}</div>

        <h3 className={styles.stepTitle}>
          <T kn={step.kn} en={step.kn} />
        </h3>
        <p className={styles.stepTitleSub}>
          <T kn={step.en} en={step.en} />
        </p>

        <div className={styles.stepDivider} />

        <p className={styles.stepBody}>
          <T kn={step.body} en={step.body} />
        </p>
        <p className={styles.stepBodySub}>
          <T kn={step.bodyEn} en={step.bodyEn} />
        </p>

        {step.footnote && (
          <p className={styles.footnote}>
            <T kn={step.footnote} en={step.footnote} />
          </p>
        )}
      </div>
    </div>
  );
}

function SafeDealing() {
  const { ref, inView } = useInView(0.12);

  return (
    <div
      ref={ref}
      className={`${styles.safe} ${styles.reveal} ${inView ? styles.revealIn : ''}`}
    >
      <div className={styles.safeInner}>
        <div className={styles.safeRule}>
          <div className={styles.safeRuleLine} />
          <div className={styles.safeRuleDot} />
          <div className={styles.safeRuleLine} />
        </div>

        <h2 className={styles.safeTitle}>
          <T kn="ಸುರಕ್ಷಿತ ವ್ಯವಹಾರ ಕ್ರಮ" en="ಸುರಕ್ಷಿತ ವ್ಯವಹಾರ ಕ್ರಮ" />
        </h2>
        <p className={styles.safeTitleSub}>
          <T kn="The Safe Dealing Way" en="The Safe Dealing Way" />
        </p>

        <p className={styles.safeLede}>
          <T
            kn="ಪ್ಯಾಡಿಲಿಂಕ್ ಶಿಫಾರಸು — ಪ್ರತಿ ವ್ಯವಹಾರದಲ್ಲಿ ಈ ಕ್ರಮ ಪಾಲಿಸಿ"
            en="ಪ್ಯಾಡಿಲಿಂಕ್ ಶಿಫಾರಸು — ಪ್ರತಿ ವ್ಯವಹಾರದಲ್ಲಿ ಈ ಕ್ರಮ ಪಾಲಿಸಿ"
          />
          <span className={styles.safeLedeSub}>
            {' / '}
            {/* LATIN-BRAND: frame reads "ಪ್ಯಾಡಿಲಿಂಕ್ recommends this sequence…". */}
            <T
              kn="PaddyLink recommends this sequence in every deal"
              en="PaddyLink recommends this sequence in every deal"
            />
          </span>
        </p>

        <div className={styles.points}>
          {points.map((p) => (
            <div key={p.n} className={styles.point}>
              <div className={styles.pointBadge}>
                <span className={styles.pointBadgeNum}>{p.n}</span>
              </div>
              <div>
                <p className={styles.pointKn}>
                  <T kn={p.kn} en={p.kn} />
                </p>
                <p className={styles.pointEn}>
                  <T kn={p.en} en={p.en} />
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.closing}>
          <p className={styles.closingKn}>
            <T
              kn="ಪ್ಯಾಡಿಲಿಂಕ್ ಹಣ ನಿರ್ವಹಿಸುವುದಿಲ್ಲ — ಆದರೆ ಸರಿಯಾದ ಕ್ರಮ ಎಲ್ಲರಿಗೂ ಗೊತ್ತಿರಬೇಕು"
              en="ಪ್ಯಾಡಿಲಿಂಕ್ ಹಣ ನಿರ್ವಹಿಸುವುದಿಲ್ಲ — ಆದರೆ ಸರಿಯಾದ ಕ್ರಮ ಎಲ್ಲರಿಗೂ ಗೊತ್ತಿರಬೇಕು"
            />
          </p>
          <p className={styles.closingEn}>
            <T
              kn="PaddyLink never handles the money — but everyone should know the right way."
              en="PaddyLink never handles the money — but everyone should know the right way."
            />
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * `presentPhotos` is resolved on the server, mirroring the `hasMark`
 * pattern in layout.tsx: a photo that is not yet in public/how-it-works/
 * renders no <img> at all, leaving the frame's own gadde-950 panel and its
 * ghost numeral rather than a broken-image icon.
 */
export default function HowItWorks({
  presentPhotos,
}: {
  presentPhotos: string[];
}) {
  const { ref: headRef, inView: headInView } = useInView(0.1);
  const present = new Set(presentPhotos);

  return (
    <main className={styles.page}>
      <div
        ref={headRef}
        className={`${styles.head} ${styles.reveal} ${headInView ? styles.revealIn : ''}`}
      >
        <p className={styles.eyebrow}>
          <T kn="How It Works" en="How It Works" />
        </p>
        <h2 className={styles.headTitle}>
          <T kn="ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ?" en="ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ?" />
        </h2>
        <div className={styles.headRuleWrap}>
          <div className={styles.headRule} />
        </div>
      </div>

      <div className={styles.steps}>
        {steps.map((step, i) => (
          <StepRow
            key={step.num}
            step={step}
            index={i}
            hasPhoto={present.has(PHOTOS[step.image].file)}
          />
        ))}
      </div>

      <SafeDealing />
    </main>
  );
}
