import { messages, type Locale } from '@mini-agent/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export interface TrackingData {
  requestNumber: string;
  status: string;
  service: { slug: string; name: Record<string, string>; outputType: string };
  statusHistory: { id: string; toStatus: string; createdAt: string; note: string | null }[];
  certificate: { downloadToken: string } | null;
  createdAt: string;
}

/** Fetch public tracking data by unguessable token. Returns null if not found. */
export async function fetchTracking(token: string): Promise<TrackingData | null> {
  try {
    const res = await fetch(`${API_URL}/requests/track/${token}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as TrackingData;
  } catch {
    return null;
  }
}

export function tr(locale: Locale, key: string): string {
  const dict = (messages[locale] ?? messages.en) as Record<string, unknown>;
  const lookup = (d: Record<string, unknown>): string | undefined =>
    key.split('.').reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object' && part in acc)
        return (acc as Record<string, unknown>)[part];
      return undefined;
    }, d) as string | undefined;
  return lookup(dict) ?? lookup(messages.en as Record<string, unknown>) ?? key;
}

export function localizedName(name: Record<string, string> | undefined, locale: Locale): string {
  if (!name) return '';
  return name[locale] ?? name.en ?? Object.values(name)[0] ?? '';
}
