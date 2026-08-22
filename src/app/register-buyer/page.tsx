import type { Metadata } from 'next';
import RegisterBuyer from '@/components/RegisterBuyer';

export const metadata: Metadata = {
  title: 'ಖರೀದಿದಾರ ನೋಂದಣಿ / Buyer Registration — PaddyLink',
  description:
    'ಪರಿಶೀಲನೆಗೆ ಈ ವಿವರ ಬೇಕು — ಒಮ್ಮೆ ಮಾತ್ರ. We verify every buyer, one time only.',
};

export default function RegisterBuyerPage() {
  return <RegisterBuyer />;
}
