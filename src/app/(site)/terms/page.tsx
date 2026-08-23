import type { Metadata } from 'next';
import LegalDoc from '@/components/LegalDoc';
import { TERMS_TITLE, TERMS_SUMMARY, TERMS_SECTIONS } from '@/components/legal/termsContent';

export const metadata: Metadata = {
  title: 'Terms & Conditions — PaddyLink',
  description: "PaddyLink is an information and connection service only. We are not a party to any sale or purchase.",
};

export default function TermsPage() {
  return (
    <LegalDoc title={TERMS_TITLE} summary={TERMS_SUMMARY} sections={TERMS_SECTIONS} />
  );
}
