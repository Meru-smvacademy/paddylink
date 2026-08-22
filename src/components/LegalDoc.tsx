import styles from './LegalDoc.module.css';

/**
 * Shared shell for the three legal documents: /terms, /privacy and
 * /refund-policy. Not a Figma port — built to the CEO's brief.
 *
 * The document text is CEO-approved v1 and is reproduced character for
 * character. Nothing here rewords, summarises or adds to it. The only
 * editorial act is typesetting: clauses written inline in the source as
 * "2.1 … 2.2 … 2.3 …" are set as separate paragraphs so they stay findable,
 * with not a character changed.
 *
 * LANGUAGE: these pages are authored mixed — a Kannada summary panel over an
 * English body — and render identically in both ಕ|EN states, so no <T>
 * appears. The toggle does not flip them.
 *
 * The published date is the build's authoring date, per brief. When the text
 * changes, LAST_UPDATED changes with it.
 */

export const LAST_UPDATED = '23 August 2026';

export interface Clause {
  /** Clause number as written in the source, e.g. "2.1". Omit for a plain paragraph. */
  n?: string;
  text: string;
}

export interface Section {
  /** Section number as written in the source, e.g. "4". */
  n: string;
  title: string;
  clauses?: Clause[];
  bullets?: string[];
}

export default function LegalDoc({
  title,
  summary,
  sections,
}: {
  title: string;
  summary: string[];
  sections: Section[];
}) {
  return (
    <main className={styles.page}>
      <article className={styles.doc}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.updated}>Last updated: {LAST_UPDATED} — Version 1</p>
        <p className={styles.version}>Version 1 — under legal review</p>

        {/* Kannada summary, at the top of every one of the three pages. */}
        <aside className={styles.summary}>
          <p className={styles.summaryHead}>ಸರಳವಾಗಿ ಹೇಳುವುದಾದರೆ:</p>
          <ul className={styles.summaryList}>
            {summary.map((item) => (
              <li key={item} className={styles.summaryItem}>
                {item}
              </li>
            ))}
          </ul>
        </aside>

        {sections.map((section) => (
          <section key={section.n} className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>{section.n}.</span>
              {section.title}
            </h2>

            {section.clauses?.map((clause) => (
              <p key={clause.n ?? clause.text} className={styles.para}>
                {clause.n && <span className={styles.clause}>{clause.n}</span>}
                {clause.text}
              </p>
            ))}

            {section.bullets && (
              <ul className={styles.bullets}>
                {section.bullets.map((b) => (
                  <li key={b} className={styles.bullet}>
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </article>
    </main>
  );
}
