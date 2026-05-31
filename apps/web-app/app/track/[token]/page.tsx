import Link from 'next/link';
import type { Locale } from '@mini-agent/i18n';
import { fetchTracking, localizedName, tr } from '@/lib/tracking';

const TERMINAL = ['COMPLETED', 'CANCELLED', 'REFUNDED'];

export default async function TrackPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { token } = await params;
  const { lang } = await searchParams;
  const locale = (lang as Locale) ?? 'lo';
  const data = await fetchTracking(token);

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <p className="text-gray-500">{tr(locale, 'common.error')}</p>
      </main>
    );
  }

  const currentDone = TERMINAL.includes(data.status);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Brand header */}
      <header className="bg-primary-500 px-5 py-4 text-white">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <span className="text-lg font-bold">MiniAgent</span>
          <span className="font-mono text-sm">{data.requestNumber}</span>
        </div>
      </header>

      <div className="mx-auto max-w-md px-5 py-6">
        <h1 className="mb-1 text-xl font-bold text-gray-900">{tr(locale, 'tracking.title')}</h1>
        <p className="mb-6 text-gray-600">{localizedName(data.service?.name, locale)}</p>

        {/* Current status */}
        <div
          className={`mb-6 rounded-2xl p-5 text-center ${
            currentDone ? 'bg-green-600 text-white' : 'bg-accent-500 text-white'
          }`}
        >
          <p className="text-xs uppercase opacity-80">{tr(locale, 'services.status')}</p>
          <p className="mt-1 text-2xl font-bold">{tr(locale, `request_status.${data.status}`)}</p>
        </div>

        {/* Certificate download */}
        {data.certificate && (
          <Link
            href={`/cert/${data.certificate.downloadToken}?lang=${locale}`}
            className="mb-6 block rounded-xl bg-primary-500 py-3 text-center font-semibold text-white hover:bg-primary-600"
          >
            {tr(locale, 'tracking.download_certificate')}
          </Link>
        )}

        {/* Timeline */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <ol className="relative space-y-4">
            {data.statusHistory.map((h, i) => {
              const isLast = i === data.statusHistory.length - 1;
              return (
                <li key={h.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`h-3 w-3 rounded-full ${isLast ? 'bg-accent-500' : 'bg-primary-500'}`}
                    />
                    {i < data.statusHistory.length - 1 && (
                      <span className="mt-1 h-full w-px flex-1 bg-gray-200" />
                    )}
                  </div>
                  <div className="pb-1">
                    <p className="text-sm font-medium text-gray-900">
                      {tr(locale, `request_status.${h.toStatus}`)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(h.createdAt).toLocaleString()}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Contact + footer */}
        <div className="mt-6 flex gap-3">
          <a
            href={
              process.env.NEXT_PUBLIC_WA_NUMBER
                ? `https://wa.me/${process.env.NEXT_PUBLIC_WA_NUMBER}`
                : '#'
            }
            className="flex-1 rounded-xl bg-green-600 py-3 text-center font-semibold text-white"
          >
            {tr(locale, 'tracking.whatsapp_us')}
          </a>
        </div>
        <p className="mt-6 text-center text-xs text-gray-400">
          MiniAgent · {tr(locale, 'common.app_name')}
        </p>
      </div>
    </main>
  );
}
