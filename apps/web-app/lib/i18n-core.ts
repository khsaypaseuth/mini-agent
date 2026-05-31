import { messages, locales, type Locale } from '@mini-agent/i18n';

export { locales };
export type { Locale };

/** Resolve a dotted key (e.g. "home.hero_title") for a locale, falling back to English. */
export function resolveKey(locale: Locale, key: string): string {
  const dict = (messages[locale] ?? messages.en) as Record<string, unknown>;
  const walk = (d: Record<string, unknown>): string | undefined =>
    key.split('.').reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object' && part in acc)
        return (acc as Record<string, unknown>)[part];
      return undefined;
    }, d) as string | undefined;
  return walk(dict) ?? walk(messages.en as Record<string, unknown>) ?? key;
}

export function localizedName(name: Record<string, string> | undefined, locale: Locale): string {
  if (!name) return '';
  return name[locale] ?? name.en ?? Object.values(name)[0] ?? '';
}
