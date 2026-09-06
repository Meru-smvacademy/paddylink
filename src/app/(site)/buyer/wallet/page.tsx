import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import BuyerWallet from '@/components/BuyerWallet';
import { getBuyerWallet } from '@/lib/buyerWallet';
import { BUYER_MOBILE_COOKIE } from '@/app/api/buyer/session/route';
import styles from '@/components/BuyerWallet.module.css';

/* Private route, reached from /buyer/listings. Nothing public links here and
   it stays out of search: it shows one buyer's balance and spending. */
export const metadata: Metadata = {
  title: 'ನನ್ನ ಟೋಕನ್ / My tokens — PaddyLink',
  robots: { index: false, follow: false },
};

/* One buyer's own money: never cached, never prerendered. */
export const dynamic = 'force-dynamic';

export default async function BuyerWalletPage() {
  /* TEMP-PRE-AUTH: the buyer comes from the httpOnly cookie, set at
     registration. There is no session to ask, and guessing whose wallet to
     show would be worse than saying we do not know. */
  const mobile = (await cookies()).get(BUYER_MOBILE_COOKIE)?.value;
  const wallet = mobile && /^\d{10}$/.test(mobile) ? await getBuyerWallet(mobile) : null;

  if (!wallet) {
    return (
      <main className={styles.page}>
        <div className={styles.body}>
          <section className={styles.card}>
            <div className={styles.stripe} aria-hidden="true" />
            <div className={styles.cardBody}>
              <p className={styles.cardLabel}>
                <span className={styles.cardLabelKn}>ನನ್ನ ಟೋಕನ್</span>
                <span className={styles.cardLabelEn}>/ My tokens</span>
              </p>
              <p className={styles.empty}>
                ನಿಮ್ಮ ಖಾತೆ ಗುರುತಿಸಲಾಗಿಲ್ಲ.
                <span className={styles.emptyEn}>
                  / We could not tell which buyer this is on this device. Register or sign in,
                  then open the wallet again.
                </span>
              </p>
              <Link href="/register-buyer" className={styles.backLink}>
                ನೋಂದಣಿ / Register
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return <BuyerWallet wallet={wallet} />;
}
