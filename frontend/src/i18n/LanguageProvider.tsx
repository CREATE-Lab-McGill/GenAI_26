import { useEffect, useState, type ReactNode } from 'react';
import {
  intlLocale,
  LANGUAGE_KEY,
  LanguageContext,
  readLanguage,
  translate,
  translateLabel,
  type LanguageContextValue,
} from './language';

export default function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState(readLanguage);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      localStorage.setItem(LANGUAGE_KEY, locale);
    } catch {
      /* The preference still works in memory when storage is blocked. */
    }
  }, [locale]);

  const value: LanguageContextValue = {
    locale,
    toggleLanguage: () => setLocale((current) => (current === 'en' ? 'fr' : 'en')),
    t: (key, values) => translate(locale, key, values),
    label: (value) => translateLabel(locale, value),
    questionCount: (count) => {
      const plural = new Intl.PluralRules(intlLocale(locale)).select(count);
      return translate(locale, plural === 'one' ? '{count} question' : '{count} questions', {
        count: new Intl.NumberFormat(intlLocale(locale)).format(count),
      });
    },
    formatDate: (iso) => new Intl.DateTimeFormat(intlLocale(locale)).format(new Date(iso)),
    timeAgo: (iso) => {
      const hours = Math.round((Date.now() - new Date(iso).getTime()) / 3600000);
      if (hours < 1) return translate(locale, 'just now');
      return new Intl.RelativeTimeFormat(intlLocale(locale), {
        numeric: 'always',
      }).format(hours < 24 ? -hours : -Math.round(hours / 24), hours < 24 ? 'hour' : 'day');
    },
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
