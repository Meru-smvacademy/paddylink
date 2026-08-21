import type { Metadata } from 'next';
import About from '@/components/About';

export const metadata: Metadata = {
  title: 'ನಮ್ಮ ಬಗ್ಗೆ — PaddyLink',
  description:
    "PaddyLink connects farmers of Karnataka's rice belt directly with verified buyers. We don't buy or sell, take no commission, and never set prices — we only connect.",
};

export default function AboutPage() {
  return <About />;
}
