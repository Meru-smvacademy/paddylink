'use client';

import { useLanguage } from '@/lib/language';

type TProps = {
  kn: string;
  en: string;
};

/**
 * Renders the string for the active language.
 *
 *   <T kn="ಭತ್ತ" en="Paddy" />
 */
export default function T({ kn, en }: TProps) {
  const { lang } = useLanguage();
  return <>{lang === 'kn' ? kn : en}</>;
}
