'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

export type Lang = 'kn' | 'en';

export const DEFAULT_LANG: Lang = 'kn';
const STORAGE_KEY = 'paddylink.lang';

function isLang(value: unknown): value is Lang {
  return value === 'kn' || value === 'en';
}

/* ------------------------------------------------------------------ *
 * localStorage treated as an external store, so the server render and
 * the first client render both use DEFAULT_LANG (no hydration
 * mismatch) and React re-reads the real value immediately after.
 * ------------------------------------------------------------------ */

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep other tabs of the same site in sync.
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

// Returns a primitive, so repeated calls are referentially stable.
function getSnapshot(): Lang {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isLang(stored) ? stored : DEFAULT_LANG;
  } catch {
    // localStorage unavailable (private mode, blocked cookies).
    return DEFAULT_LANG;
  }
}

function getServerSnapshot(): Lang {
  return DEFAULT_LANG;
}

function write(next: Lang) {
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Persistence is best-effort.
  }
  emit();
}

/* ------------------------------------------------------------------ */

type LanguageContextValue = {
  lang: Lang;
  setLang: (next: Lang) => void;
  toggleLang: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLang = useCallback((next: Lang) => write(next), []);

  const toggleLang = useCallback(
    () => write(lang === 'kn' ? 'en' : 'kn'),
    [lang],
  );

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(
    () => ({ lang, setLang, toggleLang }),
    [lang, setLang, toggleLang],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used inside <LanguageProvider>');
  }
  return ctx;
}
