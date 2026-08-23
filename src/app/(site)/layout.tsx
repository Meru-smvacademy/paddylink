import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { LanguageProvider } from '@/lib/language';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

/* Public-site chrome. Every public route lives in this (site) group and gets
   the bilingual Header/Footer and the language context; /admin sits outside
   it on purpose and renders its own chrome. */

/* Resolved at build time on the server. If the brand mark is missing from
   public/brand/, the header renders no <img> rather than a broken image. */
const hasMark = existsSync(
  join(process.cwd(), 'public', 'brand', 'paddy-sheaf.png'),
);

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <LanguageProvider>
      <Header hasMark={hasMark} />
      {children}
      <Footer />
    </LanguageProvider>
  );
}
