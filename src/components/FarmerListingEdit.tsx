'use client';

import { useRouter } from 'next/navigation';
import FarmerListingFormV2, { type ListingEditTarget } from './FarmerListingFormV2';
import type { ReferenceData } from '@/lib/reference';

/**
 * The edit screen's client shell. It exists only to give the form somewhere
 * to go after a save — the page around it is a Server Component and cannot
 * hand a callback down.
 *
 * The form itself is the same FarmerListingFormV2 the create flow uses. No
 * second form, no copy of the fields, no copy of the validation.
 *
 * On success the farmer lands back on his listings with the corrected card
 * already rendered: refresh() re-runs the server read before the navigation
 * paints, so the page cannot show the values he just replaced.
 */
export default function FarmerListingEdit({
  reference,
  target,
}: {
  reference: ReferenceData;
  target: ListingEditTarget;
}) {
  const router = useRouter();

  return (
    <FarmerListingFormV2
      reference={reference}
      mobile={target.mobile}
      edit={target}
      onSaved={() => {
        router.refresh();
        router.push('/farmer/listings');
      }}
    />
  );
}
