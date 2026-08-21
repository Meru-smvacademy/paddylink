import type { Metadata } from 'next';
import Buyers from '@/components/Buyers';

export const metadata: Metadata = {
  title: '6 ಹಂತಗಳಲ್ಲಿ ಪರಿಶೀಲಿತ ಖರೀದಿದಾರ — PaddyLink',
  description:
    "Become a Verified Buyer in 6 Steps — Karnataka's Rice Belt. Register, get verified in 24–48 hours, browse listings with quality values, and deal directly with farmers.",
};

export default function BuyersPage() {
  return <Buyers />;
}
