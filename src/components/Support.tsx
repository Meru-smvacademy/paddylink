'use client';

import { useId, useState } from 'react';
import T from './T';
import styles from './Support.module.css';

/**
 * Support — ported from Figma Make file 2KsuDwFRfn6OesS3QKd6pN (src/App.tsx).
 *
 * LANGUAGE: the frame prints both languages at once — a large Kannada line
 * over a small English one throughout — and has no toggle of its own. That
 * stack is preserved and the ಕ|EN control does not flip it, matching the
 * ruling on /how-it-works, so every <T> carries the same string in both slots.
 *
 * Two CEO-approved deviations from the frame, both flagged in the report:
 * - the grain texture is absolute within the page wrapper, not fixed across
 *   the viewport, so it does not wash over the site header and footer;
 * - the frame's own closing "PaddyLink · Kalbantt Tech OPC Pvt Ltd" mark is
 *   dropped, since the real site footer directly below repeats it.
 *
 * The frame leaves the contact rows and the grievance email as plain hrefs
 * already pointing at the right targets; they are kept and the WhatsApp row
 * opens in a new tab with rel="noopener noreferrer", as the frame has it.
 */

const faqs = [
  {
    kn: 'ಪಟ್ಟಿ ಮಾಡುವುದು ಹೇಗೆ?',
    en: 'How do I list?',
    answerKn:
      'ಮೊಬೈಲ್ ಮತ್ತು OTP ಮೂಲಕ, ಉಚಿತ, ಎರಡು ನಿಮಿಷದಲ್ಲಿ — ಅಥವಾ ನಮಗೆ ಕರೆ ಮಾಡಿ, ನಾವು ಪಟ್ಟಿ ಮಾಡಲು ಸಹಾಯ ಮಾಡುತ್ತೇವೆ.',
    answerEn: 'Mobile + OTP, free, two minutes — or call us and we help you list.',
  },
  {
    kn: 'ಗುಣಮಟ್ಟ ಪರಿಶೀಲನೆ ಯಾವಾಗ?',
    en: 'When is the quality check?',
    answerKn: 'ಕೊಯ್ಲಿನ ಸಮಯದಲ್ಲಿ ನಮ್ಮ ತಂಡ ನಿಮ್ಮ ಗದ್ದೆಗೆ ಭೇಟಿ ನೀಡುತ್ತದೆ — ಉಚಿತ.',
    answerEn: 'At harvest time, our team visits your field. Free.',
  },
  {
    kn: 'ಖರೀದಿದಾರ ನಿಜವೇ ಎಂದು ಹೇಗೆ ಗೊತ್ತು?',
    en: 'How do I know a buyer is real?',
    answerKn:
      'ಪ್ರತಿ ಖರೀದಿದಾರರ GST ಮತ್ತು PAN ಪರಿಶೀಲಿಸಲಾಗುತ್ತದೆ; ಯಾವುದೇ ಕರೆಗೂ ಮೊದಲು ಖರೀದಿದಾರರ ಹೆಸರು WhatsApp ಮೂಲಕ ನಿಮಗೆ ತಿಳಿಸಲಾಗುತ್ತದೆ.',
    answerEn:
      "Every buyer's GST & PAN verified; you get a WhatsApp with the buyer's name before any call.",
  },
  {
    kn: 'ಹಣ ಯಾವಾಗ ತೆಗೆದುಕೊಳ್ಳಬೇಕು?',
    en: 'When should I take payment?',
    answerKn:
      'ಭತ್ತ ಒಪ್ಪಿಸುವ ಮೊದಲು ಯಾವಾಗಲೂ ಹಣ ತೆಗೆದುಕೊಳ್ಳಿ — ಖಾತೆಗೆ ಅಥವಾ ಕೈಯಲ್ಲಿ ಮೊದಲು.',
    answerEn:
      'Always BEFORE handing over the paddy — money in account or in hand first.',
  },
];

