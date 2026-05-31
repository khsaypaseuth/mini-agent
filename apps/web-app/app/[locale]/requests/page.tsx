'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { useLocale, useT, localizedName } from '@/lib/i18n';
import type { CustomerRequest } from '@/lib/types';

export default function MyRequestsPage() {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) router.replace(`/${locale}/login`);
  }, [locale, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['c-requests'],
    queryFn: async () => (await api.get<CustomerRequest[]>('/requests')).data,
  });

  return (
    <main className="px-4 py-6">
      <h1 className="mb-5 text-xl font-bold text-gray-900">{t('nav.requests')}</h1>

      {isLoading && <p className="text-gray-500">{t('common.loading')}</p>}

      {data && data.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <p className="text-gray-500">{t('customer.my_requests_empty')}</p>
          <Link
            href={`/${locale}`}
            className="mt-4 inline-block rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white"
          >
            {t('customer.browse_services')}
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {data?.map((r) => (
          <Link
            key={r.id}
            href={`/${locale}/requests/${r.id}`}
            className="block rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-semibold">{r.requestNumber}</span>
              <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                {t(`request_status.${r.status}`)}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600">{localizedName(r.service?.name, locale)}</p>
            {r.totalAmount && (
              <p className="mt-1 text-sm font-semibold text-accent-600">
                {Number(r.totalAmount).toLocaleString()} {r.currency}
              </p>
            )}
          </Link>
        ))}
      </div>
    </main>
  );
}
