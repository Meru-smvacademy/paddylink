import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import FarmerListings from '@/components/FarmerListings';
import { getFarmerListings } from '@/lib/farmerListings';
import { farmerMobile } from '@/lib/otpSession';

/* Private route: part of the farmer path, reached from the success screen
   after a listing is submitted. Nothing public links here, and it stays out
   of search. */
export const metadata: Metadata = {
  title: 'ನನ್ನ ಪಟ್ಟಿಗಳು — PaddyLink',
  robots: { index: false, follow: false },
};

/* One farmer's own data: never cached, never prerendered. */
export const dynamic = 'force-dynamic';

export default async function FarmerListingsPage() {
  /* TEMP-PRE-AUTH (narrowed): the farmer is PROVEN — a signed session token
     from /api/otp/verify, which is the only thing that can mint one. No valid
     token means the flow starts over rather than guessing. What remains
     temporary is the read below: service-role, RLS bypassed, because there is
     no auth.uid() yet. */
  const mobile = await farmerMobile();
  if (!mobile || !/^\d{10}$/.test(mobile)) {
    redirect('/login/farmer');
  }

  const listings = await getFarmerListings(mobile);
  return <FarmerListings listings={listings} />;
}
