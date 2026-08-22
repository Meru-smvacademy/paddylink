import type { Section } from '../LegalDoc';

/**
 * /terms — CEO-approved v1 text, reproduced character for character.
 * Nothing below is reworded, summarised or added to. Clauses written inline
 * in the source ("2.1 … 2.2 …") are split into separate entries for
 * typesetting only; no character is changed.
 */

export const TERMS_TITLE = 'Terms & Conditions';

export const TERMS_SUMMARY = [
  'PaddyLink ಮಾಹಿತಿ ಮತ್ತು ಸಂಪರ್ಕ ಸೇವೆ ಮಾತ್ರ — ವ್ಯವಹಾರ ನೇರವಾಗಿ ರೈತ ಮತ್ತು ಖರೀದಿದಾರರ ನಡುವೆ.',
  'ನಾವು ಹಣ ಮುಟ್ಟುವುದಿಲ್ಲ, ಕಮಿಷನ್ ಇಲ್ಲ, ಬೆಲೆ ನಿಗದಿ ಮಾಡುವುದಿಲ್ಲ.',
  'ರೈತರಿಗೆ ಸದಾ ಉಚಿತ. ಖರೀದಿದಾರರಿಗೆ ಪರಿಶೀಲನೆ ಕಡ್ಡಾಯ.',
  'ಪರಿಶೀಲಿತ ಖರೀದಿದಾರ ಸಂಪರ್ಕ ತೆರೆದಾಗ ಮಾತ್ರ ರೈತನ ಹೆಸರು-ನಂಬರ್ ಅವರಿಗೆ ಸಿಗುತ್ತದೆ; ರೈತನಿಗೆ ಖರೀದಿದಾರನ ಹೆಸರು ತಿಳಿಸಲಾಗುತ್ತದೆ.',
  'ಸುರಕ್ಷಿತ ನಿಯಮ ನೆನಪಿಡಿ: ಪಾವತಿ ಮೊದಲು, ನಂತರ ಭತ್ತ.',
];

