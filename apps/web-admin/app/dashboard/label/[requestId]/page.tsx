'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { t, getLocale } from '@/lib/i18n';
import { localized, type LabelData } from '@/lib/types';

export default function LabelPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = use(params);
  const locale = getLocale();

  const { data, isLoading, error } = useQuery({
    queryKey: ['label', requestId],
    queryFn: async () => (await api.get<LabelData>(`/labels/${requestId}`)).data,
  });

  if (isLoading) return <p className="text-gray-500">{t('common.loading')}</p>;
  if (error || !data)
    return (
      <div>
        <Link href={`/dashboard/requests/${requestId}`} className="text-primary-600">
          ← {t('admin.details')}
        </Link>
        <p className="mt-4 text-gray-500">{t('admin.no_label_yet')}</p>
      </div>
    );

  return (
    <div className="mx-auto max-w-md">
      {/* Print controls — hidden when printing */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/dashboard/requests/${requestId}`} className="text-sm text-primary-600">
          ← {t('admin.details')}
        </Link>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          🖨 {t('admin.print_label')}
        </button>
      </div>

      {/* The label sticker */}
      <div className="label-sticker rounded-xl border-2 border-gray-900 bg-white p-5">
        <div className="mb-2 flex items-center justify-between border-b border-gray-300 pb-2">
          <span className="text-lg font-bold text-primary-700">MiniAgent</span>
          <span className="font-mono text-sm">{data.requestNumber}</span>
        </div>

        <div className="flex gap-4">
          <img src={data.qrDataUrl} alt="QR" className="h-32 w-32 shrink-0" />
          <div className="flex-1 space-y-1 text-sm">
            <p>
              <span className="text-gray-500">{t('admin.customer')}:</span>{' '}
              <span className="font-semibold">{data.customerName}</span>
            </p>
            {data.customerPhone && (
              <p>
                <span className="text-gray-500">{t('auth.phone')}:</span> {data.customerPhone}
              </p>
            )}
            <p>
              <span className="text-gray-500">{t('admin.service')}:</span>{' '}
              {localized(data.service, locale)}
            </p>
            <p>
              <span className="text-gray-500">{t('admin.status')}:</span>{' '}
              {data.status.replace(/_/g, ' ')}
            </p>
            <p className="text-gray-400">{new Date(data.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="mt-3 flex gap-3 border-t border-gray-300 pt-2 text-xs">
          {data.customerPhone && (
            <a
              href={`https://wa.me/${data.customerPhone.replace(/[^0-9]/g, '')}`}
              className="text-green-700 underline"
            >
              {t('tracking.whatsapp_us')}
            </a>
          )}
          {data.gpsMapUrl && (
            <a href={data.gpsMapUrl} className="text-blue-700 underline">
              {t('admin.view_on_map')}
            </a>
          )}
        </div>
        <p className="mt-2 text-center text-[10px] text-gray-400">{t('admin.scan_to_track')}</p>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .label-sticker,
          .label-sticker * {
            visibility: visible;
          }
          .label-sticker {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>
    </div>
  );
}
