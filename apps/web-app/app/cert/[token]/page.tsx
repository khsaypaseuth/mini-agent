import type { Locale } from '@mini-agent/i18n';
import { localizedName, tr } from '@/lib/tracking';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

interface CertData {
  requestNumber: string;
  service: Record<string, string>;
  mime: string;
  downloadUrl: string;
  brand: string;
}

async function fetchCert(token: string): Promise<CertData | null> {
  try {
    const res = await fetch(`${API_URL}/certificates/download/${token}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as CertData;
  } catch {
    return null;
  }
}

export default async function CertPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { token } = await params;
  const { lang } = await searchParams;
  const locale = (lang as Locale) ?? 'lo';
  const cert = await fetchCert(token);

  if (!cert) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <p className="text-gray-500">{tr(locale, 'common.error')}</p>
      </main>
    );
  }

  const referUrl = process.env.NEXT_PUBLIC_APP_BASE ?? 'http://localhost:3002';

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-primary-500 to-primary-700 px-5 py-10">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500">
          <span className="text-2xl font-bold text-white">M</span>
        </div>
        <h1 className="text-xl font-bold text-primary-700">{cert.brand}</h1>
        <p className="mt-1 text-sm text-gray-500">{localizedName(cert.service, locale)}</p>
        <p className="mt-1 font-mono text-xs text-gray-400">{cert.requestNumber}</p>

        <a
          href={cert.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 block rounded-xl bg-primary-500 py-3 font-semibold text-white hover:bg-primary-600"
        >
          {tr(locale, 'tracking.download_certificate')}
        </a>

        <div className="mt-4 flex gap-3">
          <a
            href={
              process.env.NEXT_PUBLIC_WA_NUMBER
                ? `https://wa.me/${process.env.NEXT_PUBLIC_WA_NUMBER}`
                : '#'
            }
            className="flex-1 rounded-xl border border-primary-500 py-2.5 text-sm font-medium text-primary-600"
          >
            {tr(locale, 'common.contact_us')}
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(referUrl)}`}
            className="flex-1 rounded-xl border border-accent-500 py-2.5 text-sm font-medium text-accent-600"
          >
            {tr(locale, 'common.refer_friend')}
          </a>
        </div>
      </div>
    </main>
  );
}
