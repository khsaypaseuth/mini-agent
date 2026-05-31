'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RequestStatus } from '@mini-agent/types';
import { api } from '@/lib/api';
import { t, getLocale } from '@/lib/i18n';
import { localized, type RequestDetail } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';

// Allowed next statuses, mirrors the API state machine (staff-driven subset).
const NEXT_STATUSES: Record<string, RequestStatus[]> = {
  [RequestStatus.PAID]: [RequestStatus.IN_PROGRESS, RequestStatus.ON_HOLD],
  [RequestStatus.IN_PROGRESS]: [RequestStatus.NEEDS_MORE_INFO, RequestStatus.ON_HOLD],
  [RequestStatus.READY_FOR_DELIVERY]: [RequestStatus.PICKED_UP],
  [RequestStatus.PICKED_UP]: [RequestStatus.IN_TRANSIT],
  [RequestStatus.IN_TRANSIT]: [RequestStatus.DELIVERED],
  [RequestStatus.DELIVERED]: [RequestStatus.COMPLETED],
  [RequestStatus.ON_HOLD]: [RequestStatus.IN_PROGRESS],
  [RequestStatus.NEEDS_MORE_INFO]: [RequestStatus.IN_PROGRESS],
};

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const locale = getLocale();
  const [nextStatus, setNextStatus] = useState('');

  const { data: req, isLoading } = useQuery({
    queryKey: ['request', id],
    queryFn: async () => (await api.get<RequestDetail>(`/requests/${id}`)).data,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['request', id] });
    qc.invalidateQueries({ queryKey: ['requests'] });
  };

  const uploadCert = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      form.append('kind', 'certificate');
      const uploaded = (await api.post('/files', form)).data;
      return (await api.post('/certificates', { requestId: id, fileId: uploaded.id })).data;
    },
    onSuccess: invalidate,
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) =>
      (await api.patch(`/requests/${id}/status`, { status })).data,
    onSuccess: () => {
      setNextStatus('');
      invalidate();
    },
  });

  const generateLabel = useMutation({
    mutationFn: async () => (await api.post('/labels', { requestId: id })).data,
    onSuccess: () => {
      invalidate();
      router.push(`/dashboard/label/${id}`);
    },
  });

  if (isLoading || !req) return <p className="text-gray-500">{t('common.loading')}</p>;

  const allowedNext = NEXT_STATUSES[req.status] ?? [];
  const canUploadCert = req.status === RequestStatus.IN_PROGRESS;
  const canGenerateLabel =
    req.status === RequestStatus.CERTIFICATE_UPLOADED ||
    req.status === RequestStatus.READY_FOR_DELIVERY;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard"
        className="mb-4 inline-block text-sm text-primary-600 hover:text-primary-700"
      >
        ← {t('admin.queue')}
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold">{req.requestNumber}</h1>
          <p className="text-sm text-gray-500">{localized(req.service?.name, locale)}</p>
        </div>
        <StatusBadge status={req.status} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Details */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold">{t('admin.details')}</h2>
          <dl className="space-y-2 text-sm">
            <Row label={t('admin.customer')} value={req.customer?.name} />
            <Row label={t('auth.phone')} value={req.customer?.phone ?? t('admin.no_value')} />
            <Row label={t('admin.delivery')} value={req.deliveryType} />
            <Row
              label={t('services.delivery_fee')}
              value={
                req.deliveryFee
                  ? `${Number(req.deliveryFee).toLocaleString()} ${req.currency}`
                  : t('admin.no_value')
              }
            />
            <Row
              label={t('admin.total')}
              value={
                req.totalAmount
                  ? `${Number(req.totalAmount).toLocaleString()} ${req.currency}`
                  : t('admin.no_value')
              }
            />
          </dl>
        </section>

        {/* Inputs */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold">{t('admin.inputs')}</h2>
          {req.inputs.length === 0 ? (
            <p className="text-sm text-gray-400">{t('admin.no_value')}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {req.inputs.map((inp) => (
                <li key={inp.id} className="flex justify-between">
                  <span className="text-gray-500">{inp.requirementKey}</span>
                  <span className="font-medium">
                    {inp.textValue ?? (inp.fileId ? '📎 file' : t('admin.no_value'))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Actions */}
      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">{t('admin.actions')}</h2>
        <div className="flex flex-wrap items-center gap-3">
          {canUploadCert && (
            <label className="cursor-pointer rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
              {uploadCert.isPending ? t('admin.uploading') : t('admin.upload_certificate')}
              <input
                type="file"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadCert.mutate(e.target.files[0])}
              />
            </label>
          )}

          {canGenerateLabel && (
            <button
              onClick={() => generateLabel.mutate()}
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
            >
              {t('admin.generate_label')}
            </button>
          )}

          {allowedNext.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">{t('admin.change_status_to')}…</option>
                {allowedNext.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <button
                disabled={!nextStatus || updateStatus.isPending}
                onClick={() => updateStatus.mutate(nextStatus)}
                className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
              >
                {t('admin.apply')}
              </button>
            </div>
          )}
        </div>
        {(uploadCert.isError || updateStatus.isError || generateLabel.isError) && (
          <p className="mt-3 text-sm text-red-600">{t('common.error')}</p>
        )}
      </section>

      {/* Timeline */}
      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">{t('admin.timeline')}</h2>
        <ol className="space-y-3">
          {req.statusHistory.map((h) => (
            <li key={h.id} className="flex items-center gap-3 text-sm">
              <span className="h-2 w-2 rounded-full bg-primary-500" />
              <StatusBadge status={h.toStatus} />
              <span className="text-gray-400">{new Date(h.createdAt).toLocaleString()}</span>
              {h.note && <span className="text-gray-500">— {h.note}</span>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium">{value || '—'}</dd>
    </div>
  );
}