export const TERMS_SECTIONS: Section[] = [
  {
    n: '1',
    title: 'Who we are',
    clauses: [
      {
        text: 'PaddyLink ("the Platform", "we", "us") is operated by Kalbantt Tech (OPC) Private Limited, CIN U85500KA2026OPC224772, registered office: Unit 101, Oxford Towers, 139/88 Old Airport Road, Kodihalli, Bangalore, Karnataka 560008. Contact: founder@kalbantt.in, +91 91085 40960.',
      },
    ],
  },
  {
    n: '2',
    title: 'What PaddyLink is — and is not',
    clauses: [
      {
        n: '2.1',
        text: "PaddyLink is an information and connection service only. It enables paddy farmers to publish information about their crop and enables verified buyers to discover such listings and obtain the farmer's contact details.",
      },
      {
        n: '2.2',
        text: 'PaddyLink is not a marketplace, commission agent, broker, or trader. We are not a party to any sale or purchase. All negotiations, agreements, payments, and deliveries occur directly between farmer and buyer, outside the Platform.',
      },
      {
        n: '2.3',
        text: 'We do not set, suggest, or influence prices; we do not handle money for any trade; we charge no commission on any transaction.',
      },
    ],
  },
  {
    n: '3',
    title: 'Farmer accounts and listings',
    clauses: [
      { n: '3.1', text: 'Listing is free for farmers, always.' },
      {
        n: '3.2',
        text: 'Farmers authenticate by mobile-number OTP. The farmer is responsible for the accuracy of the details submitted (name, location, variety, quantity, harvest month, photo).',
      },
      {
        n: '3.3',
        text: 'By ticking the consent box, the farmer agrees that listing details are displayed on the Platform, and that their name and mobile number are revealed only to a verified buyer who unlocks the contact.',
      },
      {
        n: '3.4',
        text: "When a buyer unlocks a farmer's contact, PaddyLink notifies the farmer with the buyer's name and taluk, indicating that the buyer may contact them.",
      },
    ],
  },
  {
    n: '4',
    title: 'Buyer accounts, verification, and tokens',
    clauses: [
      {
        n: '4.1',
        text: 'Buyers must complete registration with accurate business details, including GST and PAN, and upload the required certificate. Access to listings is granted only after verification by PaddyLink ("Verified Buyer").',
      },
      {
        n: '4.2',
        text: 'Buyers purchase tokens, a platform access fee used solely to unlock farmer contact details. Tokens are not payment for paddy and confer no right, title, or interest in any crop.',
      },
      {
        n: '4.3',
        text: 'Token balances are non-transferable between accounts. Refunds are governed by the Refund Policy.',
      },
      { n: '4.4', text: 'Buyers agree to the Fair Dealing Code (Section 5) at registration.' },
    ],
  },
  {
    n: '5',
    title: 'Fair Dealing Code',
    clauses: [
      {
        n: '5.1',
        text: 'PaddyLink teaches and recommends one safe transaction sequence: payment first, then paddy (ಪಾವತಿ ಮೊದಲು, ನಂತರ ಭತ್ತ) — the farmer releases goods only after receiving payment.',
      },
      {
        n: '5.2',
        text: 'This is recommended practice, not a guarantee. PaddyLink does not hold funds, does not escrow, and cannot enforce the conduct of any party.',
      },
      {
        n: '5.3',
        text: 'Verified Buyers agree to deal fairly, honour agreed terms, and not misuse farmer contact details (no spam, resale of data, or harassment). Breach may result in suspension without refund of used tokens.',
      },
    ],
  },
  {
    n: '6',
    title: 'Quality checks',
    clauses: [
      {
        n: '6.1',
        text: 'Where PaddyLink staff perform a quality check (e.g., moisture measurement), the result reflects the reading at the time and place of measurement only.',
      },
      {
        n: '6.2',
        text: 'A quality badge is informational and is not a warranty, certification, or guarantee of the goods, their condition at delivery, or their fitness for any purpose. Buyers should inspect goods in person before completing any transaction.',
      },
    ],
  },
  {
    n: '7',
    title: 'Acceptable use',
    clauses: [
      {
        text: 'Users must not post false or misleading information, impersonate others, list crops they do not control, scrape or harvest data, or use the Platform for any unlawful purpose. We may suspend or terminate accounts that breach these Terms.',
      },
    ],
  },
  {
    n: '8',
    title: 'Liability',
    clauses: [
      {
        n: '8.1',
        text: 'The Platform is provided "as is". To the maximum extent permitted by law, PaddyLink and Kalbantt Tech (OPC) Private Limited are not liable for the conduct of farmers or buyers, the outcome of any transaction, the quality or existence of any crop, payment failures between parties, or indirect or consequential losses.',
      },
      {
        n: '8.2',
        text: 'Our total aggregate liability to a buyer shall not exceed the amount paid by that buyer for unused tokens in the preceding three months. Farmers are not charged; our liability to farmers is limited to correcting or removing listing data.',
      },
    ],
  },
  {
    n: '9',
    title: 'Suspension and termination',
    clauses: [
      {
        text: 'We may suspend or remove any account or listing that breaches these Terms, provides false information, or endangers other users. Where practical, we will state the reason.',
      },
    ],
  },
  {
    n: '10',
    title: 'Changes',
    clauses: [
      {
        text:
          'We may update these Terms; the "Last updated" date will change and continued use ' +
          "constitutes acceptance. Material changes affecting buyers' paid features will be notified.",
      },
    ],
  },
  {
    n: '11',
    title: 'Governing law and grievance',
    clauses: [
      {
        n: '11.1',
        text: 'These Terms are governed by the laws of India; courts at Bengaluru, Karnataka have jurisdiction.',
      },
      {
        n: '11.2',
        text: 'Grievance Officer: Mounesh Tegginamani, founder@kalbantt.in, +91 91085 40960. Acknowledgement within 48 hours; resolution target 15 days.',
      },
    ],
  },
];
