import { createContext, useContext } from 'react';
import { en, fr, type MessageKey } from './messages';

export type Locale = 'en' | 'fr';
export const LANGUAGE_KEY = 'createmath_interface_language';
export const intlLocale = (locale: Locale) => (locale === 'fr' ? 'fr-CA' : 'en-CA');
export type TranslationValues = Record<string, string | number>;

export function translate(locale: Locale, key: MessageKey, values: TranslationValues = {}): string {
  const message: string = (locale === 'fr' ? fr : en)[key];
  return message.replace(/\{(\w+)\}/g, (placeholder, name: string) => String(values[name] ?? placeholder));
}

/** Only for canonical application labels, never generated prose or user input. */
export function translateLabel(locale: Locale, value: string): string {
  return Object.hasOwn(en, value) ? translate(locale, value as MessageKey) : value;
}

export function readLanguage(): Locale {
  try {
    return localStorage.getItem(LANGUAGE_KEY) === 'fr' ? 'fr' : 'en';
  } catch {
    return 'en';
  }
}

export interface LanguageContextValue {
  locale: Locale;
  toggleLanguage: () => void;
  t: (key: MessageKey, values?: TranslationValues) => string;
  label: (value: string) => string;
  questionCount: (count: number) => string;
  formatDate: (iso: string) => string;
  timeAgo: (iso: string) => string;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);
export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
