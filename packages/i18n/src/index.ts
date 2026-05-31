import en from '../locales/en.json';
import lo from '../locales/lo.json';
import th from '../locales/th.json';
import hmn from '../locales/hmn.json';
import zh from '../locales/zh.json';
import vi from '../locales/vi.json';
import ko from '../locales/ko.json';

export const locales = ['lo', 'hmn', 'en', 'zh', 'vi', 'th', 'ko'] as const;
export type Locale = (typeof locales)[number];

export const adminLocales = ['lo', 'th', 'en'] as const;
export type AdminLocale = (typeof adminLocales)[number];

export const defaultLocale: Locale = 'lo';
export const fallbackLocale: Locale = 'en';

/** All translation dictionaries, keyed by locale. */
export const messages = { en, lo, th, hmn, zh, vi, ko } as const;

/** Admin-app dictionaries (Lao / Thai / English only). */
export const adminMessages = { en, lo, th } as const;
