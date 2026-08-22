import type { Section } from '../LegalDoc';

/**
 * /privacy — CEO-approved v1 text, reproduced character for character.
 * Nothing below is reworded, summarised or added to.
 */

export const PRIVACY_TITLE = 'Privacy Policy';

export const PRIVACY_SUMMARY = [
  'ನೀವು ಕೊಟ್ಟ ಮಾಹಿತಿ ಪಟ್ಟಿ ತೋರಿಸಲು ಮತ್ತು ಸಂಪರ್ಕ ಜೋಡಿಸಲು ಮಾತ್ರ ಬಳಸುತ್ತೇವೆ.',
  'ರೈತನ ನಂಬರ್ ಸಾರ್ವಜನಿಕವಲ್ಲ — ಪರಿಶೀಲಿತ ಖರೀದಿದಾರ ತೆರೆದಾಗ ಮಾತ್ರ ಸಿಗುತ್ತದೆ.',
  'ನಿಮ್ಮ ಮಾಹಿತಿ ಮಾರಾಟ ಮಾಡುವುದಿಲ್ಲ.',
  'ಅಳಿಸಬೇಕಿದ್ದರೆ ಕರೆ/WhatsApp ಮಾಡಿ: 91085 40960.',
];

export const PRIVACY_SECTIONS: Section[] = [
  {
    n: '1',
    title: 'What we collect',
    bullets: [
      'Farmers: name, mobile number, district, taluk, village, crop details (variety, quantity, harvest month), optional crop photo.',
      'Buyers: name, business name, mobile number, GST number, PAN, business address, GST certificate document.',
      'Technical: basic logs required to operate and secure the service (timestamps, device/browser information).',
    ],
  },
  {
    n: '2',
    title: 'Why we use it',
    clauses: [
      {
        text: 'To display listings, verify buyers, connect buyers with farmers on unlock, notify farmers of unlocks, provide support, prevent fraud, and meet legal obligations. We do not sell personal data. We do not use it for third-party advertising.',
      },
    ],
  },
  {
    n: '3',
    title: 'Contact reveal — the core rule',
    clauses: [
      {
        text: "A farmer's name and mobile number are not public. They are revealed only to a Verified Buyer who unlocks that listing. When that happens, the farmer is notified with the buyer's name and taluk.",
      },
    ],
  },
  {
    n: '4',
    title: 'Storage and security',
    clauses: [
      {
        text: 'Data is stored with our cloud database provider on servers located in India (Mumbai region). Access is restricted; KYC documents are held in private storage accessible only for verification purposes.',
      },
    ],
  },
  {
    n: '5',
    title: 'Sharing',
    clauses: [
      {
        text: 'We share data only: (a) between farmer and buyer as described in Section 3; (b) with service providers strictly to operate the Platform (hosting, SMS delivery); (c) where required by law.',
      },
    ],
  },
  {
    n: '6',
    title: 'Retention and deletion',
    clauses: [
      {
        text: 'We retain data while the account is active and as required by law. A user may request correction or deletion of their data via the Grievance Officer; verified requests are honoured except where retention is legally required (e.g., KYC records).',
      },
    ],
  },
  {
    n: '7',
    title: 'Your rights and grievance',
    clauses: [
      {
        text: 'For access, correction, deletion, or complaints: Grievance Officer — Mounesh Tegginamani, founder@kalbantt.in, +91 91085 40960. Acknowledgement within 48 hours; resolution target 15 days.',
      },
    ],
  },
];
