import { notFound } from 'next/navigation';
import { locales, type Locale } from '@mini-agent/i18n';
import { resolveKey } from '@/lib/i18n-core';
import { I18nProvider } from '@/lib/i18n';
import { Header } from '@/components/Header';
import { FloatingWhatsApp } from '@/components/FloatingWhatsApp';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  const l = locale as Locale;

  return (
    <I18nProvider locale={l}>
      <Header />
      <div className="mx-auto max-w-2xl">{children}</div>
      <footer className="mt-12 border-t border-gray-100 px-4 py-8 text-center text-xs text-gray-400">
        <p className="font-semibold text-primary-600">MiniAgent</p>
        <p className="mt-1">{resolveKey(l, 'home.hero_subtitle')}</p>
      </footer>
      <FloatingWhatsApp />
    </I18nProvider>
  );
}
