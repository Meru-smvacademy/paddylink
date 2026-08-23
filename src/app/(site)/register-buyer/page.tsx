import type { Metadata } from 'next';
import RegisterBuyer from '@/components/RegisterBuyer';
import { getReferenceData } from '@/lib/reference';

export const metadata: Metadata = {
  title: 'ಖರೀದಿದಾರ ನೋಂದಣಿ / Buyer Registration — PaddyLink',
  description:
    'ಪರಿಶೀಲನೆಗೆ ಈ ವಿವರ ಬೇಕು — ಒಮ್ಮೆ ಮಾತ್ರ. We verify every buyer, one time only.',
};

/* Districts change only when Karnataka does. */
export const revalidate = 3600;

export default async function RegisterBuyerPage() {
  /* Every district, not just the operational ones: a buyer's business address
     is not our operating scope. */
  const { districts } = await getReferenceData();
  return <RegisterBuyer districts={districts} />;
}
