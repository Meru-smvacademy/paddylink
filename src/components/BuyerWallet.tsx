'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { BuyerWallet as Wallet } from '@/lib/buyerWallet';
import T from './T';
import styles from './BuyerWallet.module.css';

/**
 * The buyer's wallet: what he has, what a pack costs, and what he spent it on.
 *
 * Reached from the "+ ಸೇರಿಸಿ / Add" control on /buyer/listings, which until
 * now went nowhere.
 *
 * NO NEW VISUAL LANGUAGE. Every value here is the buyer listings frame's,
 * reused by role rather than redrawn: the same top bar, the same token chip,
 * the same card (hottu-50 on hottu-200, 0.75rem radius, gold stripe), the
 * same gold CTA, the same safety-panel treatment for the standing notices.
 * The stylesheet header maps each one. No new token, no new colour.
 *
 * LANGUAGE follows the buyer side: Kannada with a smaller English twin, and
 * the ಕ|EN toggle does not flip it, so every <T> carries the same string in
 * both slots — the pattern BuyerListings established.
 *
 * THE BROWSER NEVER WRITES A BALANCE, and cannot. There is no setState here
 * that adds tokens, no arithmetic on the balance, and no path from the
 * checkout callback to a number on screen. What the callback does is switch
 * to a waiting state and start ASKING the server. The figure shown is always
 * the one the server read out of token_ledger, which only the webhook writes.
 * Razorpay's own success callback is not evidence a payment cleared — it
 * fires in a browser the buyer controls.
 */

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

/* Long enough to cover a slow webhook, short enough that a stuck order stops
   spinning and says so. */
const POLL_MS = 2500;
const POLL_LIMIT = 48; // ~2 minutes

type Phase = 'idle' | 'opening' | 'waiting' | 'credited' | 'failed';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadCheckout(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.Razorpay) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('checkout_script_failed')));
      return;
    }
    const el = document.createElement('script');
    el.src = CHECKOUT_SRC;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('checkout_script_failed'));
    document.body.appendChild(el);
  });
}

/* The frame's coin, unchanged — DEV-GLYPH, it ships bare. */
function Coin({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="var(--bhatta-400)" stroke="var(--bhatta-600)" strokeWidth="1.2" />
    </svg>
  );
}

