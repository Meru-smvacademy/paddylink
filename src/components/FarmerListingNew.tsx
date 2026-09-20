'use client';

import { useRouter } from 'next/navigation';
import FarmerListingFormV2, { type ListingPrefill } from './FarmerListingFormV2';
import type { ReferenceData } from '@/lib/reference';

/**
 * The client half of /farmer/listings/new, and the twin of
 * FarmerListingEdit: a Server Component fetches the reference data and the
 * farmer's identity, and this supplies the one thing a server page cannot —
 * a callback.
 *
 * CREATE, NOT EDIT. No `edit` prop is passed, so the form stays in create
 * mode end to end: the create endpoint, the consent block, the create
 * heading and button. `prefill` only fills the identity fields. The listing
 * this posts is a NEW row — /api/farmer/listings inserts unconditionally
 * and touches no existing listing.
 *
 * WHY refresh BEFORE push. /farmer/listings is force-dynamic, but the client
 * router still holds the copy it rendered on the way in; pushing to it
 * without invalidating that cache lands the farmer on the page he just left,
 * without the listing he just made. Same order as FarmerListingEdit.
 */
export default function FarmerListingNew({
  reference,
  mobile,
  prefill,
}: {
  reference: ReferenceData;
  /** From the signed session. Shown read-only; never submitted. */
  mobile: string;
  /** Absent for a farmer with no farmers row yet — the form renders blank. */
  prefill?: ListingPrefill;
}) {
  const router = useRouter();

  return (
    <FarmerListingFormV2
      reference={reference}
      mobile={mobile}
      prefill={prefill}
      onSubmitted={() => {
        router.refresh();
        router.push('/farmer/listings');
      }}
    />
  );
}
