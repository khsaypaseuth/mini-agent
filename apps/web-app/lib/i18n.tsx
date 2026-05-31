'use client';

import { createContext, useContext } from 'react';
import { resolveKey, localizedName, locales, type Locale } from './i18n-core';

export { resolveKey, localizedName, locales };
export type { Locale };

const I18nContext = createContext<Locale>('lo');

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <I18nContext.Provider value={locale}>{children}</I18nContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(I18nContext);
}

export function useT() {
  const locale = useContext(I18nContext);
  return (key: string) => resolveKey(locale, key);
}