function FAQRow({ faq }: { faq: (typeof faqs)[number] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonId = useId();

  return (
    <div className={`${styles.faqRow} ${open ? styles.faqRowOpen : ''}`}>
      <button
        type="button"
        id={buttonId}
        onClick={() => setOpen((v) => !v)}
        className={styles.faqButton}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className={styles.faqQuestion}>
          <span className={styles.faqQuestionKn}>
            <T kn={faq.kn} en={faq.kn} />
          </span>
          <span className={styles.faqQuestionEn}>
            <T kn={faq.en} en={faq.en} />
          </span>
        </span>
        <span
          className={`${styles.faqIndicator} ${open ? styles.faqIndicatorOpen : ''}`}
          aria-hidden="true"
        >
          +
        </span>
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        aria-hidden={!open}
        className={`${styles.faqPanel} ${open ? styles.faqPanelOpen : ''}`}
      >
        <div className={styles.faqAnswer}>
          <p className={styles.faqAnswerKn}>
            <T kn={faq.answerKn} en={faq.answerKn} />
          </p>
          <p className={styles.faqAnswerEn}>
            <T kn={faq.answerEn} en={faq.answerEn} />
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Support() {
  return (
    <main className={styles.page}>
      <div className={styles.grain} aria-hidden="true" />

      <div className={styles.shell}>
        {/* ── 1. Heading ── */}
        <header className={styles.header}>
          <div className={styles.goldRule} />
          <h1 className={styles.title}>
            <T kn="ಸಹಾಯ ಬೇಕೇ? ನಾವಿದ್ದೇವೆ" en="ಸಹಾಯ ಬೇಕೇ? ನಾವಿದ್ದೇವೆ" />
          </h1>
          <p className={styles.subtitle}>
            <T kn="Need help? We're here." en="Need help? We're here." />
          </p>
          <div className={styles.goldRuleBelow} />
        </header>

        {/* ── 2. Contact card ── */}
        <section className={styles.contactSection}>
          <div className={styles.contactCard}>
            <a
              href="tel:+919108540960"
              className={`${styles.contactRow} ${styles.contactRowDivided}`}
            >
              <span className={styles.contactEmoji} role="img" aria-label="phone">
                📞
              </span>
              <span className={styles.contactBody}>
                <span className={styles.contactLabel}>
                  <T kn="Call · ಕರೆ ಮಾಡಿ" en="Call · ಕರೆ ಮಾಡಿ" />
                </span>
                <span className={`${styles.contactNumber} ${styles.numberCall}`}>
                  +91 91085 40960
                </span>
              </span>
              <span className={`${styles.contactArrow} ${styles.arrowCall}`} aria-hidden="true">
                →
              </span>
            </a>

            <a
              href="https://wa.me/919108540960"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactRow}
            >
              <span className={styles.contactEmoji} role="img" aria-label="WhatsApp">
                💬
              </span>
              <span className={styles.contactBody}>
                <span className={styles.contactLabel}>
                  <T kn="WhatsApp · ಮೆಸೇಜ್ ಮಾಡಿ" en="WhatsApp · ಮೆಸೇಜ್ ಮಾಡಿ" />
                </span>
                <span className={`${styles.contactNumber} ${styles.numberWhatsApp}`}>
                  +91 91085 40960
                </span>
              </span>
              <span
                className={`${styles.contactArrow} ${styles.arrowWhatsApp}`}
                aria-hidden="true"
              >
                →
              </span>
            </a>

            <div className={styles.hoursStrip}>
              <p className={styles.hoursKn}>
                <T
                  kn="ಸೋಮ–ಶನಿ, ಬೆಳಿಗ್ಗೆ 10 – ಸಂಜೆ 6"
                  en="ಸೋಮ–ಶನಿ, ಬೆಳಿಗ್ಗೆ 10 – ಸಂಜೆ 6"
                />
                <span className={styles.hoursEn}>
                  <T kn="Mon–Sat, 10am–6pm" en="Mon–Sat, 10am–6pm" />
                </span>
              </p>
              <p className={styles.languageKn}>
                <T
                  kn="ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ — ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಸಹಾಯ"
                  en="ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ — ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಸಹಾಯ"
                />
                <br />
                <span className={styles.languageEn}>
                  <T
                    kn="Talk to us in Kannada — help in your language"
                    en="Talk to us in Kannada — help in your language"
                  />
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* ── 3. Common questions ── */}
        <section className={styles.faqSection}>
          <div className={styles.faqHead}>
            <div className={styles.faqHeadRule} />
            <div className={styles.faqHeadText}>
              <h2 className={styles.faqHeadKn}>
                <T kn="ಸಾಮಾನ್ಯ ಪ್ರಶ್ನೆಗಳು" en="ಸಾಮಾನ್ಯ ಪ್ರಶ್ನೆಗಳು" />
              </h2>
              <span className={styles.faqHeadEn}>
                <T kn="Common Questions" en="Common Questions" />
              </span>
            </div>
            <div className={styles.faqHeadRule} />
          </div>

          <div className={styles.faqList}>
            {faqs.map((faq) => (
              <FAQRow key={faq.kn} faq={faq} />
            ))}
          </div>
        </section>

        {/* ── 4. Grievance ── */}
        <section id="grievance" className={styles.grievanceSection}>
          <div className={styles.grievanceCard}>
            <div className={styles.grievanceHead}>
              <span className={styles.grievanceEyebrow}>
                <T kn="Grievance Officer" en="Grievance Officer" />
              </span>
              <h3 className={styles.grievanceTitle}>
                <T kn="ಕುಂದುಕೊರತೆ ಅಧಿಕಾರಿ" en="ಕುಂದುಕೊರತೆ ಅಧಿಕಾರಿ" />
              </h3>
            </div>

            <div className={styles.grievanceBody}>
              <div>
                <p className={styles.officerName}>Mounesh Tegginamani</p>
                <p className={styles.officerOrg}>
                  <T
                    kn="Kalbantt Tech OPC Pvt Ltd"
                    en="Kalbantt Tech OPC Pvt Ltd"
                  />
                </p>
              </div>

              <a href="mailto:founder@kalbantt.in" className={styles.grievanceEmail}>
                founder@kalbantt.in
              </a>

              <div className={styles.timelineBox}>
                <p className={styles.timelineKn}>
                  <T
                    kn="ದೂರು ಸಲ್ಲಿಸಿದ 48 ಗಂಟೆಗಳಲ್ಲಿ ಸ್ವೀಕೃತಿ, 15 ದಿನಗಳಲ್ಲಿ ಪರಿಹಾರ"
                    en="ದೂರು ಸಲ್ಲಿಸಿದ 48 ಗಂಟೆಗಳಲ್ಲಿ ಸ್ವೀಕೃತಿ, 15 ದಿನಗಳಲ್ಲಿ ಪರಿಹಾರ"
                  />
                </p>
                <p className={styles.timelineEn}>
                  <T
                    kn="Complaints acknowledged within 48 hours, resolved within 15 days"
                    en="Complaints acknowledged within 48 hours, resolved within 15 days"
                  />
                </p>
              </div>

              <div className={styles.warning}>
                <span className={styles.warningIcon} aria-hidden="true">
                  ⚠
                </span>
                <div>
                  <p className={styles.warningKn}>
                    <T
                      kn="ಖರೀದಿದಾರರ ಬಗ್ಗೆ ದೂರು? ಸಂಹಿತೆ ಮುರಿದವರ ಪರಿಶೀಲನೆ ರದ್ದಾಗುತ್ತದೆ"
                      en="ಖರೀದಿದಾರರ ಬಗ್ಗೆ ದೂರು? ಸಂಹಿತೆ ಮುರಿದವರ ಪರಿಶೀಲನೆ ರದ್ದಾಗುತ್ತದೆ"
                    />
                  </p>
                  <p className={styles.warningEn}>
                    <T
                      kn="Complaint about a buyer? Code-breakers lose their verification."
                      en="Complaint about a buyer? Code-breakers lose their verification."
                    />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
