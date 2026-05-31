import Link from 'next/link';
import type { Locale } from '@mini-agent/i18n';
import { resolveKey, localizedName } from '@/lib/i18n-core';
import type { Service } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

async function fetchServices(): Promise<Service[]> {
  try {
    const res = await fetch(`${API_URL}/services`, { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as Service[];
  } catch {
    return [];
  }
}

const CITY_KEYS = ['city_nongkhai', 'city_udon', 'city_sakon', 'city_khonkaen'] as const;
const TIP_KEYS = ['tips_passport', 'tips_border_pass', 'tips_license', 'tips_insurance'] as const;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const t = (k: string) => resolveKey(locale, k);
  const services = await fetchServices();

  return (
    <main className="px-4 pb-8">
      {/* Hero / banner */}
      <section className="mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-500 p-7 text-white">
        <h1 className="text-2xl font-bold leading-tight">{t('home.hero_title')}</h1>
        <p className="mt-2 text-sm text-white/85">{t('home.hero_subtitle')}</p>
        <a
          href="#services"
          className="mt-5 inline-block rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white shadow"
        >
          {t('home.hero_cta')}
        </a>
      </section>

      {/* Service cards — two-column grid, single-color solid icons */}
      <section id="services" className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-gray-900">{t('home.services_title')}</h2>
        <div className="grid grid-cols-2 gap-3">
          {services.map((s) => (
            <Link
              key={s.id}
              href={`/${locale}/services/${s.slug}`}
              className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-primary-200 hover:shadow-md"
            >
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-500 text-xl text-white">
                {s.icon ?? '📄'}
              </span>
              <span className="text-sm font-semibold leading-snug text-gray-900">
                {localizedName(s.name, locale)}
              </span>
              {s.pricingOptions[0] && (
                <span className="mt-1 text-xs text-accent-600">
                  {Number(s.pricingOptions[0].amount).toLocaleString()}{' '}
                  {s.pricingOptions[0].currency}+
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Tips */}
      <section className="mt-10 rounded-2xl bg-primary-50 p-5">
        <h2 className="text-lg font-bold text-primary-700">{t('home.tips_title')}</h2>
        <p className="mt-1 text-sm text-gray-600">{t('home.tips_intro')}</p>
        <ul className="mt-3 space-y-2">
          {TIP_KEYS.map((k) => (
            <li key={k} className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-accent-500">✓</span>
              {t(`home.${k}`)}
            </li>
          ))}
        </ul>
        <p className="mt-3 rounded-lg bg-white/70 p-3 text-xs text-gray-600">
          {t('home.tips_insurance_note')}
        </p>
        <p className="mt-2 text-xs text-gray-500">⚠ {t('home.tips_police')}</p>
      </section>

      {/* Eat & Go */}
      <section className="mt-8">
        <h2 className="text-lg font-bold text-gray-900">{t('home.eat_go_title')}</h2>
        <p className="mb-3 text-sm text-gray-600">{t('home.eat_go_intro')}</p>
        <div className="grid grid-cols-2 gap-3">
          {CITY_KEYS.map((c, i) => (
            <div
              key={c}
              className={`rounded-2xl p-5 text-white ${
                ['bg-sky-500', 'bg-amber-500', 'bg-emerald-500', 'bg-rose-500'][i]
              }`}
            >
              <p className="text-base font-semibold">{t(`home.${c}`)}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
