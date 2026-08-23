import type { Metadata } from 'next';
import LegalDoc from '@/components/LegalDoc';
import { PRIVACY_TITLE, PRIVACY_SUMMARY, PRIVACY_SECTIONS } from '@/components/legal/privacyContent';

export const metadata: Metadata = {
  title: 'Privacy Policy — PaddyLink',
  description: "How PaddyLink collects, uses and protects farmer and buyer data. A farmer's number is revealed only on a verified buyer's unlock.",
};

export default function PrivacyPage() {
  return (
    <LegalDoc title={PRIVACY_TITLE} summary={PRIVACY_SUMMARY} sections={PRIVACY_SECTIONS} />
  );
}
