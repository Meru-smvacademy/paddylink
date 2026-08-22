import type { Section } from '../LegalDoc';

/**
 * /refund-policy — CEO-approved v1 text, reproduced character for character.
 * Nothing below is reworded, summarised or added to. Clauses written inline
 * in the source ("2.1 … 2.2 …") are split into separate entries for
 * typesetting only; no character is changed.
 */

export const REFUND_TITLE = 'Refund Policy';

export const REFUND_SUMMARY = [
  'ರೈತರಿಗೆ ಯಾವ ಶುಲ್ಕವೂ ಇಲ್ಲ — ಹಾಗಾಗಿ ಮರುಪಾವತಿ ಪ್ರಶ್ನೆಯೇ ಇಲ್ಲ.',
  'ಖರೀದಿದಾರರ ಟೋಕನ್: ಬಳಸಿದ ಟೋಕನ್‌ಗೆ ಮರುಪಾವತಿ ಇಲ್ಲ; ತಾಂತ್ರಿಕ ದೋಷದಿಂದ ವಿಫಲವಾದ ಅನ್‌ಲಾಕ್‌ಗೆ ಟೋಕನ್ ವಾಪಸ್.',
  'ಬಳಸದ ಟೋಕನ್ ಮರುಪಾವತಿ ಕೋರಿಕೆ 7 ದಿನದೊಳಗೆ ಪರಿಶೀಲಿಸುತ್ತೇವೆ.',
];

export const REFUND_SECTIONS: Section[] = [
  {
    n: '1',
    title: 'Farmers',
    clauses: [
      { text: 'PaddyLink charges farmers nothing. No payment, no refund questions arise.' },
    ],
  },
  {
    n: '2',
    title: 'Buyer tokens',
    clauses: [
      {
        n: '2.1',
        text: 'Tokens are a prepaid platform access fee for unlocking farmer contacts. A successfully used token (contact revealed) is not refundable, regardless of the outcome of any subsequent negotiation or transaction — PaddyLink is not a party to trades.',
      },
      {
        n: '2.2',
        text: 'Failed unlocks: if a technical error deducts tokens without revealing the contact, the tokens are re-credited automatically or on report to support.',
      },
      {
        n: '2.3',
        text: 'Unused tokens: a buyer may request a refund of wholly unused token packs within 7 days of purchase. Approved refunds are returned to the original payment method within 5–7 working days, less any payment-gateway charges where applicable.',
      },
      {
        n: '2.4',
        text: 'Tokens carry no cash value beyond this policy, are non-transferable, and expire only if the account is terminated for breach (in which case used and unused tokens are forfeited as per the Terms).',
      },
    ],
  },
  {
    n: '3',
    title: 'How to request',
    clauses: [
      {
        text: 'Write to founder@kalbantt.in or WhatsApp +91 91085 40960 with the registered mobile number and payment reference. Grievance escalation as per the Terms (48-hour acknowledgement, 15-day resolution).',
      },
    ],
  },
];
