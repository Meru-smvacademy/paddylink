import Link from 'next/link';
import T from './T';
import styles from './Buyers.module.css';

/**
 * For Buyers — ported from Figma Make file dwUpFDpmFHZ0oKQpQtmmtE
 * (src/App.tsx). Six-step buyer registration timeline.
 *
 * The frame's own header and footer chrome are dropped for the site header
 * and footer; its four value-prop pillars are page content and are kept.
 *
 * LANGUAGE: the frame prints Kannada and English simultaneously — a large
 * Kannada line over a small English one — and has no toggle of its own.
 * That stack is preserved and the ಕ|EN control does not flip it, matching
 * the ruling on /how-it-works: every <T> carries the same string in both
 * slots so "does not vary by language" is explicit at each site.
 *
 * Text baked into the illustrations is artwork, not page copy, and is
 * rendered directly inside each <svg> exactly as the frame draws it.
 *
 * Every CTA and the sticky button point at /register-buyer.
 */

const REGISTER = '/register-buyer';

/* ── Shared pieces ─────────────────────────────────────────────────── */

function CTAButton({
  kn,
  en,
  large = false,
}: {
  kn: string;
  en: string;
  large?: boolean;
}) {
  return (
    <div className={styles.ctaWrap}>
      <Link
        href={REGISTER}
        className={large ? `${styles.cta} ${styles.ctaLarge}` : styles.cta}
      >
        <span className={styles.ctaLabel}>
          <T kn={kn} en={kn} />
        </span>
        <span className={styles.ctaDisc}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <path
              d="M2 6.5h9M7 2.5l4 4-4 4"
              stroke="var(--hottu-50)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </Link>
      <span className={styles.ctaSub}>
        <T kn={en} en={en} />
      </span>
    </div>
  );
}

function Node({ n }: { n: number }) {
  return (
    <div className={styles.node}>
      <div className={styles.nodeDisc}>
        <span className={styles.nodeNum}>{n}</span>
      </div>
    </div>
  );
}

