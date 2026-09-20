import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import FarmerListingEdit from '@/components/FarmerListingEdit';
import FarmerLogoutControl from '@/components/FarmerLogoutControl';
import { getEditableListing } from '@/lib/farmerListingEdit';
import { getReferenceData } from '@/lib/reference';
import { farmerMobile } from '@/lib/otpSession';
import shell from '@/components/OtpFlow.module.css';

/* Private route, reached only from a card on /farmer/listings. Nothing
   public links here, and it stays out of search. */
export const metadata: Metadata = {
  title: 'ಪಟ್ಟಿ ಸರಿಪಡಿಸಿ — PaddyLink',
  robots: { index: false, follow: false },
};

/* One farmer's own listing: never cached, never prerendered. */
export const dynamic = 'force-dynamic';

export default async function FarmerListingEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  /* TEMP-PRE-AUTH (narrowed): the farmer is PROVEN — a signed session token
     from /api/otp/verify. No valid token means the flow starts over rather
     than guessing, exactly as /farmer/listings does. The read below is still
     service-role with RLS bypassed, pending auth.uid(). */
  const mobile = await farmerMobile();
  if (!mobile || !/^\d{10}$/.test(mobile)) {
    redirect('/login/farmer');
  }

  /* OWNERSHIP. getEditableListing selects by id AND farmer_id together, so a
     listing belonging to someone else returns null here and this renders the
     ordinary 404 — the same response a listing id that does not exist gets.
     Nothing distinguishes the two, and nothing is read out of a listing that
     is not the caller's. */
  const [target, reference] = await Promise.all([
    getEditableListing(mobile, id),
    getReferenceData(),
  ]);
  if (!target) notFound();

  /* The create flow's own shell, reused class for class, so the edit screen
     is the listing form on the page it already lives on. The only difference
     is where the back link goes. */
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
          {/* Sign out, the admin chrome's pattern — but this screen alone puts
              a confirm step in front of it, because it holds unsaved edits and
              a mis-tap here throws away typed work. The sheet is the sold
              toggle's, class for class. Still sited at the far end of the row,
              away from ಹಿಂದೆ and from the form's own submit. The page is only
              served to a farmer with a session, so it is unconditional. */}
          <FarmerLogoutControl />
        </div>

        <FarmerListingEdit reference={reference} target={target} />
      </div>
    </main>
  );
}
