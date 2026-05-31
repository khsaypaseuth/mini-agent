import { adminMessages, type AdminLocale } from '@mini-agent/i18n';

const dictionaries = adminMessages;
const en = adminMessages.en;

export const ADMIN_LOCALE_KEY = 'ma_locale';

export function getLocale(): AdminLocale {
  if (typeof window === 'undefined') return 'en';
  return (localStorage.getItem(ADMIN_LOCALE_KEY) as AdminLocale) ?? 'en';
}

export function setLocale(locale: AdminLocale): void {
  localStorage.setItem(ADMIN_LOCALE_KEY, locale);
  window.location.reload();
}

/** Resolve a dotted key (e.g. "admin.queue") against the active locale, falling back to English. */
export function t(key: string): string {
  const locale = getLocale();
  const lookup = (dict: Record<string, unknown>): string | undefined =>
    key.split('.').reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object' && part in acc)
        return (acc as Record<string, unknown>)[part];
      return undefined;
    }, dict) as string | undefined;

  return lookup(dictionaries[locale]) ?? lookup(en) ?? key;
}
