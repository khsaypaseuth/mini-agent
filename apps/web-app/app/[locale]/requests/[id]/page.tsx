'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RequestStatus } from '@mini-agent/types';
import { api } from '@/lib/api';
import { useLocale, useT, localizedName } from '@/lib/i18n';
import type { CustomerRequest, Service } from '@/lib/types';

export default function RequestFlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const locale = useLocale();
  const t = useT();
  const qc = useQueryClient();
  const [invoice, setInvoice] = useState<{
    billNumber: string;
    amount: number;
    currency: string;
  } | null>(null);

  const { data: req } = useQuery({
    queryKey: ['c-request', id],
    queryFn: async () => (await api.get<CustomerRequest>(`/requests/${id}`)).data,
  });

  const { data: service } = useQuery({
    enabled: Boolean(req?.service?.slug),
    queryKey: ['c-service', req?.service?.slug],
    queryFn: async () => (await api.get<Service>(`/services/slug/${req!.service.slug}`)).data,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['c-request', id] });

  const uploadInput = useMutation({
    mutationFn: async ({ key, file }: { key: string; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      form.append('kind', 'scan');
      const uploaded = (await api.post('/files', form)).data;
      return api.post(`/requests/${id}/inputs/file`, { requirementKey: key, fileId: uploaded.id });
    },
    onSuccess: invalidate,
  });

  const submit = useMutation({
    mutationFn: () => api.post(`/requests/${id}/submit`),
    onSuccess: invalidate,
  });

  const pay = useMutation({
    mutationFn: async () => (await api.post('/payments/create-invoice', { requestId: id })).data,
    onSuccess: (data) => {
      setInvoice({ billNumber: data.billNumber, amount: data.amount, currency: data.currency });
      invalidate();
    },
  });

  if (!req) return <p className="px-4 py-10 text-gray-500">{t('common.loading')}</p>;

  const uploadedKeys = new Set(req.inputs.filter((i) => i.fileId).map((i) => i.requirementKey));
  const required = service?.inputRequirements ?? [];
  const allUploaded = required.every((r) => !r.required || uploadedKeys.has(r.key));
  const isDraft = req.status === RequestStatus.DRAFT;
  const canPay =
    req.status === RequestStatus.SUBMITTED || req.status === RequestStatus.AWAITING_PAYMENT;

  return (
    <main className="px-4 py-6">
      <Link href={`/${locale}/requests`} className="text-sm text-primary-600">
        ← {t('nav.requests')}
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="font-mono text-lg font-bold">{req.requestNumber}</h1>
        <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-700">
          {t(`request_status.${req.status}`)}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-500">{localizedName(req.service?.name, locale)}</p>

      {req.totalAmount && (
        <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm">
          {req.deliveryFee && Number(req.deliveryFee) > 0 && (
            <Row
              label={t('services.delivery_fee')}
              value={`${Number(req.deliveryFee).toLocaleString()} ${req.currency}`}
            />
          )}
          <Row
            label={t('services.total')}
            value={`${Number(req.totalAmount).toLocaleString()} ${req.currency}`}
            bold
          />
        </div>
      )}

      {/* Upload required docs (DRAFT only) */}
      {isDraft && required.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            {t('customer.upload_required')}
          </h3>
          <div className="space-y-2">
            {required.map((r) => {
              const done = uploadedKeys.has(r.key);
              return (
                <label
                  key={r.id}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-sm ${
                    done ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <span className="text-gray-700">
                    {localizedName(r.label, locale)}
                    {r.required && <span className="text-red-400"> *</span>}
                  </span>
                  <span className={done ? 'text-green-600' : 'text-primary-600'}>
                    {done ? `✓ ${t('customer.uploaded')}` : '＋'}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] &&
                      uploadInput.mutate({ key: r.key, file: e.target.files[0] })
                    }
                  />
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 space-y-3">
        {isDraft && (
          <button
            onClick={() => submit.mutate()}
            disabled={!allUploaded || submit.isPending}
            className="w-full rounded-xl bg-primary-500 py-3.5 font-semibold text-white disabled:opacity-50"
          >
            {t('customer.submit_request')}
          </button>
        )}

        {canPay && !invoice && (
          <button
            onClick={() => pay.mutate()}
            disabled={pay.isPending}
            className="w-full rounded-xl bg-accent-500 py-3.5 font-semibold text-white disabled:opacity-60"
          >
            {t('customer.pay_now')}
          </button>
        )}

        {invoice && (
          <div className="rounded-2xl border border-accent-200 bg-accent-50 p-4 text-center">
            <p className="text-sm text-amber-800">{t('customer.payment_pending')}</p>
            <p className="mt-2 text-xs text-gray-500">
              {t('customer.bill_number')}: <span className="font-mono">{invoice.billNumber}</span>
            </p>
            <p className="mt-1 text-lg font-bold text-primary-700">
              {invoice.amount.toLocaleString()} {invoice.currency}
            </p>
          </div>
        )}

        <Link
          href={`/track/${req.publicToken}?lang=${locale}`}
          className="block rounded-xl border border-gray-200 py-3 text-center text-sm font-medium text-gray-600"
        >
          {t('nav.track')}
        </Link>
      </div>
    </main>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-gray-500">{label}</span>
      <span className={bold ? 'font-bold text-gray-900' : 'text-gray-700'}>{value}</span>
    </div>
  );
}
