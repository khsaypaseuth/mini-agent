'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { t, getLocale } from '@/lib/i18n';
import { localized, type RequestListItem } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';

export default function QueuePage() {
  const locale = getLocale();
  const { data, isLoading, error } = useQuery({
    queryKey: ['requests'],
    queryFn: async () => (await api.get<RequestListItem[]>('/requests')).data,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('admin.queue')}</h1>

      {isLoading && <p className="text-gray-500">{t('common.loading')}</p>}
      {error && <p className="text-red-600">{t('common.error')}</p>}

      {data && data.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
          {t('admin.no_requests')}
        </div>
      )}

      {data && data.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">{t('admin.request_no')}</th>
                <th className="px-4 py-3">{t('admin.service')}</th>
                <th className="px-4 py-3">{t('admin.customer')}</th>
                <th className="px-4 py-3">{t('admin.status')}</th>
                <th className="px-4 py-3">{t('admin.total')}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{r.requestNumber}</td>
                  <td className="px-4 py-3">{localized(r.service?.name, locale)}</td>
                  <td className="px-4 py-3">{r.customer?.name ?? t('admin.no_value')}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {r.totalAmount
                      ? `${Number(r.totalAmount).toLocaleString()} ${r.currency}`
                      : t('admin.no_value')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/requests/${r.id}`}
                      className="font-medium text-primary-600 hover:text-primary-700"
                    >
                      {t('admin.open')} →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
