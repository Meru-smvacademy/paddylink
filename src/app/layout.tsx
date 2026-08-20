import type { Metadata } from 'next';
import {
  Fraunces,
  Poppins,
  Plus_Jakarta_Sans,
  Noto_Serif_Kannada,
  Noto_Sans_Kannada,
} from 'next/font/google';
import { LanguageProvider, DEFAULT_LANG } from '@/lib/language';
import Header from '@/components/Header';
import './globals.css';

/* Latin faces from the Figma design. */
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
  variable: '--font-fraunces',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-poppins',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-jakarta',
});

/* Kannada companions — the Latin faces above have no Kannada glyphs. */
const notoSerifKannada = Noto_Serif_Kannada({
  subsets: ['kannada'],
  display: 'swap',
  variable: '--font-noto-serif-kannada',
});

const notoSansKannada = Noto_Sans_Kannada({
  subsets: ['kannada'],
  display: 'swap',
  variable: '--font-noto-sans-kannada',
});

export const metadata: Metadata = {
  title: 'PaddyLink',
  description: 'Connecting paddy farmers in Karnataka with verified buyers.',
};

const fontVars = [
  fraunces.variable,
  poppins.variable,
  jakarta.variable,
  notoSerifKannada.variable,
  notoSansKannada.variable,
].join(' ');

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={DEFAULT_LANG} className={fontVars}>
      <body>
        <LanguageProvider>
          <Header />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
