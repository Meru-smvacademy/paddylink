import type { Metadata } from 'next';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import HowItWorks from '@/components/HowItWorks';

export const metadata: Metadata = {
  title: 'ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ? — PaddyLink',
  description:
    'ಬೆಳೆಯುವಾಗಲೇ ಪಟ್ಟಿ ಮಾಡಿ, ಗುಣಮಟ್ಟ ಪರಿಶೀಲನೆ, ಪರಿಶೀಲಿತ ಖರೀದಿದಾರರು, ಪಾವತಿ ಮೊದಲು — ಏಳು ಹಂತಗಳು.',
};

/* Resolved at build time on the server, mirroring the `hasMark` check in
   layout.tsx: a step photo that is not yet present renders no <img>, so the
   row keeps its gadde-950 panel instead of showing a broken image. */
function presentPhotos(): string[] {
  try {
    return readdirSync(join(process.cwd(), 'public', 'how-it-works')).filter(
      (f) => f.endsWith('.webp'),
    );
  } catch {
    return [];
  }
}

export default function HowItWorksPage() {
  return <HowItWorks presentPhotos={presentPhotos()} />;
}
