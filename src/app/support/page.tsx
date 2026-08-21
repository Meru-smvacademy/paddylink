import type { Metadata } from 'next';
import Support from '@/components/Support';

export const metadata: Metadata = {
  title: 'ಸಹಾಯ ಬೇಕೇ? ನಾವಿದ್ದೇವೆ — PaddyLink',
  description:
    'Call or WhatsApp +91 91085 40960, Mon–Sat 10am–6pm. Common questions, and the PaddyLink grievance officer with complaint timelines.',
};

export default function SupportPage() {
  return <Support />;
}
