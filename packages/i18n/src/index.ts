export const locales = ['lo', 'hmn', 'en', 'zh', 'vi', 'th', 'ko'] as const;
export type Locale = (typeof locales)[number];

export const adminLocales = ['lo', 'th', 'en'] as const;
export type AdminLocale = (typeof adminLocales)[number];

export const defaultLocale: Locale = 'lo';
export const fallbackLocale: Locale = 'en';
