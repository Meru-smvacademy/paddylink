import type { Metadata } from 'next';
import BuyerListings from '@/components/BuyerListings';
import { getBrowseListings } from '@/lib/browseListings';
import { getReferenceData } from '@/lib/reference';
import { getUnlockCost } from '@/lib/unlockPricing';
import { getBuyerWallet } from '@/lib/buyerWallet';
import { buyerMobile } from '@/lib/otpSession';

/* Private route: reached only by finishing the buyer OTP flow at
   /login/buyer. Nothing public links here, and it stays out of search. */
export const metadata: Metadata = {
  title: 'ಭತ್ತದ ಪಟ್ಟಿಗಳು / Paddy Listings — PaddyLink',
  robots: { index: false, follow: false },
};

/* Listings change as farmers post them; never serve a stale market. */
export const dynamic = 'force-dynamic';

export default async function BuyerListingsPage() {
  /* First paint comes from the server so the grid is never empty-then-filled.
     Every filter change afterwards is the same query from the browser.

     The unlock price is read here rather than carried as a constant, so the
     screen quotes what the database would actually charge. It is read on the
     server: config also holds token_packs, which carries rupee prices that
     004 keeps away from the anon key, so only the single integer crosses to
     the client. null means the read failed — the component says so and
     blocks unlocking rather than guessing a price. */
  /* The balance is this buyer's token_ledger sum — the same figure the wallet
     shows, read the same way. null when the device carries no buyer session:
     shown as "—", never as a number we made up. */
  const mobile = await buyerMobile();

  const [initialListings, reference, unlockCost, wallet] = await Promise.all([
    getBrowseListings(),
    getReferenceData(),
    getUnlockCost(),
    mobile && /^\d{10}$/.test(mobile) ? getBuyerWallet(mobile) : Promise.resolve(null),
  ]);

  return (
    <BuyerListings
      initialListings={initialListings}
      unlockCost={unlockCost}
      balance={wallet?.balance ?? null}
      /* The same cookie the balance was read with. This route serves a signed-
         out browser too, so the sign-out control is only offered when there
         is a session to end. */
      signedIn={wallet !== null}
      /* Every district, not just the operational three: a buyer filters by
         where the paddy is, and that grows as operations do. */
      districts={reference.districts}
      varieties={reference.varieties}
    />
  );
}
