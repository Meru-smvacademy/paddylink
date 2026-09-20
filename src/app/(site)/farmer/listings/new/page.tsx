import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import FarmerListingNew from '@/components/FarmerListingNew';
import FarmerLogoutControl from '@/components/FarmerLogoutControl';
import { getFarmerIdentity } from '@/lib/farmerIdentity';
import { getReferenceData } from '@/lib/reference';
import { farmerMobile } from '@/lib/otpSession';
import shell from '@/components/OtpFlow.module.css';

/* Private route, reached from the ಹೊಸ ಭತ್ತ ಸೇರಿಸಿ button on
   /farmer/listings. Nothing public links here, and it stays out of search. */
export const metadata: Metadata = {
  title: 'ಹೊಸ ಭತ್ತ ಸೇರಿಸಿ — PaddyLink',
  robots: { index: false, follow: false },
};

/* One farmer's own details: never cached, never prerendered. */
export const dynamic = 'force-dynamic';

/**
 * THE SECOND LISTING, which until now had no door.
 *
 * A farmer with listings lands on /farmer/listings, and both buttons there
 * pointed at /login/farmer. He already had a session, so the OTP step
 * verified him, saw hasListings, and sent him back to the page he started
 * on — a loop with no way out. The form was reachable only by farmers with
 * nothing, which is the one group that does not need a second listing.
 *
 * This is that door. Same session gate as the listings page and the edit
 * page: the farmer is proven by the signed cookie or the flow starts over.
 */
export default async function FarmerListingNewPage() {
  const mobile = await farmerMobile();
  if (!mobile || !/^\d{10}$/.test(mobile)) {
    redirect('/login/farmer');
  }

  /* Identity is null for a proven number with no farmers row — a farmer
     becomes a row on his first listing, so this is reachable and ordinary,
     not an error. The form then renders blank and writes the row on save. */
  const [identity, reference] = await Promise.all([
    getFarmerIdentity(mobile),
    getReferenceData(),
  ]);

  /* The create flow's own shell, reused class for class, exactly as the edit
     screen reuses it. The only difference is where the back link goes. */
  return (
    <main className={shell.page}>
      <div className={`${shell.main} ${shell.mainForm}`}>
        <div className={`${shell.backRow} ${shell.backRowForm} ${shell.backRowSpread}`}>
          <Link href="/farmer/listings" className={shell.back}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M10 12L6 8l4-4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            ಹಿಂದೆ
          </Link>
          {/* Sign out, sited away from ಹಿಂದೆ and from the form's submit, with
              the same confirm step the edit screen uses — this page holds
              typed work too. Unconditional: it is only served to a farmer
              who has a session. */}
          <FarmerLogoutControl />
        </div>

        {/* prefill is passed even when there is no farmers row, with empty
            identity fields. On this route the number is proven by the
            session whether or not a row exists yet, so the read-only mobile
            belongs on screen either way; what varies is only how much of
            the rest is already filled in. */}
        <FarmerListingNew
          reference={reference}
          mobile={mobile}
          prefill={identity ?? { name: '', districtId: '', talukId: '', village: '' }}
        />
      </div>
    </main>
  );
}