function TextSide({
  kn,
  title,
  knBullets,
  bullets,
}: {
  kn: string;
  title: string;
  knBullets: string[];
  bullets: string[];
}) {
  return (
    <div className={styles.textSide}>
      <p className={styles.stepKn}>
        <T kn={kn} en={kn} />
      </p>
      <h3 className={styles.stepEn}>
        <T kn={title} en={title} />
      </h3>
      <ul className={styles.bullets}>
        {knBullets.map((b, i) => (
          <li key={b} className={styles.bullet}>
            <span className={styles.bulletDot} />
            <div>
              <span className={styles.bulletKn}>
                <T kn={b} en={b} />
              </span>
              <span className={styles.bulletEn}>
                <T kn={bullets[i]} en={bullets[i]} />
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function IlloCard({ children }: { children: React.ReactNode }) {
  return <div className={styles.illoCard}>{children}</div>;
}

function Row({
  left,
  right,
  n,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  n: number;
}) {
  return (
    <div className={styles.row}>
      <div className={styles.rowLeft}>{left}</div>
      <Node n={n} />
      <div className={styles.rowRight}>{right}</div>
    </div>
  );
}

/* ── Illustrations — the frame's SVGs, verbatim ────────────────────── */

function RegisterDocIllo() {
  return (
    <svg viewBox="0 0 380 310" fill="none" className={styles.illo} role="img"
      aria-label="Mobile OTP verification with sample GST, PAN and APMC documents">
      <rect width="380" height="310" fill="#F6EFDA" />

      {/* Phone frame */}
      <rect x="130" y="14" width="120" height="170" rx="14" fill="#0B2418" />
      <rect x="136" y="22" width="108" height="154" rx="10" fill="#FDF6E3" />
      <rect x="136" y="22" width="108" height="22" rx="10" fill="#0B2418" />
      <rect x="136" y="32" width="108" height="12" fill="#0B2418" />
      <text x="190" y="36" textAnchor="middle" fontSize="7" fill="#F0B429" fontFamily="sans-serif" fontWeight="bold">PaddyLink · ಖರೀದಿದಾರ</text>

      {/* OTP screen */}
      <text x="190" y="60" textAnchor="middle" fontSize="6" fill="#54665B" fontFamily="sans-serif">ಮೊಬೈಲ್ ದೃಢೀಕರಣ</text>
      <text x="190" y="69" textAnchor="middle" fontSize="5.5" fill="#54665B" fontFamily="sans-serif">Mobile Verification</text>
      <rect x="144" y="74" width="92" height="14" rx="4" fill="#FDF6E3" stroke="#EDE1C2" strokeWidth="1" />
      <text x="148" y="84" fontSize="7" fill="#14241B" fontFamily="sans-serif">+91 98765 43210</text>
      <text x="190" y="100" textAnchor="middle" fontSize="6" fill="#54665B" fontFamily="sans-serif">OTP ನಮೂದಿಸಿ · Enter OTP</text>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i}>
          <rect x={144 + i * 15} y={104} width="12" height="14" rx="3"
            fill={i < 4 ? '#0B2418' : '#FDF6E3'}
            stroke={i < 4 ? '#0B2418' : '#EDE1C2'} strokeWidth="1" />
          <text x={150 + i * 15} y={114} textAnchor="middle" fontSize="8"
            fill={i < 4 ? '#F0B429' : '#EDE1C2'} fontFamily="monospace" fontWeight="700">
            {i < 4 ? ['4', '7', '2', '_'][i] : '·'}
          </text>
        </g>
      ))}
      <rect x="144" y="126" width="92" height="18" rx="6" fill="#0B2418" />
      <text x="190" y="138" textAnchor="middle" fontSize="7.5" fill="#F0B429" fontFamily="sans-serif" fontWeight="bold">ದೃಢೀಕರಿಸಿ → Verify</text>
      <circle cx="240" cy="22" r="10" fill="#2A7A3B" />
      <path d="M236 22l3 3 5-5" stroke="#FDF6E3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="170" y="184" width="40" height="4" rx="2" fill="#0B2418" opacity="0.3" />

      {/* GST card */}
      <g transform="translate(10, 202) rotate(-3)">
        <rect width="104" height="72" rx="7" fill="#FDF6E3" stroke="#0B2418" strokeWidth="1.2" />
        <rect width="104" height="16" rx="7" fill="#0B2418" />
        <rect y="9" width="104" height="7" fill="#0B2418" />
        <text x="52" y="12" textAnchor="middle" fontSize="5.5" fill="#F0B429" fontFamily="sans-serif" fontWeight="bold">GST CERTIFICATE</text>
        <text x="7" y="26" fontSize="4.5" fill="#54665B" fontFamily="sans-serif">GSTIN · 29AABCU9603R1ZX</text>
        <text x="7" y="34" fontSize="4.5" fill="#14241B" fontFamily="sans-serif" fontWeight="600">KRISHNA RICE TRADERS</text>
        <text x="7" y="42" fontSize="4" fill="#54665B" fontFamily="sans-serif">Karnataka · 01/04/2019</text>
        <circle cx="88" cy="52" r="12" fill="none" stroke="#0B2418" strokeWidth="0.7" opacity="0.2" />
        <text x="88" y="50" textAnchor="middle" fontSize="3.5" fill="#14241B" fontFamily="sans-serif">GOVT</text>
        <text x="88" y="55" textAnchor="middle" fontSize="3.5" fill="#14241B" fontFamily="sans-serif">SEAL</text>
        <circle cx="88" cy="14" r="7" fill="#2A7A3B" />
        <path d="M85 14l2 2 4-4" stroke="#FDF6E3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="52" y="50" textAnchor="middle" fontSize="16" fill="#14241B" fontFamily="sans-serif" fontWeight="900" opacity="0.06" transform="rotate(-30 52 44)">SAMPLE</text>
      </g>

      {/* PAN card — kemmannu used once as the realistic PAN card header color */}
      <g transform="translate(138, 212)">
        <rect width="104" height="72" rx="7" fill="#FDF6E3" stroke="#A4472D" strokeWidth="1.2" />
        <rect width="104" height="15" rx="7" fill="#A4472D" />
        <rect y="8" width="104" height="7" fill="#A4472D" />
        <text x="52" y="11" textAnchor="middle" fontSize="5.5" fill="#FDF6E3" fontFamily="sans-serif" fontWeight="bold">INCOME TAX — PAN</text>
        <rect x="7" y="19" width="22" height="32" rx="2" fill="#F6EFDA" stroke="#EDE1C2" strokeWidth="0.5" />
        <circle cx="18" cy="30" r="7" fill="#C9963A" opacity="0.25" />
        <text x="18" y="33" textAnchor="middle" fontSize="6" fill="#14241B" fontFamily="sans-serif" fontWeight="700">R</text>
        <text x="34" y="26" fontSize="3.5" fill="#54665B" fontFamily="sans-serif">PAN · ABCPK1234F</text>
        <text x="34" y="34" fontSize="4.5" fill="#14241B" fontFamily="sans-serif" fontWeight="700">RAJESH K SHARMA</text>
        <text x="34" y="42" fontSize="3.5" fill="#54665B" fontFamily="sans-serif">DOB · 15/08/1978</text>
        <circle cx="88" cy="13" r="7" fill="#2A7A3B" />
        <path d="M85 13l2 2 4-4" stroke="#FDF6E3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="52" y="54" textAnchor="middle" fontSize="16" fill="#14241B" fontFamily="sans-serif" fontWeight="900" opacity="0.06" transform="rotate(-30 52 48)">SAMPLE</text>
      </g>

      {/* APMC Optional */}
      <g transform="translate(258, 204) rotate(3)">
        <rect width="108" height="72" rx="7" fill="#FDF6E3" stroke="#54665B" strokeWidth="1.2" strokeDasharray="4 2" />
        <text x="54" y="14" textAnchor="middle" fontSize="5.5" fill="#14241B" fontFamily="sans-serif" fontWeight="bold">APMC TRADE LICENSE</text>
        <text x="54" y="22" textAnchor="middle" fontSize="4" fill="#54665B" fontFamily="sans-serif">APMC ವ್ಯಾಪಾರ ಪರವಾನಗಿ</text>
        <text x="7" y="32" fontSize="4" fill="#54665B" fontFamily="sans-serif">APMC/KA/2023/01192</text>
        <text x="7" y="40" fontSize="4" fill="#54665B" fontFamily="sans-serif">Karnataka State APMC</text>
        <rect x="18" y="48" width="72" height="14" rx="7" fill="#F0B429" opacity="0.18" />
        <text x="54" y="58" textAnchor="middle" fontSize="5" fill="#C9963A" fontFamily="sans-serif" fontWeight="700">ಐಚ್ಛಿಕ · Optional</text>
        <text x="54" y="44" textAnchor="middle" fontSize="15" fill="#14241B" fontFamily="sans-serif" fontWeight="900" opacity="0.06" transform="rotate(-25 54 38)">SAMPLE</text>
      </g>
    </svg>
  );
}

function VerificationIllo() {
  return (
    <svg viewBox="0 0 380 280" fill="none" className={styles.illo} role="img"
      aria-label="24 to 48 hour verification clock with GST, PAN and trade licence checks">
      <rect width="380" height="280" fill="#F6EFDA" />

      <circle cx="190" cy="118" r="72" fill="#FDF6E3" stroke="#EDE1C2" strokeWidth="2" />
      <circle cx="190" cy="118" r="72" fill="none" stroke="#F3DFA6" strokeWidth="10" />
      <circle cx="190" cy="118" r="72" fill="none" stroke="#C9963A" strokeWidth="10"
        strokeDasharray="452" strokeDashoffset="113" strokeLinecap="round"
        style={{ transform: 'rotate(-90deg)', transformOrigin: '190px 118px' }} />
      <circle cx="190" cy="118" r="54" fill="#FDF6E3" />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => {
        const rr = 46;
        const a = ((deg - 90) * Math.PI) / 180;
        return (
          <circle key={deg} cx={190 + rr * Math.cos(a)} cy={118 + rr * Math.sin(a)}
            r={i % 3 === 0 ? 2.5 : 1.2} fill={i % 3 === 0 ? '#1E5B3A' : '#EDE1C2'} />
        );
      })}
      <line x1="190" y1="118" x2="190" y2="86" stroke="#14241B" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="190" y1="118" x2="216" y2="106" stroke="#14241B" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="190" cy="118" r="4" fill="#C9963A" />

      <text x="190" y="152" textAnchor="middle" fontSize="10" fill="#14241B" fontFamily="sans-serif" fontWeight="700">24–48 ಗಂಟೆ</text>
      <text x="190" y="163" textAnchor="middle" fontSize="8" fill="#54665B" fontFamily="sans-serif">Hours to Verify</text>
      <text x="190" y="178" textAnchor="middle" fontSize="8" fill="#1E5B3A" fontFamily="sans-serif" fontWeight="700">ಕಾಯುವಾಗಲೇ ಪಟ್ಟಿಗಳನ್ನು ನೋಡಬಹುದು</text>
      <text x="190" y="188" textAnchor="middle" fontSize="6.5" fill="#54665B" fontFamily="sans-serif">Browse listings while you wait.</text>

      {[
        { y: 200, label: 'GST', kn: 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ', done: true },
        { y: 218, label: 'PAN', kn: 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ', done: true },
        { y: 236, label: 'Trade License', kn: 'ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...', done: false },
      ].map((item) => (
        <g key={item.y}>
          <rect x="60" y={item.y} width="260" height="15" rx="5"
            fill={item.done ? '#1E5B3A' : '#FDF6E3'} stroke={item.done ? '#1E5B3A' : '#EDE1C2'} strokeWidth="1" />
          <circle cx="74" cy={item.y + 7.5} r="5.5" fill={item.done ? '#2A7A3B' : '#F0B429'} />
          {item.done ? (
            <path d={`M71 ${item.y + 7.5}l2 2L77 ${item.y + 4}`} stroke="#FDF6E3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <circle cx="74" cy={item.y + 7.5} r="2" fill="#14241B" opacity="0.5" />
          )}
          <text x="83" y={item.y + 10} fontSize="7" fill={item.done ? '#FDF6E3' : '#1E5B3A'} fontFamily="sans-serif" fontWeight="600">{item.label}</text>
          <text x="240" y={item.y + 10} fontSize="7" fill={item.done ? '#9CC4A8' : '#F0B429'} fontFamily="sans-serif" fontWeight="600">{item.kn}</text>
        </g>
      ))}

      <rect x="10" y="56" width="112" height="44" rx="10" fill="#0B2418" />
      <text x="20" y="73" fontSize="7" fill="#FDF6E3" fontFamily="sans-serif" fontWeight="700">📱 SMS ಅಧಿಸೂಚನೆ</text>
      <text x="20" y="84" fontSize="6" fill="#9CC4A8" fontFamily="sans-serif">ಅನುಮೋದನೆ ನಂತರ</text>
      <text x="20" y="93" fontSize="6" fill="#2A7A3B" fontFamily="sans-serif">on approval</text>
      <polygon points="20,100 30,100 25,106" fill="#0B2418" />

      <rect x="258" y="44" width="112" height="44" rx="10" fill="#F0B429" />
      <text x="268" y="61" fontSize="7" fill="#0B2418" fontFamily="sans-serif" fontWeight="700">🔒 ಸುರಕ್ಷಿತ</text>
      <text x="268" y="72" fontSize="6" fill="#14241B" fontFamily="sans-serif">256-bit AES</text>
      <text x="268" y="83" fontSize="6" fill="#14241B" fontFamily="sans-serif">Encryption</text>
    </svg>
  );
}

function BrowseIllo() {
  const cards = [
    { variety: 'ಸೋನಾ ಮಸೂರಿ', varEn: 'Sona Masuri', qty: '85 ಕ್ವಿಂಟಾಲ್', taluk: 'ಸಿಂಧನೂರು', moisture: '14.2%', harvest: 'ಅಕ್ಟೋಬರ್' },
    { variety: 'RNR 15048', varEn: 'RNR 15048', qty: '120 ಕ್ವಿಂಟಾಲ್', taluk: 'ಗಂಗಾವತಿ', moisture: '13.8%', harvest: 'ನವೆಂಬರ್' },
    { variety: 'BPT 5204', varEn: 'BPT 5204', qty: '200 ಕ್ವಿಂಟಾಲ್', taluk: 'ಮಾನ್ವಿ', moisture: '14.0%', harvest: 'ಅಕ್ಟೋಬರ್' },
  ];
  return (
    <svg viewBox="0 0 380 330" fill="none" className={styles.illo} role="img"
      aria-label="Listing browser showing three sample paddy listings with quality values and locked contacts">
      <rect width="380" height="330" fill="#F6EFDA" />

      {/* Filter bar */}
      <rect width="380" height="36" fill="#0B2418" />
      <text x="16" y="23" fontSize="8" fill="#F0B429" fontFamily="sans-serif" fontWeight="700">PaddyLink</text>
      <rect x="80" y="8" width="90" height="20" rx="5" fill="#12352A" />
      <text x="125" y="21" textAnchor="middle" fontSize="6.5" fill="#FDF6E3" fontFamily="sans-serif">ತಳಿ · Variety ▾</text>
      <rect x="178" y="8" width="90" height="20" rx="5" fill="#12352A" />
      <text x="223" y="21" textAnchor="middle" fontSize="6.5" fill="#FDF6E3" fontFamily="sans-serif">ತಾಲ್ಲೂಕು · Taluk ▾</text>
      <rect x="276" y="8" width="90" height="20" rx="5" fill="#F0B429" />
      <text x="321" y="21" textAnchor="middle" fontSize="6.5" fill="#0B2418" fontFamily="sans-serif" fontWeight="700">ಫಿಲ್ಟರ್ · Filter</text>

      {/* Quality verified strip */}
      <rect x="10" y="44" width="360" height="20" rx="5" fill="#1E5B3A" opacity="0.12" />
      <text x="190" y="57" textAnchor="middle" fontSize="7.5" fill="#1E5B3A" fontFamily="sans-serif" fontWeight="700">✓ PaddyLink ತಂಡ ಪರಿಶೀಲಿಸಿದ ತೇವಾಂಶ ಮೌಲ್ಯ ಸಹಿತ · Moisture verified at harvest</text>

      {/* Listing cards */}
      {cards.map((card, i) => {
        const y = 72 + i * 84;
        return (
          <g key={card.taluk}>
            <rect x="10" y={y} width="360" height="76" rx="10" fill="#FDF6E3" stroke="#EDE1C2" strokeWidth="1" />
            <rect x="10" y={y} width="360" height="22" rx="10" fill="#0B2418" />
            <rect x="10" y={y + 12} width="360" height="10" fill="#0B2418" />
            <text x="24" y={y + 14} fontSize="8" fill="#F0B429" fontFamily="sans-serif" fontWeight="700">{card.variety}</text>
            <text x="24" y={y + 22} fontSize="5.5" fill="#9CC4A8" fontFamily="sans-serif">{card.varEn}</text>
            <text x="24" y={y + 38} fontSize="13" fill="#14241B" fontFamily="sans-serif" fontWeight="900">{card.qty}</text>
            <text x="24" y={y + 52} fontSize="6.5" fill="#54665B" fontFamily="sans-serif">ತಾಲ್ಲೂಕು · {card.taluk} · ಕಟಾವು {card.harvest}</text>
            <rect x="24" y={y + 56} width="96" height="14" rx="5" fill="#1E5B3A" opacity="0.12" />
            <text x="72" y={y + 66} textAnchor="middle" fontSize="6" fill="#1E5B3A" fontFamily="sans-serif" fontWeight="700">ಗುಣಮಟ್ಟ ✓ {card.moisture} ತೇವ</text>
            <rect x="262" y={y + 30} width="96" height="26" rx="8" fill="#EDE1C2" />
            <text x="310" y={y + 42} textAnchor="middle" fontSize="6.5" fill="#54665B" fontFamily="sans-serif" fontWeight="700">🔒 ಸಂಪರ್ಕ ಲಾಕ್</text>
            <text x="310" y={y + 52} textAnchor="middle" fontSize="5.5" fill="#54665B" fontFamily="sans-serif">Contact Locked</text>
          </g>
        );
      })}

      <text x="190" y="322" textAnchor="middle" fontSize="7" fill="#C9963A" fontFamily="sans-serif" fontWeight="600">🌾 ಬೆಳೆ ಋತು ಪಟ್ಟಿಗಳು · Growing-season listings — see supply before the mandi</text>
    </svg>
  );
}

function UnlockIllo() {
  return (
    <svg viewBox="0 0 380 280" fill="none" className={styles.illo} role="img"
      aria-label="Contact unlocked, farmer notified of the buyer's name, with call and WhatsApp actions">
      <rect width="380" height="280" fill="#FDF6E3" />

      <circle cx="190" cy="108" r="64" fill="#0B2418" />
      <circle cx="190" cy="108" r="56" fill="none" stroke="#F0B429" strokeWidth="1.5" opacity="0.35" />
      <rect x="173" y="102" width="34" height="26" rx="6" fill="#2A7A3B" />
      <path d="M181 102 Q181 86 190 86 Q199 86 199 102" stroke="#F0B429" strokeWidth="4.5" fill="none" strokeLinecap="round" strokeDasharray="7 5" />
      <circle cx="190" cy="114" r="5" fill="#FDF6E3" />
      <rect x="188" y="117" width="4" height="6" rx="1" fill="#FDF6E3" />
      <circle cx="213" cy="90" r="11" fill="#2A7A3B" />
      <path d="M209 90l3 3 5-5" stroke="#FDF6E3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      <text x="190" y="184" textAnchor="middle" fontSize="12" fill="#14241B" fontFamily="sans-serif" fontWeight="900">ಸಂಪರ್ಕ ತೆರೆಯಿತು!</text>
      <text x="190" y="196" textAnchor="middle" fontSize="8" fill="#2A7A3B" fontFamily="sans-serif">Contact Unlocked from Your Account</text>

      <rect x="20" y="210" width="340" height="36" rx="10" fill="#0B2418" />
      <text x="190" y="224" textAnchor="middle" fontSize="7.5" fill="#F0B429" fontFamily="sans-serif" fontWeight="700">📩 ರೈತರಿಗೆ ಸೂಚನೆ: &quot;Rajesh K. Sharma ಖರೀದಿದಾರ ಸಂಪರ್ಕಿಸುತ್ತಾರೆ&quot;</text>
      <text x="190" y="236" textAnchor="middle" fontSize="6.5" fill="#9CC4A8" fontFamily="sans-serif">Farmer notified: your name, so the call is expected and trusted</text>

      <rect x="20" y="254" width="160" height="20" rx="8" fill="#1E5B3A" />
      <text x="100" y="267" textAnchor="middle" fontSize="8" fill="#FDF6E3" fontFamily="sans-serif" fontWeight="700">📞 ನೇರ ಕರೆ · Call</text>
      <rect x="196" y="254" width="164" height="20" rx="8" fill="#2A7A3B" />
      <text x="278" y="267" textAnchor="middle" fontSize="8" fill="#FDF6E3" fontFamily="sans-serif" fontWeight="700">💬 WhatsApp ನೇರ</text>
    </svg>
  );
}

function InspectIllo() {
  return (
    <svg viewBox="0 0 380 280" fill="none" className={styles.illo} role="img"
      aria-label="Paddy sack, weighing scale at 85 quintal, agreed price and verified moisture">
      <rect width="380" height="280" fill="#F6EFDA" />

      <ellipse cx="190" cy="240" rx="170" ry="30" fill="#C9963A" opacity="0.08" />

      {/* Paddy sack */}
      <ellipse cx="190" cy="164" rx="38" ry="14" fill="#C9963A" opacity="0.25" />
      <rect x="154" y="108" width="72" height="58" rx="10" fill="#F3DFA6" stroke="#C9963A" strokeWidth="2" />
      <ellipse cx="190" cy="166" rx="36" ry="10" fill="#C9963A" opacity="0.2" />
      <path d="M166 118 Q190 130 214 118" stroke="#C9963A" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M164 130 Q190 142 216 130" stroke="#C9963A" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.4" />
      <path d="M165 142 Q190 154 215 142" stroke="#C9963A" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.3" />
      <text x="190" y="102" textAnchor="middle" fontSize="8" fill="#14241B" fontFamily="sans-serif" fontWeight="700">PADDY</text>
      <text x="190" y="138" textAnchor="middle" fontSize="10" fill="#C9963A" fontFamily="sans-serif" fontWeight="900">ಭತ್ತ</text>

      {/* Weighing scale */}
      <rect x="56" y="160" width="80" height="48" rx="6" fill="#FDF6E3" stroke="#14241B" strokeWidth="1.5" />
      <text x="96" y="178" textAnchor="middle" fontSize="7" fill="#54665B" fontFamily="sans-serif">ತೂಕ · Weight</text>
      <text x="96" y="195" textAnchor="middle" fontSize="18" fill="#14241B" fontFamily="sans-serif" fontWeight="900">85</text>
      <text x="96" y="204" textAnchor="middle" fontSize="6" fill="#54665B" fontFamily="sans-serif">ಕ್ವಿಂಟಾಲ್</text>
      <rect x="72" y="208" width="48" height="8" rx="4" fill="#C9963A" />
      <rect x="60" y="216" width="72" height="4" rx="2" fill="#14241B" opacity="0.15" />
      <rect x="88" y="220" width="4" height="18" rx="2" fill="#54665B" opacity="0.4" />
      <rect x="100" y="220" width="4" height="18" rx="2" fill="#54665B" opacity="0.4" />
      <rect x="80" y="235" width="32" height="4" rx="2" fill="#54665B" opacity="0.25" />

      {/* Handshake */}
      <rect x="246" y="158" width="120" height="52" rx="10" fill="#0B2418" />
      <text x="306" y="175" textAnchor="middle" fontSize="9" fill="#F0B429" fontFamily="sans-serif" fontWeight="700">🤝 ಒಪ್ಪಿಗೆ</text>
      <text x="306" y="187" textAnchor="middle" fontSize="6.5" fill="#FDF6E3" fontFamily="sans-serif">ಬೆಲೆ ಮೊದಲು ಒಪ್ಪಿಗೆ</text>
      <text x="306" y="197" textAnchor="middle" fontSize="6" fill="#9CC4A8" fontFamily="sans-serif">Price agreed before pickup</text>

      {/* Transparency strip */}
      <rect x="86" y="246" width="208" height="22" rx="8" fill="#2A7A3B" opacity="0.12" />
      <text x="190" y="260" textAnchor="middle" fontSize="8" fill="#1E5B3A" fontFamily="sans-serif" fontWeight="700">ತೂಕ ರೈತರ ಎದುರಿಗೆ · Weighing in front of the farmer</text>

      {/* Moisture tag */}
      <rect x="246" y="108" width="120" height="44" rx="8" fill="#FDF6E3" stroke="#EDE1C2" strokeWidth="1" />
      <text x="306" y="123" textAnchor="middle" fontSize="7" fill="#14241B" fontFamily="sans-serif" fontWeight="700">ಗುಣಮಟ್ಟ ✓</text>
      <text x="306" y="134" textAnchor="middle" fontSize="13" fill="#C9963A" fontFamily="sans-serif" fontWeight="900">14.2%</text>
      <text x="306" y="145" textAnchor="middle" fontSize="6" fill="#54665B" fontFamily="sans-serif">PaddyLink ತೇವಾಂಶ</text>
    </svg>
  );
}

function PayIllo() {
  return (
    <svg viewBox="0 0 380 280" fill="none" className={styles.illo} role="img"
      aria-label="Direct payment from buyer to farmer with PaddyLink not in the middle, lorry loaded after payment">
      <rect width="380" height="280" fill="#F6EFDA" />

      {/* Buyer card */}
      <rect x="14" y="50" width="110" height="80" rx="12" fill="#FDF6E3" stroke="#EDE1C2" strokeWidth="1.5" />
      <text x="69" y="74" textAnchor="middle" fontSize="8" fill="#54665B" fontFamily="sans-serif">ಖರೀದಿದಾರ</text>
      <text x="69" y="85" textAnchor="middle" fontSize="7" fill="#54665B" fontFamily="sans-serif">BUYER</text>
      <circle cx="69" cy="106" r="14" fill="#C9963A" opacity="0.15" stroke="#C9963A" strokeWidth="1" />
      <text x="69" y="111" textAnchor="middle" fontSize="14" fontFamily="sans-serif">🧑‍💼</text>

      {/* Direct payment arrow */}
      <path d="M130 90 L246 90" stroke="#C9963A" strokeWidth="3" strokeLinecap="round" />
      <path d="M238 84 L246 90 L238 96" stroke="#C9963A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="152" y="74" width="84" height="18" rx="7" fill="#0B2418" />
      <text x="194" y="87" textAnchor="middle" fontSize="7" fill="#F0B429" fontFamily="sans-serif" fontWeight="700">ನೇರ ಪಾವತಿ · Direct</text>

      {/* Farmer card */}
      <rect x="256" y="50" width="110" height="80" rx="12" fill="#FDF6E3" stroke="#EDE1C2" strokeWidth="1.5" />
      <text x="311" y="74" textAnchor="middle" fontSize="8" fill="#54665B" fontFamily="sans-serif">ರೈತ</text>
      <text x="311" y="85" textAnchor="middle" fontSize="7" fill="#54665B" fontFamily="sans-serif">FARMER</text>
      <circle cx="311" cy="106" r="14" fill="#2A7A3B" opacity="0.15" stroke="#2A7A3B" strokeWidth="1" />
      <text x="311" y="111" textAnchor="middle" fontSize="14" fontFamily="sans-serif">🧑‍🌾</text>

      {/* Not in the middle */}
      <rect x="110" y="144" width="160" height="24" rx="8" fill="#FDF6E3" stroke="#C9963A" strokeWidth="1" strokeDasharray="4 2" />
      <text x="190" y="160" textAnchor="middle" fontSize="7.5" fill="#C9963A" fontFamily="sans-serif" fontWeight="700">PaddyLink ಮಧ್ಯದಲ್ಲಿಲ್ಲ · Not in the middle</text>

      {/* Lorry */}
      <rect x="20" y="182" width="340" height="60" rx="10" fill="#0B2418" />
      <rect x="30" y="192" width="60" height="42" rx="6" fill="#F0B429" opacity="0.35" />
      <rect x="33" y="196" width="52" height="22" rx="3" fill="#0B2418" opacity="0.6" />
      <rect x="92" y="192" width="250" height="42" rx="4" fill="#F0B429" opacity="0.1" stroke="#F0B429" strokeWidth="0.8" />
      {[120, 150, 180, 210, 240, 270, 300].map((x) => (
        <line key={x} x1={x} y1="194" x2={x} y2="233" stroke="#F0B429" strokeWidth="0.8" opacity="0.25" />
      ))}
      <circle cx="58" cy="244" r="9" fill="#FDF6E3" stroke="#F0B429" strokeWidth="1.5" />
      <circle cx="58" cy="244" r="4" fill="#F0B429" />
      <circle cx="310" cy="244" r="9" fill="#FDF6E3" stroke="#F0B429" strokeWidth="1.5" />
      <circle cx="310" cy="244" r="4" fill="#F0B429" />
      <text x="210" y="218" textAnchor="middle" fontSize="11" fill="#F0B429" fontFamily="sans-serif" fontWeight="900">ಲಾರಿ ತುಂಬಿ · Lorry Loaded!</text>
      <text x="210" y="232" textAnchor="middle" fontSize="7" fill="#9CC4A8" fontFamily="sans-serif">Paddy loaded once payment confirmed</text>

      <text x="190" y="272" textAnchor="middle" fontSize="8" fill="#54665B" fontFamily="sans-serif">ಪಾವತಿ → ಭತ್ತ → ಲಾರಿ · Your paddy, your lorry, your deal</text>
    </svg>
  );
}

/* ── Content data ──────────────────────────────────────────────────── */

const FAIR = [
  { kn: 'ಬೆಲೆ ಮೊದಲು ಒಪ್ಪಿಗೆ', en: 'Price agreed before pickup — no surprises at the farm gate' },
  { kn: 'ತೂಕ ಪಾರದರ್ಶಕ', en: 'Weighing done in front of the farmer — transparent, undisputed' },
  { kn: 'ಪಾವತಿ ಮೊದಲು, ನಂತರ ಭತ್ತ', en: 'Payment before lifting — the farmer always receives before you take' },
  { kn: 'ಸಂಹಿತೆ ಮುರಿದರೆ ರದ್ದು', en: 'Breaking the code ends your verification — farmers know this' },
];

const PILLARS = [
  { kn: 'ಹೆಚ್ಚು ರೈತರು', en: 'More Farmers', sub: "Paddy growers directly connected across Karnataka's rice belt" },
  { kn: 'ನೈಜ ಪಟ್ಟಿಗಳು', en: 'Real Listings', sub: 'Direct from farmers, fresh by harvest month' },
  { kn: 'ಹೆಚ್ಚು ಭತ್ತ', en: 'More Paddy', sub: 'Unpolished paddy → mill it your way, all varieties' },
  { kn: 'ಹೆಚ್ಚು ವ್ಯವಹಾರ', en: 'More Business', sub: 'Direct deals, better margins, faster sourcing' },
];

/* ── Page ──────────────────────────────────────────────────────────── */

export default function Buyers() {
  return (
    <main className={styles.page}>
      {/* Hero strip */}
      <div className={styles.hero}>
        {[200, 380, 560].map((s) => (
          <div key={s} className={styles.ring} style={{ width: s, height: s }} />
        ))}
        <div className={styles.heroInner}>
          <div className={styles.badge}>
            <div className={styles.badgeDot} />
            <span className={styles.badgeText}>
              <T kn="ಖರೀದಿದಾರ ನೋಂದಣಿ · Buyer Registration" en="ಖರೀದಿದಾರ ನೋಂದಣಿ · Buyer Registration" />
            </span>
          </div>
          <h1 className={styles.heroTitle}>
            <T kn="6 ಹಂತಗಳಲ್ಲಿ ಪರಿಶೀಲಿತ ಖರೀದಿದಾರ" en="6 ಹಂತಗಳಲ್ಲಿ ಪರಿಶೀಲಿತ ಖರೀದಿದಾರ" />
          </h1>
          <p className={styles.heroSub}>
            <T
              kn="Become a Verified Buyer in 6 Steps — Karnataka's Rice Belt"
              en="Become a Verified Buyer in 6 Steps — Karnataka's Rice Belt"
            />
          </p>
          <CTAButton kn="ಖರೀದಿದಾರರಾಗಿ ನೋಂದಾಯಿಸಿ" en="Register as Buyer" large />
        </div>
      </div>

      {/* Timeline */}
      <div className={styles.timeline}>
        <div className={styles.centerLine} />

        <Row
          n={1}
          left={
            <TextSide
              kn="ನೋಂದಣಿ ಮತ್ತು ದಾಖಲೆ"
              title="Register & Submit Documents"
              knBullets={['ಮೊಬೈಲ್ + OTP ನೋಂದಣಿ', 'GST · PAN · APMC ಪರವಾನಗಿ', 'ಫೋಟೋ ಅಥವಾ PDF ಅಪ್ಲೋಡ್']}
              bullets={[
                'Mobile number + OTP — takes 2 minutes',
                'GST Certificate · PAN Card · APMC Trade License (optional)',
                'Upload photos or PDFs — our team handles the rest',
              ]}
            />
          }
          right={<IlloCard><RegisterDocIllo /></IlloCard>}
        />

        <Row
          n={2}
          left={<IlloCard><VerificationIllo /></IlloCard>}
          right={
            <TextSide
              kn="ಪರಿಶೀಲನೆ 24–48 ಗಂಟೆ"
              title="Verified in 24–48 hours"
              knBullets={['ತಂಡದಿಂದ ದಾಖಲೆ ಪರಿಶೀಲನೆ', 'ಕಾಯುವಾಗಲೇ ಪಟ್ಟಿಗಳನ್ನು ನೋಡಿ', 'ಅನುಮೋದನೆ ನಂತರ SMS']}
              bullets={[
                'Our team reviews your documents manually',
                'Browse listings and see supply while you wait',
                'SMS notification the moment you are approved',
              ]}
            />
          }
        />

        <Row
          n={3}
          left={
            <TextSide
              kn="ಪಟ್ಟಿಗಳು ಮತ್ತು ಗುಣಮಟ್ಟ ನೋಡಿ"
              title="Browse listings with quality values"
              knBullets={['ತಳಿ, ಪ್ರಮಾಣ, ತಾಲ್ಲೂಕು ಫಿಲ್ಟರ್', 'PaddyLink ತಂಡ ಅಳೆದ ತೇವಾಂಶ ಮೌಲ್ಯ', 'ಕಟಾವಿಗೆ ಮೊದಲೇ ಪೂರೈಕೆ ನೋಡಿ']}
              bullets={[
                'Filter by variety, quantity, taluk, and harvest month',
                'Moisture values measured by the PaddyLink team at harvest — not self-reported',
                'Growing-season listings show upcoming harvests so you see supply before the mandi does',
              ]}
            />
          }
          right={<IlloCard><BrowseIllo /></IlloCard>}
        />

        {/* Mid-page CTA band */}
        <div className={styles.midCta}>
          <div>
            <p className={styles.midKicker}>
              <T kn="Ready to source paddy?" en="Ready to source paddy?" />
            </p>
            <p className={styles.midTitle}>
              <T kn="ಈಗಲೇ ನೋಂದಾಯಿಸಿ" en="ಈಗಲೇ ನೋಂದಾಯಿಸಿ" />
            </p>
            <p className={styles.midSub}>
              <T
                kn="Get verified in 24–48 hrs and start browsing listings"
                en="Get verified in 24–48 hrs and start browsing listings"
              />
            </p>
          </div>
          <CTAButton kn="ಖರೀದಿದಾರರಾಗಿ ನೋಂದಾಯಿಸಿ" en="Register as Buyer" />
        </div>

        <Row
          n={4}
          left={<IlloCard><UnlockIllo /></IlloCard>}
          right={
            <TextSide
              kn="ಸಂಪರ್ಕ ತೆರೆಯಿರಿ"
              title="Unlock the farmer's contact"
              knBullets={['ಖಾತೆಯಿಂದ ಸಂಪರ್ಕ ತೆರೆಯಿರಿ', 'ನೇರ ಕರೆ ಅಥವಾ WhatsApp', 'ರೈತರಿಗೆ ನಿಮ್ಮ ಹೆಸರು ತಿಳಿಸಲಾಗುತ್ತದೆ']}
              bullets={[
                'Unlock from your account — no intermediary',
                'Call or WhatsApp directly',
                'The farmer is told your name — so your call is expected and trusted',
              ]}
            />
          }
        />

        <Row
          n={5}
          left={
            <TextSide
              kn="ಸ್ಥಳಕ್ಕೆ ಭೇಟಿ, ಖುದ್ದು ಪರಿಶೀಲನೆ"
              title="Visit and inspect in person"
              knBullets={['ಭತ್ತ ನೋಡಿ, ಖುದ್ದು ಪರೀಕ್ಷಿಸಿ', 'ಬೆಲೆ ಮತ್ತು ಪ್ರಮಾಣ ಮುಖಾಮುಖಿ ಒಪ್ಪಿಗೆ', 'ತೂಕ ರೈತರ ಎದುರಿಗೆ, ಪಾರದರ್ಶಕ']}
              bullets={[
                'See the paddy with your own eyes — no middleman description',
                'Agree price and quantity face to face',
                'Weighing done in front of the farmer — transparent, undisputed',
              ]}
            />
          }
          right={<IlloCard><InspectIllo /></IlloCard>}
        />

        <Row
          n={6}
          left={<IlloCard><PayIllo /></IlloCard>}
          right={
            <TextSide
              kn="ಪಾವತಿ ಮೊದಲು, ನಂತರ ಭತ್ತ"
              title="Pay first, then take the paddy"
              knBullets={['ನೇರ ಪಾವತಿ ರೈತರಿಗೆ', 'ಪಾವತಿ ಮೇಲೆ ಲಾರಿಗೆ ಭತ್ತ ತುಂಬುತ್ತಾರೆ', 'PaddyLink ಮಧ್ಯದಲ್ಲಿಲ್ಲ']}
              bullets={[
                'Payment goes directly to the farmer — PaddyLink is never in the middle',
                'Once payment is confirmed, paddy is loaded on your lorry',
                'The entire deal is between you and the farmer',
              ]}
            />
          }
        />
      </div>

      {/* Fair Dealing Code */}
      <div className={styles.fair}>
        <div className={styles.fairInner}>
          <div className={styles.fairHead}>
            <div className={styles.badge}>
              <div className={styles.badgeDot} />
              <span className={styles.fairBadgeText}>
                <T
                  kn="ಪ್ರತಿ ಪರಿಶೀಲಿತ ಖರೀದಿದಾರ ಒಪ್ಪುವ ಕ್ರಮ · Every verified buyer agrees"
                  en="ಪ್ರತಿ ಪರಿಶೀಲಿತ ಖರೀದಿದಾರ ಒಪ್ಪುವ ಕ್ರಮ · Every verified buyer agrees"
                />
              </span>
            </div>
            <h2 className={styles.fairTitle}>
              <T kn="ನ್ಯಾಯಯುತ ವ್ಯವಹಾರ ಸಂಹಿತೆ" en="ನ್ಯಾಯಯುತ ವ್ಯವಹಾರ ಸಂಹಿತೆ" />
            </h2>
            <p className={styles.fairSub}>
              <T kn="The Fair Dealing Code" en="The Fair Dealing Code" />
            </p>
            <p className={styles.fairLede}>
              <T
                kn="This is why farmers across Karnataka's rice belt trust PaddyLink buyers — and answer their calls."
                en="This is why farmers across Karnataka's rice belt trust PaddyLink buyers — and answer their calls."
              />
            </p>
          </div>

          <div className={styles.fairGrid}>
            {FAIR.map((item, i) => (
              <div key={item.kn} className={styles.fairCard}>
                <div className={styles.fairNum}>{i + 1}</div>
                <p className={styles.fairCardKn}>
                  <T kn={item.kn} en={item.kn} />
                </p>
                <p className={styles.fairCardEn}>
                  <T kn={item.en} en={item.en} />
                </p>
              </div>
            ))}
          </div>

          <div className={styles.fairClose}>
            <p className={styles.fairCloseKn}>
              <T kn="ರೈತರು ಏಕೆ ಉತ್ತರಿಸುತ್ತಾರೆ?" en="ರೈತರು ಏಕೆ ಉತ್ತರಿಸುತ್ತಾರೆ?" />
            </p>
            <p className={styles.fairCloseEn}>
              <T
                kn="Why do farmers answer PaddyLink buyer calls?"
                en="Why do farmers answer PaddyLink buyer calls?"
              />{' '}
              <strong className={styles.fairCloseStrong}>
                <T
                  kn="Because they know the buyer has agreed to the code — price first, weighing transparent, payment before lifting."
                  en="Because they know the buyer has agreed to the code — price first, weighing transparent, payment before lifting."
                />
              </strong>{' '}
              <T kn="That trust is the product." en="That trust is the product." />
            </p>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className={styles.bottomCta}>
        {[160, 300].map((s) => (
          <div key={s} className={styles.ring} style={{ width: s, height: s }} />
        ))}
        <div className={styles.heroInner}>
          <p className={styles.bottomTitle}>
            <T kn="ಹೆಚ್ಚು ಭತ್ತ. ಹೆಚ್ಚು ವ್ಯವಹಾರ." en="ಹೆಚ್ಚು ಭತ್ತ. ಹೆಚ್ಚು ವ್ಯವಹಾರ." />
          </p>
          <p className={styles.bottomSub}>
            <T kn="More Paddy. More Business. Start today." en="More Paddy. More Business. Start today." />
          </p>
          <CTAButton kn="ಖರೀದಿದಾರರಾಗಿ ನೋಂದಾಯಿಸಿ" en="Register as Buyer" large />
        </div>
      </div>

      {/* Value-prop pillars */}
      <div className={styles.pillars}>
        {PILLARS.map((p) => (
          <div key={p.en} className={styles.pillar}>
            <div className={styles.pillarRule} />
            <p className={styles.pillarKn}>
              <T kn={p.kn} en={p.kn} />
            </p>
            <p className={styles.pillarEn}>
              <T kn={p.en} en={p.en} />
            </p>
            <p className={styles.pillarSub}>
              <T kn={p.sub} en={p.sub} />
            </p>
          </div>
        ))}
      </div>

      {/* Sticky register — scoped to this route by living in this component */}
      <div className={styles.sticky}>
        <Link href={REGISTER} className={styles.stickyBtn}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <circle cx="9" cy="6" r="3.5" stroke="var(--hottu-50)" strokeWidth="1.8" />
            <path d="M2 17c0-4 3.1-6.5 7-6.5s7 2.5 7 6.5" stroke="var(--hottu-50)" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span className={styles.stickyLabel}>
            <T kn="ನೋಂದಾಯಿಸಿ · Register" en="ನೋಂದಾಯಿಸಿ · Register" />
          </span>
        </Link>
      </div>
    </main>
  );
}
