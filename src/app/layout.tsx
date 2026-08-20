import type { Metadata } from 'next';
import { Noto_Serif, Noto_Serif_Kannada, Noto_Sans_Kannada } from 'next/font/google';
import { LanguageProvider, DEFAULT_LANG } from '@/lib/language';
import './globals.css';

const notoSerif = Noto_Serif({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-serif',
});

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang={DEFAULT_LANG}
      className={`${notoSerif.variable} ${notoSerifKannada.variable} ${notoSansKannada.variable}`}
    >
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
