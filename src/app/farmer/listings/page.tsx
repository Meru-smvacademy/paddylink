import type { Metadata } from 'next';
import FarmerListings from '@/components/FarmerListings';

/* Private route: part of the farmer path, reached from the success screen
   after a listing is submitted. Nothing public links here, and it stays out
   of search. */
export const metadata: Metadata = {
  title: 'ನನ್ನ ಪಟ್ಟಿಗಳು — PaddyLink',
  robots: { index: false, follow: false },
};

/* DEV-EMPTY-PARAM: the frame reached its empty state through a demo toggle in
   a top bar we replace. That toggle is scaffolding and is not built; ?empty=1
   stands in so the state stays reviewable, with no control anywhere in the
   UI. It goes away when real listings arrive.

   searchParams is a promise in this version of Next and must be awaited. */
export default async function FarmerListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const empty = (await searchParams).empty === '1';
  return <FarmerListings empty={empty} />;
}
