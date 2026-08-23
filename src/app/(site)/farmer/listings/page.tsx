import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import FarmerListings from '@/components/FarmerListings';
import { getFarmerListings } from '@/lib/farmerListings';
import { FARMER_MOBILE_COOKIE } from '@/app/api/farmer/session/route';

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
  /* TEMP-PRE-AUTH: the OTP step puts the farmer's number in an httpOnly
     cookie because there is no session yet. No cookie means we do not know
     whose listings to show, so the flow starts over rather than guessing. */
  const mobile = (await cookies()).get(FARMER_MOBILE_COOKIE)?.value;
  if (!mobile || !/^\d{10}$/.test(mobile)) {
    redirect('/login/farmer');
  }

  const listings = await getFarmerListings(mobile);
  return <FarmerListings listings={listings} />;
}
