import type { Metadata } from 'next';
import LegalDoc from '@/components/LegalDoc';
import { REFUND_TITLE, REFUND_SUMMARY, REFUND_SECTIONS } from '@/components/legal/refundContent';

export const metadata: Metadata = {
  title: 'Refund Policy — PaddyLink',
  description: "Farmers are charged nothing. Buyer token refunds, failed unlocks and unused packs.",
};

export default function RefundPolicyPage() {
  return (
    <LegalDoc title={REFUND_TITLE} summary={REFUND_SUMMARY} sections={REFUND_SECTIONS} />
  );
}
