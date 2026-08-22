import type { Metadata } from 'next';
import BuyerListings from '@/components/BuyerListings';

/* Private route: reached only by finishing the buyer OTP flow at
   /login/buyer. Nothing public links here, and it stays out of search. */
export const metadata: Metadata = {
  title: 'ಭತ್ತದ ಪಟ್ಟಿಗಳು / Paddy Listings — PaddyLink',
  robots: { index: false, follow: false },
};

export default function BuyerListingsPage() {
  return <BuyerListings />;
}