function rupees(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

const MONTHS_KN = [
  'ಜನವರಿ', 'ಫೆಬ್ರವರಿ', 'ಮಾರ್ಚ್', 'ಏಪ್ರಿಲ್', 'ಮೇ', 'ಜೂನ್',
  'ಜುಲೈ', 'ಆಗಸ್ಟ್', 'ಸೆಪ್ಟೆಂಬರ್', 'ಅಕ್ಟೋಬರ್', 'ನವೆಂಬರ್', 'ಡಿಸೆಂಬರ್',
];

function whenKn(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_KN[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * The standing notices. Required on this page and on the unlock confirm
 * screen, so they live in one exported place and are rendered in both —
 * one wording, not two that drift.
 */
export const POSITIONING = {
  roleKn: 'PaddyLink ಖರೀದಿದಾರರನ್ನು ರೈತರಿಗೆ ಪರಿಚಯಿಸುತ್ತದೆ. ನಾವು ಭತ್ತ ಮಾರುವುದಿಲ್ಲ, ಹಣ ಹಿಡಿದಿಡುವುದಿಲ್ಲ, ಯಾವ ವ್ಯವಹಾರಕ್ಕೂ ಖಾತರಿ ಕೊಡುವುದಿಲ್ಲ.',
  roleEn: '/ PaddyLink introduces buyers to farmers. We do not sell paddy, hold money, or guarantee any deal.',
  qualityKn: 'ರೈತರಿಗೆ ಹಣ ಕೊಡುವ ಮೊದಲು ಗುಣಮಟ್ಟ ಪರಿಶೀಲಿಸಿ.',
  qualityEn: '/ Check quality before you pay the farmer.',
  refundKn: 'ಅನ್‌ಲಾಕ್ ಮಾಡಿದ 12 ಗಂಟೆಗಳ ಒಳಗೆ ರೈತ ಭತ್ತ ಮಾರಾಟವಾಗಿದೆ ಎಂದು ಗುರುತಿಸಿದರೆ ಮಾತ್ರ ಟೋಕನ್ ತಾನಾಗಿಯೇ ಮರಳುತ್ತದೆ. ಬೇರೆ ಯಾವ ಮರುಪಾವತಿಯೂ ಇಲ್ಲ.',
  refundEn: '/ Tokens are returned automatically only if the farmer marks the paddy sold within 12 hours of an unlock. No other refunds.',
} as const;

export function PositioningNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${styles.notice} ${compact ? styles.noticeCompact : ''}`}>
      <p className={styles.noticeItem}>
        <span className={styles.noticeKn}>
          <T kn={POSITIONING.roleKn} en={POSITIONING.roleKn} />
        </span>
        <span className={styles.noticeEn}>
          <T kn={POSITIONING.roleEn} en={POSITIONING.roleEn} />
        </span>
      </p>
      <p className={styles.noticeItem}>
        <span className={styles.noticeKn}>
          <T kn={POSITIONING.qualityKn} en={POSITIONING.qualityKn} />
        </span>
        <span className={styles.noticeEn}>
          <T kn={POSITIONING.qualityEn} en={POSITIONING.qualityEn} />
        </span>
      </p>
      <p className={styles.noticeItem}>
        <span className={styles.noticeKn}>
          <T kn={POSITIONING.refundKn} en={POSITIONING.refundKn} />
        </span>
        <span className={styles.noticeEn}>
          <T kn={POSITIONING.refundEn} en={POSITIONING.refundEn} />
        </span>
      </p>
    </div>
  );
}

export default function BuyerWallet({ wallet }: { wallet: Wallet }) {
  const router = useRouter();
  /* Server-read balance. Only ever REPLACED by another server read — never
     incremented here. */
  const [balance, setBalance] = useState(wallet.balance);
  const [phase, setPhase] = useState<Phase>(wallet.pending ? 'waiting' : 'idle');
  const [failure, setFailure] = useState<string | null>(null);
  const pollCount = useRef(0);

  /* While an order is outstanding, ask the server what the ledger says. This
     is the only thing that can change the number on screen. */
  useEffect(() => {
    if (phase !== 'waiting') return;
    pollCount.current = 0;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      pollCount.current += 1;
      try {
        const res = await fetch('/api/buyer/orders', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          setBalance(data.balance);
          if (!data.pending) {
            setPhase('credited');
            router.refresh();
            return;
          }
        }
      } catch {
        /* A failed poll is not a failed payment. Keep asking. */
      }
      if (!cancelled && pollCount.current < POLL_LIMIT) {
        timer = setTimeout(tick, POLL_MS);
      } else if (!cancelled) {
        /* Still pending. NOT an error and NOT a credit — the order is on
           record and the admin pending list will show it. */
        setPhase('waiting');
      }
    };

    let timer = setTimeout(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phase, router]);

  const buy = useCallback(async () => {
    setFailure(null);
    setPhase('opening');
    try {
      /* The order row is written server-side before this returns. */
      const res = await fetch('/api/buyer/orders', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const order = await res.json();
      await loadCheckout();
      if (!window.Razorpay) throw new Error('checkout_unavailable');

      const rz = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'PaddyLink',
        description: `${order.tokens} tokens`,
        prefill: { name: order.buyerName ?? '', contact: order.buyerMobile ?? '' },
        theme: { color: '#C9963A' },
        handler: () => {
          /* DELIBERATELY EMPTY OF ARITHMETIC. Razorpay says the payment went
             through; that is a claim made in the buyer's own browser, not
             proof, and it is not what credits tokens. All this does is start
             asking the server. */
          setPhase('waiting');
        },
        modal: {
          ondismiss: () => {
            /* The order stays pending on purpose — he may have paid and
               closed the sheet. The waiting state, and the admin list, both
               reflect a real row. */
            setPhase('waiting');
          },
        },
      });
      rz.open();
    } catch (e) {
      const code = e instanceof Error ? e.message : String(e);
      console.error('[wallet] purchase could not start', code);
      setFailure(code);
      setPhase('failed');
    }
  }, []);

  const pack = wallet.pack;

  return (
    <main className={styles.page}>
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.titleKn}>
            <T kn="ನನ್ನ ಟೋಕನ್" en="ನನ್ನ ಟೋಕನ್" />
          </h1>
          <p className={styles.titleEn}>
            <T kn="My tokens" en="My tokens" />
          </p>
        </div>
        <div className={styles.topBarLinks}>
          <Link href="/buyer/listings" className={styles.backLink}>
            <T kn="ಪಟ್ಟಿಗಳಿಗೆ ಹಿಂದೆ / Back to listings" en="ಪಟ್ಟಿಗಳಿಗೆ ಹಿಂದೆ / Back to listings" />
          </Link>
          {/* Sign out — the admin chrome's pattern, form-posted to a route
              that clears the cookie and redirects. This component only ever
              renders for a buyer the server resolved from the cookie (the
              page renders a separate "not recognised" panel otherwise), so
              the control is unconditional. */}
          <form method="post" action="/buyer/logout">
            <button type="submit" className={styles.signOut}>
              <T kn="ಲಾಗ್ ಔಟ್ / Sign out" en="ಲಾಗ್ ಔಟ್ / Sign out" />
            </button>
          </form>
        </div>
      </div>

      <div className={styles.body}>
        {/* Balance — the ledger sum, read on the server. */}
        <section className={styles.card}>
          <div className={styles.stripe} aria-hidden="true" />
          <div className={styles.cardBody}>
            <p className={styles.cardLabel}>
              <span className={styles.cardLabelKn}>
                <T kn="ಈಗಿನ ಬಾಕಿ" en="ಈಗಿನ ಬಾಕಿ" />
              </span>
              <span className={styles.cardLabelEn}>
                <T kn="/ Current balance" en="/ Current balance" />
              </span>
            </p>
            <p className={styles.balance}>
              <Coin size={28} />
              <span className={styles.balanceNum}>{balance}</span>
              <span className={styles.balanceUnit}>
                <T kn="ಟೋಕನ್" en="ಟೋಕನ್" />
              </span>
            </p>
            <p className={styles.balanceNote}>
              <T
                kn="ಒಂದು ಸಂಪರ್ಕ ತೆರೆಯಲು 1 ಟೋಕನ್."
                en="ಒಂದು ಸಂಪರ್ಕ ತೆರೆಯಲು 1 ಟೋಕನ್."
              />
              <span className={styles.balanceNoteEn}>
                <T kn="/ One token opens one contact." en="/ One token opens one contact." />
              </span>
            </p>
          </div>
        </section>

        {/* Pack — read from config.token_packs, never written down here. */}
        <section className={styles.card}>
          <div className={styles.stripe} aria-hidden="true" />
          <div className={styles.cardBody}>
            <p className={styles.cardLabel}>
              <span className={styles.cardLabelKn}>
                <T kn="ಟೋಕನ್ ಸೇರಿಸಿ" en="ಟೋಕನ್ ಸೇರಿಸಿ" />
              </span>
              <span className={styles.cardLabelEn}>
                <T kn="/ Add tokens" en="/ Add tokens" />
              </span>
            </p>

            {pack === null ? (
              <p className={styles.packError} role="alert">
                <T
                  kn="ಟೋಕನ್ ಪ್ಯಾಕ್ ಸದ್ಯ ಲಭ್ಯವಿಲ್ಲ."
                  en="ಟೋಕನ್ ಪ್ಯಾಕ್ ಸದ್ಯ ಲಭ್ಯವಿಲ್ಲ."
                />
                <span className={styles.packErrorEn}>
                  <T kn="/ No token pack is available right now." en="/ No token pack is available right now." />
                </span>
              </p>
            ) : (
              <>
                <div className={styles.pack}>
                  <span className={styles.packTokens}>
                    <Coin size={18} />
                    <T kn={`${pack.tokens} ಟೋಕನ್`} en={`${pack.tokens} ಟೋಕನ್`} />
                  </span>
                  <span className={styles.packPrice}>{rupees(pack.price)}</span>
                </div>

                {phase === 'waiting' ? (
                  /* The waiting state. Not an error, and NOT a credited
                     balance — the number above is still whatever the ledger
                     last said. */
                  <div className={styles.waiting} role="status">
                    <span className={styles.waitingDot} aria-hidden="true" />
                    <span>
                      <span className={styles.waitingKn}>
                        <T
                          kn="ಪಾವತಿ ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ. ದೃಢಪಟ್ಟ ತಕ್ಷಣ ಟೋಕನ್ ಸೇರುತ್ತದೆ."
                          en="ಪಾವತಿ ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ. ದೃಢಪಟ್ಟ ತಕ್ಷಣ ಟೋಕನ್ ಸೇರುತ್ತದೆ."
                        />
                      </span>
                      <span className={styles.waitingEn}>
                        <T
                          kn="/ Payment is being confirmed. Tokens are added the moment it clears — you do not need to pay again."
                          en="/ Payment is being confirmed. Tokens are added the moment it clears — you do not need to pay again."
                        />
                      </span>
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={buy}
                    disabled={phase === 'opening'}
                    className={`${styles.cta} ${phase === 'opening' ? styles.ctaDisabled : ''}`}
                  >
                    <Coin size={14} />
                    <T
                      kn={`${pack.tokens} ಟೋಕನ್ ಖರೀದಿಸಿ · ${rupees(pack.price)} `}
                      en={`${pack.tokens} ಟೋಕನ್ ಖರೀದಿಸಿ · ${rupees(pack.price)} `}
                    />
                    <span className={styles.ctaEn}>
                      <T
                        kn={`/ Buy ${pack.tokens} tokens`}
                        en={`/ Buy ${pack.tokens} tokens`}
                      />
                    </span>
                  </button>
                )}

                {phase === 'credited' && (
                  <p className={styles.credited} role="status">
                    <T kn="ಟೋಕನ್ ಸೇರಿದೆ. / Tokens added." en="ಟೋಕನ್ ಸೇರಿದೆ. / Tokens added." />
                  </p>
                )}
                {phase === 'failed' && (
                  <p className={styles.packError} role="alert">
                    <T
                      kn="ಪಾವತಿ ಶುರುಮಾಡಲು ಆಗಲಿಲ್ಲ. ಮತ್ತೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸಿ."
                      en="ಪಾವತಿ ಶುರುಮಾಡಲು ಆಗಲಿಲ್ಲ. ಮತ್ತೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸಿ."
                    />
                    <span className={styles.packErrorEn}>
                      <T
                        kn={`/ Could not start the payment (${failure ?? 'unknown'}). Nothing was charged.`}
                        en={`/ Could not start the payment (${failure ?? 'unknown'}). Nothing was charged.`}
                      />
                    </span>
                  </p>
                )}
              </>
            )}
          </div>
        </section>

        {/* Unlock history */}
        <section className={styles.card}>
          <div className={styles.stripe} aria-hidden="true" />
          <div className={styles.cardBody}>
            <p className={styles.cardLabel}>
              <span className={styles.cardLabelKn}>
                <T kn="ತೆರೆದ ಸಂಪರ್ಕಗಳು" en="ತೆರೆದ ಸಂಪರ್ಕಗಳು" />
              </span>
              <span className={styles.cardLabelEn}>
                <T kn="/ Unlock history" en="/ Unlock history" />
              </span>
            </p>

            {wallet.unlocks.length === 0 ? (
              <p className={styles.empty}>
                <T
                  kn="ಇನ್ನೂ ಯಾವ ಸಂಪರ್ಕವನ್ನೂ ತೆರೆದಿಲ್ಲ."
                  en="ಇನ್ನೂ ಯಾವ ಸಂಪರ್ಕವನ್ನೂ ತೆರೆದಿಲ್ಲ."
                />
                <span className={styles.emptyEn}>
                  <T kn="/ No contacts unlocked yet." en="/ No contacts unlocked yet." />
                </span>
              </p>
            ) : (
              <ul className={styles.history}>
                {wallet.unlocks.map((u) => (
                  <li key={u.id} className={styles.historyRow}>
                    <div className={styles.historyMain}>
                      <span className={styles.historyVariety}>
                        <T
                          kn={`${u.varietyKn} · ${u.quantityQuintals} ಕ್ವಿಂಟಾಲ್`}
                          en={`${u.varietyKn} · ${u.quantityQuintals} ಕ್ವಿಂಟಾಲ್`}
                        />
                      </span>
                      {u.listingSold && (
                        <span className={styles.soldTag}>
                          <T kn="ಮಾರಾಟವಾಗಿದೆ / Sold" en="ಮಾರಾಟವಾಗಿದೆ / Sold" />
                        </span>
                      )}
                    </div>
                    <p className={styles.historyMeta}>
                      <T
                        kn={`${u.talukKn ?? ''} · ${whenKn(u.unlockedAt)}`}
                        en={`${u.talukKn ?? ''} · ${whenKn(u.unlockedAt)}`}
                      />
                    </p>
                    {/* A re-credit is never silent: it says how many and why. */}
                    {u.recredit && (
                      <p className={styles.recredit}>
                        <Coin size={13} />
                        <T
                          kn={`+${u.recredit.tokens} ಟೋಕನ್ ಮರಳಿದೆ`}
                          en={`+${u.recredit.tokens} ಟೋಕನ್ ಮರಳಿದೆ`}
                        />
                        <span className={styles.recreditReason}>
                          <T
                            kn={`/ returned — ${u.recredit.reason.replace(/_/g, ' ')} · ${whenKn(u.recredit.at)}`}
                            en={`/ returned — ${u.recredit.reason.replace(/_/g, ' ')} · ${whenKn(u.recredit.at)}`}
                          />
                        </span>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <PositioningNotice />
      </div>
    </main>
  );
}
