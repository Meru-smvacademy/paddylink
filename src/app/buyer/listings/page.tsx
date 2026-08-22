import type { Metadata } from 'next';
import BuyerListings from '@/components/BuyerListings';
import { getBrowseListings } from '@/lib/browseListings';
import { getReferenceData } from '@/lib/reference';

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
     Every filter change afterwards is the same query from the browser. */
  const [initialListings, reference] = await Promise.all([
    getBrowseListings(),
    getReferenceData(),
  ]);

  return (
    <BuyerListings
      initialListings={initialListings}
      /* Every district, not just the operational three: a buyer filters by
         where the paddy is, and that grows as operations do. */
      districts={reference.districts}
      varieties={reference.varieties}
    />
  );
}
