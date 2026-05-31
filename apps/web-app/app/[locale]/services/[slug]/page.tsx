import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Locale } from '@mini-agent/i18n';
import { resolveKey, localizedName } from '@/lib/i18n-core';
import type { Service } from '@/lib/types';
import { RequestStarter } from './RequestStarter';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
const VEHICLE_SLUGS = [
  'vehicle-border-pass',
  'diplomat-vehicle-border-pass',
  'thai-vehicle-insurance',
];

async function fetchService(slug: string): Promise<Service | null> {
  try {
    const res = await fetch(`${API_URL}/services/slug/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as Service;
  } catch {
    return null;
  }
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeParam, slug } = await params;
  const locale = localeParam as Locale;
  const t = (k: string) => resolveKey(locale, k);
  const service = await fetchService(slug);
  if (!service) notFound();

  return (
    <main className="px-4 py-6">
      <Link href={`/${locale}`} className="text-sm text-primary-600">
        ← {t('nav.home')}
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 text-2xl text-white">
          {service.icon ?? '📄'}
        </span>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{localizedName(service.name, locale)}</h1>
          <p className="text-sm text-gray-500">{localizedName(service.description, locale)}</p>
        </div>
      </div>

      {/* Required documents */}
      {service.inputRequirements.length > 0 && (
        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            {t('services.upload_documents')}
          </h3>
          <ul className="space-y-1.5">
            {service.inputRequirements.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-primary-400">•</span>
                {localizedName(r.label, locale)}
                {r.required && <span className="text-red-400">*</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Vehicle-not-in-your-name helper */}
      {VEHICLE_SLUGS.includes(service.slug) && (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          {t('customer.vehicle_not_yours')}
        </p>
      )}

      <RequestStarter service={service} />
    </main>
  );
}
