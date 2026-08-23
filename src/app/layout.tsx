import type { Metadata } from 'next';
import {
  Fraunces,
  Poppins,
  Plus_Jakarta_Sans,
  Noto_Serif_Kannada,
  Noto_Sans_Kannada,
  Tiro_Kannada,
  Inter,
  Lora,
  Outfit,
  Nunito,
  Source_Sans_3,
} from 'next/font/google';
import { DEFAULT_LANG } from '@/lib/language';
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

/* Hero design fonts (Figma frame Vq0BfMfMUhkvcu9bKxXhDy). */
const tiroKannada = Tiro_Kannada({
  subsets: ['kannada'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-tiro-kannada',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

/* How It Works design font (Figma Make file ggE1oxd0J45ec9RUdrAWFi). */
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-outfit',
});

/* For Buyers design font (Figma Make file dwUpFDpmFHZ0oKQpQtmmtE). */
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  display: 'swap',
  variable: '--font-nunito',
});

/* Support design font (Figma Make file 2KsuDwFRfn6OesS3QKd6pN). */
const sourceSans3 = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-source-sans-3',
});

/* Footer design font (Figma frame b7llkwYtWHD4leB751w7HN). */
const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-lora',
});

export const metadata: Metadata = {
  title: 'PaddyLink — ಭತ್ತ ಬೆಳೆಗಾರರು ಮತ್ತು ಪರಿಶೀಲಿತ ಖರೀದಿದಾರರ ನೇರ ಸಂಪರ್ಕ',
  description: 'Connecting paddy farmers in Karnataka with verified buyers.',
};

const fontVars = [
  fraunces.variable,
  poppins.variable,
  jakarta.variable,
  notoSerifKannada.variable,
  notoSansKannada.variable,
  tiroKannada.variable,
  inter.variable,
  lora.variable,
  outfit.variable,
  nunito.variable,
  sourceSans3.variable,
].join(' ');

/* The root layout carries only the document shell: fonts, tokens and the
   <html>/<body> pair. The public chrome (Header/Footer/LanguageProvider)
   lives in the (site) group layout so /admin never inherits it — the admin
   portal has its own chrome and no ಕ|EN toggle. */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={DEFAULT_LANG} className={fontVars}>
      <body>{children}</body>
    </html>
  );
}
